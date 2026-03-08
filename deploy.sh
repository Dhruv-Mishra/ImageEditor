#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  Cropio — Production deployment script for shared VM
#  Domain : cropio.whoisdhruv.com
#  Ports  : 3001 (Next.js standalone), 8000 (Python YOLO backend)
#  User   : ubuntu
#
#  This VM already hosts a portfolio site on port 3000.
#  This script is idempotent — safe to re-run for updates.
#
#  PREREQUISITES (manual one-time steps):
#    1. Cloudflare DNS A record for cropio.whoisdhruv.com → VM IP (proxied)
#    2. .env.local in project root with:
#         NVIDIA_VISION_API_KEY=<key>
#         NVIDIA_EMBED_API_KEY=<key>
#
#  Usage:
#    sudo ./deploy.sh                # Full deploy (git pull + build + restart)
#    sudo ./deploy.sh --skip-git     # Deploy without git pull
#    sudo ./deploy.sh --skip-build   # Restart services + update nginx only
#    sudo ./deploy.sh --force        # Deploy even with uncommitted changes
# ═══════════════════════════════════════════════════════════════════

# ── Configuration ───────────────────────────────────────────────────
DOMAIN="cropio.whoisdhruv.com"
APP_USER="ubuntu"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="cropio"
NEXTJS_PORT=3001
BACKEND_PORT=8000
# Reuse the existing wildcard cert (*.whoisdhruv.com) from the portfolio site
SSL_CERT="/etc/ssl/cloudflare/whoisdhruv.com.pem"
SSL_KEY="/etc/ssl/cloudflare/whoisdhruv.com.key"
GIT_BRANCH="master"

# Read resource limits from machine.conf if available
if [ -f /etc/deploy/machine.conf ]; then
  # shellcheck source=/dev/null
  source /etc/deploy/machine.conf
fi
NODE_HEAP_MB="${NODE_HEAP_MB:-2048}"
MEMORY_HIGH_MB="${MEMORY_HIGH_MB:-4096}"
MEMORY_MAX_MB="${MEMORY_MAX_MB:-6144}"
CPU_QUOTA_PERCENT="${CPU_QUOTA_PERCENT:-180}"
BUILD_NICE="${BUILD_NICE:-10}"
BUILD_HEAP_MB="${BUILD_HEAP_MB:-4096}"
SERVICE_NICE="${SERVICE_NICE:-0}"

# ── Parse arguments ────────────────────────────────────────────────
SKIP_GIT=false
SKIP_BUILD=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --skip-git)   SKIP_GIT=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --force)      FORCE=true ;;
    --site)       ;; # Ignored for compatibility with shared deploy infra
    cropio)       ;; # Ignored — site name arg
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: sudo ./deploy.sh [--skip-git] [--skip-build] [--force]" >&2
      exit 1
      ;;
  esac
done

echo ""
echo "══════════════════════════════════════════════"
echo "  Cropio Deployment — ${DOMAIN}"
echo "  App directory: ${APP_DIR}"
echo "  Next.js port: ${NEXTJS_PORT}  Backend port: ${BACKEND_PORT}"
echo "══════════════════════════════════════════════"
echo ""

# ── 0. Preflight checks ────────────────────────────────────────────
echo "▶ [0/9] Preflight checks…"

if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run with sudo:  sudo ./deploy.sh" >&2
  exit 1
fi

# Verify Node.js is available
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed." >&2
  exit 1
fi
echo "  Node $(node -v) · npm $(npm -v)"

# Verify Python3
if ! command -v python3 &>/dev/null; then
  echo "ERROR: Python3 is not installed." >&2
  exit 1
fi
echo "  Python $(python3 --version | awk '{print $2}')"

# Verify nginx
if ! command -v nginx &>/dev/null; then
  echo "ERROR: nginx is not installed." >&2
  exit 1
fi

# Verify wildcard SSL certificates exist (shared with portfolio)
if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
  echo "ERROR: Wildcard Cloudflare Origin Certificate not found." >&2
  echo "  Expected (from portfolio setup):" >&2
  echo "    ${SSL_CERT}" >&2
  echo "    ${SSL_KEY}" >&2
  echo "  These should already exist from the portfolio deployment." >&2
  exit 1
fi
echo "  SSL certificate: ${SSL_CERT} (wildcard, shared)"

# Verify .env.local exists
if [ ! -f "${APP_DIR}/.env.local" ]; then
  echo "ERROR: .env.local not found in ${APP_DIR}" >&2
  echo "  Create it with:" >&2
  echo "    NVIDIA_VISION_API_KEY=<your-key>" >&2
  echo "    NVIDIA_EMBED_API_KEY=<your-key>" >&2
  exit 1
fi

# Verify required env vars
for var in NVIDIA_VISION_API_KEY NVIDIA_EMBED_API_KEY; do
  if ! grep -q "^${var}=" "${APP_DIR}/.env.local" 2>/dev/null; then
    echo "WARNING: ${var} not found in .env.local — some features may not work." >&2
  fi
done

# Verify portfolio is not disrupted
if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  echo "  Portfolio site detected on port 3000 ✓"
fi

echo "  All preflight checks passed."

# ── 1. Git pull ─────────────────────────────────────────────────────
if [ "$SKIP_GIT" = false ]; then
  echo "▶ [1/9] Pulling latest code…"
  cd "$APP_DIR"

  # Check for uncommitted changes
  if [ "$FORCE" = false ]; then
    if sudo -u "$APP_USER" git -C "$APP_DIR" status --porcelain | grep -q .; then
      echo "ERROR: Uncommitted changes detected. Use --force to override." >&2
      exit 1
    fi
  fi

  sudo -u "$APP_USER" git -C "$APP_DIR" fetch origin "$GIT_BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard "origin/${GIT_BRANCH}"
  echo "  Pulled $(sudo -u "$APP_USER" git -C "$APP_DIR" log -1 --format='%h %s')"
else
  echo "▶ [1/9] Skipping git pull (--skip-git)"
fi

# ── 2. npm install ──────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo "▶ [2/9] Installing npm dependencies…"
  cd "$APP_DIR"
  sudo -u "$APP_USER" npm ci --prefer-offline 2>&1 | tail -3
else
  echo "▶ [2/9] Skipping npm install (--skip-build)"
fi

# ── 3. Next.js standalone build ─────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo "▶ [3/9] Building Next.js (standalone)…"
  cd "$APP_DIR"

  # Clean previous build artifacts (may be root-owned from prior cp -r)
  rm -rf "${APP_DIR}/.next"

  # Build with resource limits
  sudo -u "$APP_USER" \
    nice -n "$BUILD_NICE" \
    ionice -c 2 \
    env NODE_OPTIONS="--max-old-space-size=${BUILD_HEAP_MB}" \
    npm run build

  # Copy static assets + public into standalone dir
  STANDALONE_DIR="${APP_DIR}/.next/standalone"
  if [ ! -d "$STANDALONE_DIR" ]; then
    echo "ERROR: Standalone build not found at ${STANDALONE_DIR}" >&2
    echo "  Ensure next.config.mjs has: output: 'standalone'" >&2
    exit 1
  fi

  echo "  Copying static assets into standalone bundle…"
  cp -r "${APP_DIR}/.next/static" "${STANDALONE_DIR}/.next/static"
  cp -r "${APP_DIR}/public" "${STANDALONE_DIR}/public"

  # Copy .env.local so the standalone server can read it
  cp "${APP_DIR}/.env.local" "${STANDALONE_DIR}/.env.local"

  # Fix ownership so future builds (as APP_USER) can clean up
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/.next"

  echo "  Standalone build ready at ${STANDALONE_DIR}"
else
  echo "▶ [3/9] Skipping build (--skip-build)"
fi

# ── 4. Python backend setup ────────────────────────────────────────
echo "▶ [4/9] Setting up Python backend…"
cd "${APP_DIR}/backend"

if [ ! -d "venv" ]; then
  echo "  Creating Python virtual environment…"
  sudo -u "$APP_USER" python3 -m venv venv
fi

echo "  Installing Python dependencies (CPU-only PyTorch for ARM)…"
BACKEND_DIR="${APP_DIR}/backend"
sudo -u "$APP_USER" bash -c "
  cd '${BACKEND_DIR}'
  source venv/bin/activate
  pip install --quiet --upgrade pip
  pip install --quiet torch torchvision --index-url https://download.pytorch.org/whl/cpu 2>/dev/null || true
  pip install --quiet -r requirements.txt
"
cd "$APP_DIR"
echo "  Python backend ready."

# ── 5. File permissions ────────────────────────────────────────────
echo "▶ [5/9] Fixing file permissions for nginx…"

# Ensure nginx can traverse the path to serve static files
CURRENT="${APP_DIR}"
while [ "$CURRENT" != "/" ]; do
  chmod o+x "$CURRENT"
  CURRENT="$(dirname "$CURRENT")"
done

STANDALONE_DIR="${APP_DIR}/.next/standalone"
if [ -d "$STANDALONE_DIR" ]; then
  find "$STANDALONE_DIR/.next/static" -type f -exec chmod o+r {} \; 2>/dev/null || true
  find "$STANDALONE_DIR/public" -type f -exec chmod o+r {} \; 2>/dev/null || true
  find "$STANDALONE_DIR" -type d -exec chmod o+x {} \; 2>/dev/null || true
fi

# ── 6. systemd service: cropio-backend (Python/YOLO) ──────────────
echo "▶ [6/9] Creating systemd services…"

cat > "/etc/systemd/system/${SERVICE_NAME}-backend.service" <<EOF
[Unit]
Description=Cropio Backend — YOLO Pose Estimation API
After=network.target
Wants=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app:app --host 127.0.0.1 --port ${BACKEND_PORT} --workers 1
Environment=PATH=${APP_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin:/bin
Restart=on-failure
RestartSec=5
TimeoutStartSec=120

# Resource limits
MemoryHigh=${MEMORY_HIGH_MB}M
MemoryMax=${MEMORY_MAX_MB}M
CPUQuota=${CPU_QUOTA_PERCENT}%

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${APP_DIR}/backend
PrivateTmp=true

StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}-backend

[Install]
WantedBy=multi-user.target
EOF

# ── 6b. systemd service: cropio (Next.js standalone) ──────────────

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Cropio — Next.js Frontend
After=network.target ${SERVICE_NAME}-backend.service
Wants=${SERVICE_NAME}-backend.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/.next/standalone
ExecStart=/usr/bin/node ${APP_DIR}/.next/standalone/server.js
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=${NEXTJS_PORT}
Environment=NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}
Restart=on-failure
RestartSec=5
TimeoutStartSec=30
Nice=${SERVICE_NICE}

# Resource limits
MemoryHigh=${MEMORY_HIGH_MB}M
MemoryMax=${MEMORY_MAX_MB}M
CPUQuota=${CPU_QUOTA_PERCENT}%

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${APP_DIR}
PrivateTmp=true

StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}-backend" "${SERVICE_NAME}"

# ── 7. Nginx configuration ─────────────────────────────────────────
echo "▶ [7/9] Configuring nginx…"

NGINX_TEMPLATE="${APP_DIR}/nginx-cloudflare.conf"
STANDALONE_DIR="${APP_DIR}/.next/standalone"

if [ ! -f "$NGINX_TEMPLATE" ]; then
  echo "ERROR: nginx template not found at ${NGINX_TEMPLATE}" >&2
  exit 1
fi

# Process template — replace placeholders
sed \
  -e "s|__DOMAIN__|${DOMAIN}|g" \
  -e "s|__NEXTJS_PORT__|${NEXTJS_PORT}|g" \
  -e "s|__SERVICE_NAME__|${SERVICE_NAME}|g" \
  -e "s|__SSL_CERT__|${SSL_CERT}|g" \
  -e "s|__SSL_KEY__|${SSL_KEY}|g" \
  -e "s|__STANDALONE_DIR__|${STANDALONE_DIR}|g" \
  "$NGINX_TEMPLATE" > "/etc/nginx/sites-available/${SERVICE_NAME}"

# Enable site (only manage the cropio symlink — never touch other sites)
ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"

# Validate before reloading
if ! nginx -t 2>&1; then
  echo "ERROR: nginx configuration test failed!" >&2
  echo "  Check: /etc/nginx/sites-available/${SERVICE_NAME}" >&2
  exit 1
fi

systemctl reload nginx
echo "  nginx configured and reloaded."

# ── 8. Start / restart services ────────────────────────────────────
echo "▶ [8/9] Starting services…"

# Start backend first (YOLO model loading takes time)
systemctl restart "${SERVICE_NAME}-backend"

echo "  Waiting for backend to load YOLO model…"
for i in $(seq 1 120); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/api/health" > /dev/null 2>&1; then
    echo "  Backend healthy (took ${i}s)."
    break
  fi
  if [ "$i" -eq 120 ]; then
    echo "WARNING: Backend did not become healthy within 120s." >&2
    echo "  Check: sudo journalctl -u ${SERVICE_NAME}-backend -n 50" >&2
  fi
  sleep 1
done

# Start Next.js
systemctl restart "${SERVICE_NAME}"

echo "  Waiting for Next.js to start…"
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${NEXTJS_PORT}/" > /dev/null 2>&1; then
    echo "  Next.js healthy (took ${i}s)."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "WARNING: Next.js did not respond within 30s." >&2
    echo "  Check: sudo journalctl -u ${SERVICE_NAME} -n 50" >&2
  fi
  sleep 1
done

# ── 9. Final verification ──────────────────────────────────────────
echo "▶ [9/9] Final verification…"

ERRORS=0

# Check cropio-backend service
if systemctl is-active --quiet "${SERVICE_NAME}-backend"; then
  echo "  ✓ ${SERVICE_NAME}-backend service is running"
else
  echo "  ✗ ${SERVICE_NAME}-backend service is NOT running" >&2
  ERRORS=$((ERRORS + 1))
fi

# Check cropio service
if systemctl is-active --quiet "${SERVICE_NAME}"; then
  echo "  ✓ ${SERVICE_NAME} service is running"
else
  echo "  ✗ ${SERVICE_NAME} service is NOT running" >&2
  ERRORS=$((ERRORS + 1))
fi

# Check ports
if ss -tlnp | grep -q ":${BACKEND_PORT} "; then
  echo "  ✓ Backend listening on port ${BACKEND_PORT}"
else
  echo "  ✗ Nothing listening on port ${BACKEND_PORT}" >&2
  ERRORS=$((ERRORS + 1))
fi

if ss -tlnp | grep -q ":${NEXTJS_PORT} "; then
  echo "  ✓ Next.js listening on port ${NEXTJS_PORT}"
else
  echo "  ✗ Nothing listening on port ${NEXTJS_PORT}" >&2
  ERRORS=$((ERRORS + 1))
fi

# Verify portfolio is still running
if ss -tlnp | grep -q ":3000 "; then
  echo "  ✓ Portfolio site still running on port 3000"
else
  echo "  ⚠ Portfolio site not detected on port 3000 (may be expected)"
fi

# HTTPS health check through nginx
if curl -sf -o /dev/null -w "%{http_code}" --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" -k 2>/dev/null | grep -q "200"; then
  echo "  ✓ HTTPS responding through nginx"
else
  echo "  ⚠ HTTPS test inconclusive (Cloudflare may not be configured yet)"
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "══════════════════════════════════════════════"
  echo "  ✅ Cropio deployed successfully!"
  echo "     https://${DOMAIN}"
  echo ""
  echo "  Useful commands:"
  echo "    sudo systemctl status ${SERVICE_NAME}"
  echo "    sudo systemctl status ${SERVICE_NAME}-backend"
  echo "    sudo journalctl -u ${SERVICE_NAME} -f"
  echo "    sudo journalctl -u ${SERVICE_NAME}-backend -f"
  echo ""
  echo "  Re-deploy:"
  echo "    sudo ./deploy.sh                # Full deploy"
  echo "    sudo ./deploy.sh --skip-git     # Rebuild without git pull"
  echo "    sudo ./deploy.sh --skip-build   # Restart services only"
  echo "══════════════════════════════════════════════"
else
  echo "══════════════════════════════════════════════"
  echo "  ⚠️  Deployment completed with ${ERRORS} error(s)."
  echo "  Check logs:"
  echo "    sudo journalctl -u ${SERVICE_NAME} --no-pager -n 40"
  echo "    sudo journalctl -u ${SERVICE_NAME}-backend --no-pager -n 40"
  echo "══════════════════════════════════════════════"
  exit 1
fi
