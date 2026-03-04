#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════
#  Cropio — One-shot deployment script for Ubuntu
#  Domain : cropio.whoisdhruv.com
#  User   : ubuntu
#
#  Usage  : ssh into your Ubuntu machine, clone the repo, then run:
#           chmod +x deploy.sh && sudo ./deploy.sh
#
#  What it does (idempotent — safe to re-run):
#   1. Installs Node.js 20, Python 3, Nginx, Certbot
#   2. Installs npm & pip dependencies
#   3. Builds the Next.js production bundle
#   4. Creates a systemd service (cropio.service)
#   5. Configures Nginx reverse proxy with caching
#   6. Obtains a Let's Encrypt SSL certificate
#   7. Starts the app
# ═══════════════════════════════════════════════════════════════════

DOMAIN="cropio.whoisdhruv.com"
APP_USER="ubuntu"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"   # directory where this script lives
SERVICE_NAME="cropio"
NODE_MAJOR=20

echo ""
echo "══════════════════════════════════════════════"
echo "  Cropio Deployment — $DOMAIN"
echo "  App directory: $APP_DIR"
echo "══════════════════════════════════════════════"
echo ""

# ── 0. Must run as root ─────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run with sudo:  sudo ./deploy.sh" >&2
  exit 1
fi

# ── 1. System packages ─────────────────────────────────────────────
echo "▶ [1/7] Installing system packages…"

apt-get update -qq

# Node.js (NodeSource)
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt "$NODE_MAJOR" ]; then
  echo "  Installing Node.js ${NODE_MAJOR}.x…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

# Python, Nginx, Certbot, curl
apt-get install -y -qq python3 python3-pip python3-venv nginx certbot python3-certbot-nginx curl

echo "  Node $(node -v) · npm $(npm -v) · Python $(python3 --version | awk '{print $2}')"

# ── 2. npm dependencies + build ────────────────────────────────────
echo "▶ [2/7] Installing npm dependencies & building Next.js…"

cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --prefer-offline
sudo -u "$APP_USER" npm run build

# ── 3. Python virtual env + dependencies ───────────────────────────
echo "▶ [3/7] Setting up Python backend…"

cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
  sudo -u "$APP_USER" python3 -m venv venv
fi
sudo -u "$APP_USER" bash -c "source venv/bin/activate && pip install --quiet --upgrade pip && pip install --quiet -r requirements.txt"
cd "$APP_DIR"

# ── 4. systemd service ─────────────────────────────────────────────
echo "▶ [4/7] Creating systemd service…"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Cropio — AI Portrait Cropper
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
# Activate the Python venv so uvicorn + ultralytics are available
Environment=PATH=${APP_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=NODE_ENV=production
ExecStart=/bin/bash ${APP_DIR}/start.sh
Restart=on-failure
RestartSec=5

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# ── 5. Nginx configuration ─────────────────────────────────────────
echo "▶ [5/7] Configuring Nginx reverse proxy…"

cat > "/etc/nginx/sites-available/${SERVICE_NAME}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    # ── Gzip ──
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_min_length 256;
    gzip_types
        text/css
        text/javascript
        application/javascript
        application/json
        image/svg+xml
        application/xml
        text/plain;

    # ── Static image assets — long-lived cache ──
    location /images/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_set_header Host $host;
    }

    # ── Next.js static chunks — immutable ──
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_set_header Host $host;
    }

    # ── Everything else → Next.js ──
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Allow image uploads up to 10 MB
        client_max_body_size 10M;
    }
}
NGINX

# Replace placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "/etc/nginx/sites-available/${SERVICE_NAME}"

# Enable site, remove default if present
ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

# ── 6. SSL via Let's Encrypt ────────────────────────────────────────
echo "▶ [6/7] Obtaining SSL certificate…"

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
  echo "  SSL certificate obtained and auto-renewal configured."
else
  certbot renew --dry-run --quiet
  echo "  SSL certificate already exists. Renewal check passed."
fi

# ── 7. Start the app ───────────────────────────────────────────────
echo "▶ [7/7] Starting Cropio…"

systemctl restart "$SERVICE_NAME"

# Wait for it to come up
sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo ""
  echo "══════════════════════════════════════════════"
  echo "  ✅ Cropio is live at https://${DOMAIN}"
  echo ""
  echo "  Useful commands:"
  echo "    sudo systemctl status ${SERVICE_NAME}"
  echo "    sudo journalctl -u ${SERVICE_NAME} -f"
  echo "    sudo systemctl restart ${SERVICE_NAME}"
  echo "══════════════════════════════════════════════"
else
  echo ""
  echo "⚠️  Service did not start cleanly. Check logs:"
  echo "    sudo journalctl -u ${SERVICE_NAME} --no-pager -n 40"
  exit 1
fi
