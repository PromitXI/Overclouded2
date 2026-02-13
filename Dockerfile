# ──────────────────────────────────────────────────────────────
#  Overclouded — Multi-stage Dockerfile for Google Cloud Run
# ──────────────────────────────────────────────────────────────
#
#  Secrets / Environment Variables (set in Cloud Run):
#    GEMINI_API_KEY  — Google Gemini API key (required)
#                      Configure as a Secret in GCP Secret Manager,
#                      then mount it as an env var in Cloud Run.
#
#  Build:
#    docker build -t overclouded .
#
#  Run locally:
#    docker run -p 8080:8080 -e GEMINI_API_KEY=your-key overclouded
#
# ──────────────────────────────────────────────────────────────

# ═══════════════════════════════════════════════════════
# Stage 1: Build the Vite/React frontend
# ═══════════════════════════════════════════════════════
FROM node:20-slim AS frontend-build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source
COPY index.html index.tsx App.tsx types.ts tsconfig.json vite.config.ts ./
COPY components/ ./components/
COPY services/ ./services/
COPY public/ ./public/

# Build — GEMINI_API_KEY is injected at build time via ARG,
# but for Cloud Run we pass it at runtime so the build uses
# a placeholder; the real key is substituted at container start.
ARG GEMINI_API_KEY=""
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
RUN npm run build


# ═══════════════════════════════════════════════════════
# Stage 2: Production image with Python + Azure CLI
# ═══════════════════════════════════════════════════════
FROM python:3.12-slim

# Install system deps + Azure CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
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

# Copy backend server
COPY backend_server.py ./

# Copy the entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# ── Environment ──
# PORT is set by Cloud Run (default 8080)
ENV PORT=8080
# GEMINI_API_KEY should be provided via Cloud Run env / Secret Manager
# Do NOT hardcode it here.
ENV GEMINI_API_KEY=""

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
