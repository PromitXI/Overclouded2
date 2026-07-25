# ──────────────────────────────────────────────────────────────
#  Overclouded — Multi-stage Dockerfile for Google Cloud Run
# ──────────────────────────────────────────────────────────────
#
#  Secrets / Environment Variables (set in Cloud Run):
#    GEMINI_API_KEY  — Google Gemini API key
#                      Store in GCP Secret Manager, mount as env var.
#
#  Build:   docker build -t overclouded .
#  Run:     docker run -p 8080:8080 -e GEMINI_API_KEY=your-key overclouded
# ──────────────────────────────────────────────────────────────

# ═══════════════════════════════════════════════════════
# Stage 1: Build the Vite/React frontend
# ═══════════════════════════════════════════════════════
FROM node:20-slim AS frontend-build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY index.html index.tsx App.tsx types.ts tsconfig.json vite.config.ts ./
COPY components/ ./components/
COPY services/ ./services/
COPY public/ ./public/

RUN npm run build


# ═══════════════════════════════════════════════════════
# Stage 2: Production image — Python + Azure CLI
# ═══════════════════════════════════════════════════════
FROM python:3.12-slim

# Install bash (for entrypoint), curl, and Azure CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
        bash \
        curl \
        apt-transport-https \
        lsb-release \
        gnupg \
        ca-certificates \
    && curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built frontend from stage 1
COPY --from=frontend-build /app/dist ./dist

# Copy Python server files
COPY backend_server.py ./
COPY cloud_run_server.py ./

# Write the entrypoint inline to guarantee LF line endings (no CRLF issues)
RUN printf '#!/bin/bash\n\
set -e\n\
\n\
PORT="${PORT:-8080}"\n\
# Shared by backend_server.py and cloud_run_server.py so both agree.\n\
export OVERCLOUDED_BACKEND_PORT="${OVERCLOUDED_BACKEND_PORT:-5057}"\n\
BACKEND_PORT="$OVERCLOUDED_BACKEND_PORT"\n\
\n\
echo ""\n\
echo "  Overclouded — Starting Container"\n\
echo "  PORT=$PORT  BACKEND=$BACKEND_PORT"\n\
echo ""\n\
\n\
# Start Python backend (Azure CLI proxy) on port 5000 in background\n\
echo "  Starting Azure CLI backend on port ${BACKEND_PORT}..."\n\
python /app/backend_server.py &\n\
BACKEND_PID=$!\n\
sleep 2\n\
\n\
# Start combined frontend+proxy server on $PORT\n\
echo "  Starting combined server on port ${PORT}..."\n\
python /app/cloud_run_server.py\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Environment
ENV PORT=8080
ENV GEMINI_API_KEY=""

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
