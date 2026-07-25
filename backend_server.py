"""
Over Clouded — Azure CLI Backend Server
========================================
A lightweight HTTP server that wraps Azure CLI commands for the frontend.
Runs on port 5000 alongside Vite (port 3000).

Endpoints:
  POST /api/start-login     → Starts `az login --use-device-code`, returns the device code
  GET  /api/poll-login       → Polls whether the user has completed sign-in
  GET  /api/get-token        → Runs `az account get-access-token` and returns the token
  GET  /api/subscriptions    → Runs `az account list` and returns subscriptions
"""

import http.server
import json
import subprocess
import threading
import re
import sys
import os
import platform
import tempfile
import uuid
import shutil
import urllib.request
import urllib.error

PORT = 5000
IS_WINDOWS = platform.system() == "Windows"


class AzureAuthState:
    """One isolated Azure CLI login, including its own token cache."""
    def __init__(self):
        self.login_process = None
        self.user_code = None
        self.verification_url = None
        self.auth_completed = False
        self.auth_error = None
        self.config_dir = tempfile.mkdtemp(prefix="overclouded-azure-")

    def environment(self):
        env = os.environ.copy()
        env["AZURE_CONFIG_DIR"] = self.config_dir
        return env

    def close(self):
        if self.login_process and self.login_process.poll() is None:
            self.login_process.terminate()
        shutil.rmtree(self.config_dir, ignore_errors=True)


AUTH_SESSIONS = {}
AUTH_LOCK = threading.Lock()


class AzureAuthHandler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for Azure CLI operations."""

    def log_message(self, format, *args):
        """Override to show cleaner logs."""
        print(f"  [API] {args[0]}")

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/start-login":
            self._start_login()
        elif self.path == "/api/generate-demo":
            self._generate_demo()
        elif self.path == "/api/end-session":
            self._end_session()
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == "/api/poll-login":
            self._poll_login()
        elif self.path == "/api/get-token":
            self._get_token()
        elif self.path == "/api/subscriptions":
            self._get_subscriptions()
        elif self.path == "/api/health":
            self._send_json({"status": "ok"})
        else:
            self.send_error(404)

    # ── Endpoint Handlers ──

    def _end_session(self):
        session_id = self.headers.get("X-Auth-Session", "")
        with AUTH_LOCK:
            state = AUTH_SESSIONS.pop(session_id, None)
        if state:
            state.close()
        self._send_json({"ended": True})

    def _generate_demo(self):
        """Generate demo data without exposing the Gemini API key to the browser."""
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            self._send_json({"error": "Gemini is not configured"}, 503)
            return
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 4096)
            body = json.loads(self.rfile.read(length) or b"{}")
            subscription_id = str(body.get("subscriptionId", "demo-subscription"))[:200]
            model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            prompt = f"""Return JSON only for a realistic fictional Azure assessment dashboard for subscription {subscription_id!r}.
Required top-level objects: security, cost, governance, monitoring, recommendations, events, iam, devops, executive, iamExtended.
security needs score, activeThreats, complianceScore, criticalVulnerabilities, alerts, regulatoryCompliance, networkSecurity, encryptionStatus, keyVaultHealth.
cost needs currentMonthCost, forecastedCost, budget, costTrend, costByService, riCoverage, potentialSavings, costByResourceGroup, costByRegion, monthOverMonthChange, costAnomalies.
governance needs healthScore, policyViolations, taggingCompliance, zombieAssets, policies, resourcesByType, resourcesByRegion, orphanedResources, subscriptionQuotas, namingCompliancePercent.
monitoring needs vmCount, storageUsedTB, activeUsers, uptime, cpuUsageHistory, memoryUsageHistory, serviceHealth, resourceHealth, backupCoverage, diskIops.
Use realistic but explicitly simulated values and arrays. Do not include markdown."""
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7}
            }).encode("utf-8")
            request = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(request, timeout=60) as response:
                gemini = json.loads(response.read())
            text = gemini["candidates"][0]["content"]["parts"][0]["text"]
            self._send_json(json.loads(text))
        except urllib.error.HTTPError as error:
            self._send_json({"error": "Demo generation failed", "status": error.code}, 502)
        except Exception as error:
            self._send_json({"error": f"Demo generation failed: {error}"}, 502)

    def _start_login(self):
        """Start `az login --use-device-code` and capture the device code."""
        session_id = uuid.uuid4().hex
        state = AzureAuthState()
        with AUTH_LOCK:
            AUTH_SESSIONS[session_id] = state

        try:
            # Start az login in a subprocess
            process = subprocess.Popen(
                ["az", "login", "--use-device-code"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=IS_WINDOWS,
                bufsize=1,
                env=state.environment(),
            )
            state.login_process = process

            # The device code message comes from stderr
            # Read lines until we get the one with the code
            device_code_line = ""
            for line in iter(process.stderr.readline, ""):
                line = line.strip()
                if not line:
                    continue
                device_code_line = line
                if "devicelogin" in line.lower() or "code" in line.lower():
                    break

            if not device_code_line:
                state.auth_error = "Could not get device code from Azure CLI."
                self._send_json({"error": "Could not get device code. Is Azure CLI installed?"}, 500)
                return

            # Parse: "To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code XXXXXXXX to authenticate."
            url_match = re.search(r"(https?://\S+)", device_code_line)
            code_match = re.search(r"code\s+([A-Z0-9]+)\s", device_code_line)

            verification_url = url_match.group(1) if url_match else "https://microsoft.com/devicelogin"
            user_code = code_match.group(1) if code_match else None

            if not user_code:
                # Try alternative pattern
                code_match2 = re.search(r"([A-Z0-9]{8,})", device_code_line)
                user_code = code_match2.group(1) if code_match2 else None

            state.user_code = user_code
            state.verification_url = verification_url

            # Start background thread to wait for auth completion
            def wait_for_login():
                try:
                    stdout, stderr = process.communicate(timeout=900)  # 15 min timeout
                    if process.returncode == 0:
                        state.auth_completed = True
                    else:
                        state.auth_error = stderr.strip() if stderr else "Login failed."
                        state.auth_completed = True
                except subprocess.TimeoutExpired:
                    process.kill()
                    state.auth_error = "Login timed out after 15 minutes."
                    state.auth_completed = True

            t = threading.Thread(target=wait_for_login, daemon=True)
            t.start()

            self._send_json({
                "session_id": session_id,
                "user_code": user_code,
                "verification_uri": verification_url,
                "message": device_code_line,
            })

        except FileNotFoundError:
            self._send_json({"error": "Azure CLI (az) not found. Please install it first."}, 500)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _poll_login(self):
        """Check if the user has completed sign-in."""
        state = self._get_auth_state()
        if not state:
            return
        self._send_json({
            "completed": state.auth_completed,
            "error": state.auth_error,
        })

    def _get_token(self):
        """Run `az account get-access-token` and return the access token."""
        state = self._get_auth_state()
        if not state:
            return
        try:
            result = subprocess.run(
                ["az", "account", "get-access-token",
                 "--resource", "https://management.azure.com",
                 "-o", "json"],
                capture_output=True, text=True, shell=IS_WINDOWS, timeout=30, env=state.environment(),
            )

            if result.returncode == 0:
                token_data = json.loads(result.stdout)
                self._send_json({
                    "access_token": token_data.get("accessToken", ""),
                    "expires_on": token_data.get("expiresOn", ""),
                    "tenant": token_data.get("tenant", ""),
                })
            else:
                self._send_json({"error": result.stderr.strip() or "Failed to get token"}, 500)

        except subprocess.TimeoutExpired:
            self._send_json({"error": "Token request timed out"}, 500)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _get_subscriptions(self):
        """Run `az account list` and return the list of subscriptions."""
        state = self._get_auth_state()
        if not state:
            return
        try:
            result = subprocess.run(
                ["az", "account", "list",
                 "--query", "[?state=='Enabled'].{subscriptionId:id, displayName:name, state:state}",
                 "-o", "json"],
                capture_output=True, text=True, shell=IS_WINDOWS, timeout=30, env=state.environment(),
            )

            if result.returncode == 0:
                subs = json.loads(result.stdout)
                self._send_json(subs)
            else:
                self._send_json({"error": result.stderr.strip() or "Failed to list subscriptions"}, 500)

        except subprocess.TimeoutExpired:
            self._send_json({"error": "Subscription list request timed out"}, 500)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    # ── Helpers ──

    def _get_auth_state(self):
        session_id = self.headers.get("X-Auth-Session", "")
        with AUTH_LOCK:
            state = AUTH_SESSIONS.get(session_id)
        if not state:
            self._send_json({"error": "Authentication session is missing or expired."}, 401)
            return None
        return state

    def _send_json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Session")


def start_server():
    server = http.server.HTTPServer(("127.0.0.1", PORT), AzureAuthHandler)
    print(f"  Azure CLI backend running on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    start_server()
