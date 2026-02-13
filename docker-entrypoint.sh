#!/bin/bash
set -e

# ──────────────────────────────────────────────────────────
#  Overclouded — Docker Entrypoint for Google Cloud Run
# ──────────────────────────────────────────────────────────
#  This script:
#    1. Injects GEMINI_API_KEY into the pre-built JS bundle
#    2. Starts the Python backend (Azure CLI proxy)
#    3. Serves the static frontend via Python http.server
#  Both run on the same PORT (Cloud Run gives us one port).
# ──────────────────────────────────────────────────────────

PORT="${PORT:-8080}"
BACKEND_PORT=5000

echo "╔═══════════════════════════════════════════╗"
echo "║   ☁️  Overclouded — Starting Container     ║"
echo "╚═══════════════════════════════════════════╝"

# ── 1. Inject GEMINI_API_KEY into built JS files ──
if [ -n "$GEMINI_API_KEY" ]; then
    echo "  ✓ GEMINI_API_KEY detected — injecting into frontend bundle..."
    # Replace the empty placeholder that was baked in at build time
    find /app/dist -name "*.js" -exec sed -i "s|\"__GEMINI_API_KEY_PLACEHOLDER__\"|\"${GEMINI_API_KEY}\"|g" {} + 2>/dev/null || true
    find /app/dist -name "*.js" -exec sed -i "s|\"undefined\"|\"${GEMINI_API_KEY}\"|g" {} + 2>/dev/null || true
    find /app/dist -name "*.js" -exec sed -i "s|\"null\"|\"${GEMINI_API_KEY}\"|g" {} + 2>/dev/null || true
else
    echo "  ⚠ GEMINI_API_KEY not set — Gemini AI features will use static fallback data."
fi

# ── 2. Start Python backend on port 5000 (background) ──
echo "  ⚡ Starting Azure CLI backend on port ${BACKEND_PORT}..."
python /app/backend_server.py &
BACKEND_PID=$!
sleep 1

# ── 3. Serve frontend + proxy API via the combined server ──
echo "  ⚡ Starting combined server on port ${PORT}..."
python /app/cloud_run_server.py &
SERVER_PID=$!

echo ""
echo "  ✓ Overclouded is running on port ${PORT}"
echo ""

# Wait for either process to exit
wait -n $BACKEND_PID $SERVER_PID
EXIT_CODE=$?

# If one dies, kill the other
kill $BACKEND_PID $SERVER_PID 2>/dev/null || true
exit $EXIT_CODE
