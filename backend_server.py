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

PORT = 5000


class AzureAuthState:
    """Shared state for the login process."""
    login_process = None
    user_code = None
    verification_url = None
    auth_completed = False
    auth_error = None
    lock = threading.Lock()

    @classmethod
    def reset(cls):
        with cls.lock:
            if cls.login_process and cls.login_process.poll() is None:
                try:
                    cls.login_process.terminate()
                except Exception:
                    pass
            cls.login_process = None
            cls.user_code = None
            cls.verification_url = None
            cls.auth_completed = False
            cls.auth_error = None


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

    def _start_login(self):
        """Start `az login --use-device-code` and capture the device code."""
        AzureAuthState.reset()

        try:
            # Start az login in a subprocess
            process = subprocess.Popen(
                ["az", "login", "--use-device-code"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=True,
                bufsize=1,
            )
            AzureAuthState.login_process = process

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
                AzureAuthState.auth_error = "Could not get device code from Azure CLI."
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

            AzureAuthState.user_code = user_code
            AzureAuthState.verification_url = verification_url

            # Start background thread to wait for auth completion
            def wait_for_login():
                try:
                    stdout, stderr = process.communicate(timeout=900)  # 15 min timeout
                    if process.returncode == 0:
                        AzureAuthState.auth_completed = True
                    else:
                        AzureAuthState.auth_error = stderr.strip() if stderr else "Login failed."
                        AzureAuthState.auth_completed = True
                except subprocess.TimeoutExpired:
                    process.kill()
                    AzureAuthState.auth_error = "Login timed out after 15 minutes."
                    AzureAuthState.auth_completed = True

            t = threading.Thread(target=wait_for_login, daemon=True)
            t.start()

            self._send_json({
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
        self._send_json({
            "completed": AzureAuthState.auth_completed,
            "error": AzureAuthState.auth_error,
        })

    def _get_token(self):
        """Run `az account get-access-token` and return the access token."""
        try:
            result = subprocess.run(
                ["az", "account", "get-access-token",
                 "--resource", "https://management.azure.com",
                 "-o", "json"],
                capture_output=True, text=True, shell=True, timeout=30,
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
        try:
            result = subprocess.run(
                ["az", "account", "list",
                 "--query", "[?state=='Enabled'].{subscriptionId:id, displayName:name, state:state}",
                 "-o", "json"],
                capture_output=True, text=True, shell=True, timeout=30,
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

    def _send_json(self, data, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")


def start_server():
    server = http.server.HTTPServer(("127.0.0.1", PORT), AzureAuthHandler)
    print(f"  Azure CLI backend running on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    start_server()
