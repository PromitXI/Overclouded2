"""
Over Clouded — Development Server Launcher
==========================================
Starts both:
  1. Python backend (port 5000) — wraps Azure CLI for device code auth
  2. Vite frontend  (port 3000) — the React SPA

Usage:
    python start_server.py
"""

import subprocess
import sys
import os
import threading
import time

# ── Configuration ──
FRONTEND_PORT = 3000
BACKEND_PORT = 5000
URL = f"http://localhost:{FRONTEND_PORT}"

# Colors
class C:
    H = "\033[95m"; B = "\033[94m"; CN = "\033[96m"; G = "\033[92m"
    Y = "\033[93m"; R = "\033[91m"; BOLD = "\033[1m"; DIM = "\033[2m"
    RST = "\033[0m"


def print_banner():
    print(f"""
{C.BOLD}{C.CN}
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║              ☁️  Over Clouded — Dev Server                 ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
{C.RST}""")


def check_prerequisites():
    print(f"{C.DIM}  Checking prerequisites...{C.RST}")

    # Node.js
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True, shell=True)
        print(f"    {C.G}✓{C.RST} Node.js {r.stdout.strip()}")
    except FileNotFoundError:
        print(f"    {C.R}✗ Node.js not found.{C.RST}")
        sys.exit(1)

    # npm
    try:
        r = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        print(f"    {C.G}✓{C.RST} npm {r.stdout.strip()}")
    except FileNotFoundError:
        print(f"    {C.R}✗ npm not found.{C.RST}")
        sys.exit(1)

    # Azure CLI
    try:
        r = subprocess.run(["az", "--version"], capture_output=True, text=True, shell=True)
        first_line = r.stdout.strip().split("\n")[0]
        print(f"    {C.G}✓{C.RST} {first_line}")
    except FileNotFoundError:
        print(f"    {C.R}✗ Azure CLI not found. Install from https://aka.ms/installazurecli{C.RST}")
        sys.exit(1)

    # node_modules
    if not os.path.isdir("node_modules"):
        print(f"\n{C.Y}    ⚡ Installing npm dependencies...{C.RST}\n")
        subprocess.run(["npm", "install"], shell=True, check=True)
        print()


def start_backend():
    """Start the Python backend server in a thread."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("backend_server", "backend_server.py")
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    backend.start_server()


def print_ready():
    print(f"""
{C.G}{C.BOLD}  ✓ Both servers are running!{C.RST}

  {C.BOLD}App:{C.RST}         {C.CN}{URL}{C.RST}
  {C.BOLD}Backend:{C.RST}     {C.DIM}http://127.0.0.1:{BACKEND_PORT}{C.RST}

  {C.DIM}──────────────────────────────────────────────{C.RST}

  {C.BOLD}How to use:{C.RST}
    1. Open {C.CN}{URL}{C.RST} in your browser
    2. Click "Analyse Environment" → "Live Connection"
    3. Click "Generate Device Code"
    4. Click "Open Browser & Sign In" → enter the code at microsoft.com/devicelogin
    5. Select your Azure subscription → Start Analysis

  {C.DIM}Press Ctrl+C to stop both servers.{C.RST}
""")


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print_banner()
    check_prerequisites()

    # 1. Start Python backend in a background thread
    print(f"\n{C.B}  ⚡ Starting Azure CLI backend on port {BACKEND_PORT}...{C.RST}")
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()
    time.sleep(1)  # Give backend a moment to bind

    # 2. Start Vite frontend
    print(f"{C.B}  ⚡ Starting Vite frontend on port {FRONTEND_PORT}...{C.RST}\n")

    try:
        vite_process = subprocess.Popen(
            ["npm", "run", "dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=True,
            bufsize=1,
        )

        ready_printed = False

        for line in iter(vite_process.stdout.readline, ""):
            stripped = line.strip()
            if not stripped:
                continue

            if ("Local:" in stripped or f":{FRONTEND_PORT}" in stripped or "ready in" in stripped) and not ready_printed:
                ready_printed = True
                print_ready()

            if "error" in stripped.lower():
                print(f"    {C.R}{stripped}{C.RST}")
            elif not ready_printed:
                print(f"    {C.DIM}{stripped}{C.RST}")

        vite_process.wait()

    except KeyboardInterrupt:
        print(f"\n\n{C.Y}  Shutting down...{C.RST}")
        vite_process.terminate()
        try:
            vite_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            vite_process.kill()
        print(f"  {C.G}✓ Servers stopped.{C.RST}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
