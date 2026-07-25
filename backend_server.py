"""
Overclouded — demo data server
==============================
A small HTTP server whose only job is generating demonstration data with the
Gemini API, so the API key stays on the server instead of being bundled into
browser JavaScript.

Authentication is deliberately NOT handled here. The browser signs in to
Microsoft Entra ID directly (authorization code + PKCE via MSAL) and calls
Azure Resource Manager itself, so no Azure token ever reaches this process.
See services/authService.ts.

Endpoints:
  POST /api/generate-demo → AI-generated demonstration dashboard data
  GET  /api/health        → liveness probe
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error

# macOS 12+ binds port 5000 to the AirPlay Receiver (Control Center), which
# answers 403 to everything. Default off 5000 and allow an override.
PORT = int(os.environ.get("OVERCLOUDED_BACKEND_PORT", "5057"))


class DemoDataHandler(http.server.BaseHTTPRequestHandler):
    """Serves demonstration data. Holds no session or credential state."""

    def log_message(self, format, *args):
        # Quieten the default per-request stderr logging.
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/generate-demo":
            self._generate_demo()
        else:
            self._send_json({"error": "Not found"}, 404)

    def do_GET(self):
        if self.path == "/api/health":
            self._send_json({"status": "ok"})
        else:
            self._send_json({"error": "Not found"}, 404)

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
    try:
        server = http.server.HTTPServer(("127.0.0.1", PORT), DemoDataHandler)
    except OSError as exc:
        print(f"  [error] Could not bind port {PORT}: {exc}")
        print(f"  Another process is using it. Free the port, or pick a different one:")
        print(f"      OVERCLOUDED_BACKEND_PORT=5058 python3 start_server.py")
        sys.exit(1)
    print(f"  Demo data server running on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    start_server()
