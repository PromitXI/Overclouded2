"""
Overclouded — Cloud Run Combined Server
========================================
Serves the Vite-built static frontend AND proxies /api/* requests
to the Python backend on port 5000.

Used in the Docker container for Google Cloud Run deployment.
"""

import http.server
import urllib.request
import urllib.error
import os
import mimetypes

PORT = int(os.environ.get("PORT", 8080))
BACKEND_URL = "http://127.0.0.1:5000"
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class CloudRunHandler(http.server.BaseHTTPRequestHandler):
    """
    Combined handler:
    - /api/* → proxy to Python backend (port 5000)
    - /*     → serve static files from dist/
    - SPA fallback → serve index.html for client-side routing
    """

    def log_message(self, format, *args):
        """Suppress noisy request logs in production."""
        pass

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_request("GET")
        else:
            self._serve_static()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy_request("POST")
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _proxy_request(self, method):
        """Forward request to the backend server."""
        target_url = BACKEND_URL + self.path
        try:
            # Read request body for POST
            body = None
            if method == "POST":
                content_length = int(self.headers.get("Content-Length", 0))
                if content_length > 0:
                    body = self.rfile.read(content_length)

            req = urllib.request.Request(target_url, data=body, method=method)
            req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))

            with urllib.request.urlopen(req, timeout=120) as resp:
                response_data = resp.read()
                self.send_response(resp.status)
                for header, value in resp.getheaders():
                    if header.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(header, value)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(response_data)

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error": "Backend unavailable: {str(e)}"}}'.encode())

    def _serve_static(self):
        """Serve static files from the dist/ directory."""
        # Clean path
        path = self.path.split("?")[0].split("#")[0]
        if path == "/":
            path = "/index.html"

        file_path = os.path.join(DIST_DIR, path.lstrip("/"))

        # Security: prevent directory traversal
        file_path = os.path.realpath(file_path)
        if not file_path.startswith(os.path.realpath(DIST_DIR)):
            self.send_error(403, "Forbidden")
            return

        if os.path.isfile(file_path):
            self._send_file(file_path)
        else:
            # SPA fallback: serve index.html for client-side routing
            index_path = os.path.join(DIST_DIR, "index.html")
            if os.path.isfile(index_path):
                self._send_file(index_path)
            else:
                self.send_error(404, "Not Found")

    def _send_file(self, file_path):
        """Send a file with correct MIME type and caching headers."""
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))

            # Cache static assets, not index.html
            if "/assets/" in file_path:
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            else:
                self.send_header("Cache-Control", "no-cache")

            self.end_headers()
            self.wfile.write(content)
        except IOError:
            self.send_error(500, "Internal Server Error")


def start_server():
    server = http.server.HTTPServer(("0.0.0.0", PORT), CloudRunHandler)
    print(f"  ✓ Cloud Run server listening on port {PORT}")
    server.serve_forever()


if __name__ == "__main__":
    start_server()
