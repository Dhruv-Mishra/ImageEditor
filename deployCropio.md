# Deploying Cropio on a Shared VM — Complete Guide

## Context

You are deploying the **Cropio** website onto a VM that **already hosts another website** (a Next.js portfolio site). Both sites must coexist without conflict.

### VM Specifications

| Property | Value |
|---|---|
| Cloud Provider | Oracle Cloud Infrastructure (OCI) |
| Shape | Ampere A1 (ARM) |
| CPU | 4 ARM vCPU (4 OCPU) |
| RAM | 24 GB |
| OS | Ubuntu 24.04 LTS |
| User | `ubuntu` |
| Existing site | Portfolio (Next.js, port 3000, domain `whoisdhruv.com`) |

### What's Already Running

The VM has already been configured with:

- **Node.js 22 LTS** and **nginx** (installed, running)
- **UFW firewall** — ports 22, 80, 443 open
- **fail2ban** — SSH brute-force protection
- **earlyoom** — OOM protection (prefers killing node over sshd/nginx)
- **2 GB swap file**
- **Safe kernel tuning** (TCP BBR, security hardening)
- **Global nginx.conf** with rate limiting zones (`general`, `api`) and gzip
- **Portfolio website** running as systemd service `portfolio.service` on port 3000
- **Deploy infrastructure** at `/etc/deploy/` — see below

### Deployment Infrastructure

The VM uses a config-driven deployment system at `/etc/deploy/`:

```
/etc/deploy/
├── machine.conf              # Machine-level config (shared across all sites)
└── sites/
    ├── portfolio.conf         # Portfolio site config (port 3000)
    └── cropio.conf            # ← YOU CREATE THIS (port 3001)
```

**`/etc/deploy/machine.conf`** contains per-site resource limits shared across all sites:

```bash
MACHINE_USER="ubuntu"
NODE_HEAP_MB=2048          # V8 heap limit per site (MB)
MEMORY_HIGH_MB=4096        # systemd soft memory limit per site (MB)
MEMORY_MAX_MB=6144         # systemd hard memory limit per site (MB)
CPU_QUOTA_PERCENT=180      # CPU quota per site (% of all CPUs; 4 vCPU = 400% total)
BUILD_NICE=10              # Build process priority (0-19, higher = lower priority)
BUILD_IONICE_CLASS=2       # I/O scheduling class (2=best-effort)
BUILD_HEAP_MB=4096         # V8 heap during build (MB)
SERVICE_NICE=0             # Running service priority
```

These values are tuned for 2 sites on 4 vCPU / 24 GB. **Do not change them** without coordinating with the portfolio site admin.

---

## Reserved Resources — Do NOT Conflict

| Resource | Portfolio (existing) | Cropio (yours) |
|---|---|---|
| Next.js port | 3000 | **3001** |
| Backend port | — | **8000** |
| systemd service name | `portfolio` | **`cropio`** |
| nginx config name | `portfolio` | **`cropio`** |
| SSL cert path | `/etc/ssl/cloudflare/whoisdhruv.com.*` | `/etc/ssl/cloudflare/<cropio-domain>.*` |
| nginx cache zone | `portfolio_cache` | **`cropio_cache`** |
| nginx upstream | `portfolio_backend` | **`cropio_backend`** |
| Deploy logs | `/var/log/portfolio-deploy/` | `/var/log/cropio-deploy/` |
| Backups | `/var/backups/portfolio/` | `/var/backups/cropio/` |

**CRITICAL: Port 3000 is taken. Never bind anything to port 3000.**

---

## IP Address Behavior

The VM's bare IP address (`http://<IP>`) should **redirect to the portfolio site**, NOT to Cropio.

The global nginx.conf already has a default server block that drops unmatched connections (returns 444). To make the bare IP redirect to the portfolio instead, after your deployment is complete, create this config:

```bash
sudo nano /etc/nginx/conf.d/00-default-redirect.conf
```

```nginx
# Redirect bare IP access to the portfolio site
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://whoisdhruv.com$request_uri;
}
```

Then remove the existing default server from the global nginx.conf by commenting out or deleting the `server { listen 80 default_server; ... return 444; }` block in `/etc/nginx/nginx.conf`, and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Important:** Your Cropio nginx config must NOT use `default_server` in its `listen` directives. Only the portfolio or the redirect config should be the default.

---

## Step-by-Step Deployment

### 1. Clone the Cropio Repository

```bash
cd /home/ubuntu
git clone <cropio-repo-url> cropioWebsite
```

### 2. Create the Site Config

```bash
sudo nano /etc/deploy/sites/cropio.conf
```

```bash
# /etc/deploy/sites/cropio.conf — Cropio site configuration

# ── Identity ─────────────────────────────────────────────────────────────
DOMAIN="<cropio-domain.com>"
SERVICE_NAME="cropio"
NEXTJS_PORT=3001

# ── Repository Paths ─────────────────────────────────────────────────────
GIT_ROOT="/home/ubuntu/cropioWebsite"
PROJECT_ROOT="/home/ubuntu/cropioWebsite"          # adjust if Next.js is nested

# ── Git ──────────────────────────────────────────────────────────────────
GIT_BRANCH="main"
GIT_REMOTE="origin"

# ── SSL (Cloudflare Origin Certificate) ──────────────────────────────────
SSL_CERT="/etc/ssl/cloudflare/<cropio-domain.com>.pem"
SSL_KEY="/etc/ssl/cloudflare/<cropio-domain.com>.key"

# ── Nginx ────────────────────────────────────────────────────────────────
NGINX_CONF_TEMPLATE="nginx-cloudflare.conf"

# ── Required Environment Variables ───────────────────────────────────────
# Comma-separated. Deploy script validates these exist in .env.local.
# Adjust to match what Cropio actually needs.
REQUIRED_ENV_VARS="DATABASE_URL"

# ── Backups & Logs ───────────────────────────────────────────────────────
BACKUP_RETENTION_DAYS=7
MAX_LOG_FILES=10
```

```bash
sudo chmod 600 /etc/deploy/sites/cropio.conf
```

### 3. Create Cloudflare Origin Certificate

1. **Cloudflare Dashboard** → Cropio domain → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. **RSA (2048)**, **15 years** validity
4. Hostnames: `<cropio-domain.com>` and `*.<cropio-domain.com>`
5. Click **Create**

On the VM:
```bash
sudo mkdir -p /etc/ssl/cloudflare

# Paste the Origin Certificate:
sudo nano /etc/ssl/cloudflare/<cropio-domain.com>.pem

# Paste the Private Key:
sudo nano /etc/ssl/cloudflare/<cropio-domain.com>.key

# Lock down permissions:
sudo chmod 600 /etc/ssl/cloudflare/<cropio-domain.com>.key
sudo chmod 644 /etc/ssl/cloudflare/<cropio-domain.com>.pem
```

### 4. Configure Cloudflare DNS

1. **DNS** → A record: `<cropio-domain.com>` → `<VM_PUBLIC_IP>`, **Proxied** (orange cloud)
2. **DNS** → A record: `www.<cropio-domain.com>` → `<VM_PUBLIC_IP>`, **Proxied**
3. **SSL/TLS** → encryption mode: **Full (strict)**

### 5. Create .env.local

```bash
nano /home/ubuntu/cropioWebsite/.env.local
```

Add whatever environment variables Cropio requires (e.g., `DATABASE_URL`, API keys, etc.).

### 6. Create the Nginx Template

Your Cropio repo needs an `nginx-cloudflare.conf` template file in the project root (or wherever `NGINX_CONF_TEMPLATE` points). The deploy script processes this template by replacing placeholders with values from the site config.

**Available placeholders:**
- `__DOMAIN__` → your domain
- `__NEXTJS_PORT__` → 3001
- `__SERVICE_NAME__` → cropio
- `__SSL_CERT__` → path to SSL cert
- `__SSL_KEY__` → path to SSL key
- `__STANDALONE_DIR__` → path to `.next/standalone`

**Copy the portfolio's template as a starting point:**
```bash
cp /home/ubuntu/portfolioWebsite/portfolio/nginx-cloudflare.conf /home/ubuntu/cropioWebsite/nginx-cloudflare.conf
```

Then edit it to match Cropio's needs:
- Update the `Content-Security-Policy` header to match Cropio's domains
- If Cropio has a backend API on port 8000, add a proxy location for it (see below)
- If Cropio doesn't have SSE streaming (`/api/chat`), remove that location block
- **DO NOT** add `default_server` to any `listen` directive

#### If Cropio Has a Separate Backend on Port 8000

Add an upstream and location block to the nginx template:

```nginx
# Add this near the top, after the existing upstream block:
upstream __SERVICE_NAME___api_backend {
    server 127.0.0.1:8000;
    keepalive 4;
}

# Add this location block inside the server block:
location /api/ {
    limit_req zone=api burst=10 nodelay;
    proxy_pass http://__SERVICE_NAME___api_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache off;
}
```

You'll also need a **separate systemd service** for the backend (see Step 8).

### 7. Ensure next.config Has Standalone Output

Cropio's `next.config.ts` (or `.js`) must include:

```typescript
const nextConfig = {
  output: 'standalone',
  // ... other config
};
```

Without this, the build won't produce the standalone bundle and deployment will fail.

### 8. Create Backend Service (Port 8000) — If Applicable

If Cropio has a separate backend (not just Next.js API routes), create a systemd service for it:

```bash
sudo nano /etc/systemd/system/cropio-backend.service
```

```ini
[Unit]
Description=Cropio Backend API
After=network.target
Wants=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/cropioWebsite
# Adjust the ExecStart for your backend framework:
# Node.js/Express:
ExecStart=/usr/bin/node server.js
# Python/FastAPI:
# ExecStart=/home/ubuntu/cropioWebsite/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
# Python/Django:
# ExecStart=/home/ubuntu/cropioWebsite/venv/bin/gunicorn myproject.wsgi --bind 127.0.0.1:8000

Environment=NODE_ENV=production
Environment=PORT=8000
Restart=on-failure
RestartSec=5
TimeoutStartSec=30

# Resource limits (adjust based on backend needs)
MemoryHigh=2048M
MemoryMax=3072M
CPUQuota=90%

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/ubuntu/cropioWebsite
PrivateTmp=true

StandardOutput=journal
StandardError=journal
SyslogIdentifier=cropio-backend

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cropio-backend
sudo systemctl start cropio-backend
```

**Port 8000 is NOT exposed through the firewall** (UFW only allows 22, 80, 443). The backend is only accessible via nginx reverse proxy — this is correct and secure. Never expose port 8000 directly.

### 9. Make Deploy Script Executable & Create Symlink

**Option A**: If Cropio uses the same `deploy.sh` from the portfolio repo:
```bash
sudo ln -sf /home/ubuntu/portfolioWebsite/portfolio/scripts/deploy.sh /usr/local/bin/deployCropio
```

Then deploy with:
```bash
sudo deployCropio --site cropio
```

**Option B**: If Cropio has its own deploy script, make it executable:
```bash
chmod +x /home/ubuntu/cropioWebsite/scripts/deploy.sh
sudo ln -sf /home/ubuntu/cropioWebsite/scripts/deploy.sh /usr/local/bin/deployCropio
```

### 10. Deploy

```bash
sudo deployWebsite --site cropio
```

Or if you created a separate symlink:
```bash
sudo deployCropio --site cropio
```

The deploy script will:
1. Pull latest code from git
2. Run `npm ci` + `next build` (standalone mode)
3. Copy static assets, public assets, .env.local into standalone bundle
4. Fix file permissions for nginx
5. Create and enable `cropio.service` (systemd, port 3001)
6. Start Next.js, wait for it to be healthy
7. Process nginx template, deploy to `/etc/nginx/sites-available/cropio`
8. Test nginx config (`nginx -t`) and reload
9. Run health checks

### 11. Verify

```bash
# Check both services are running:
systemctl status portfolio       # Should be active
systemctl status cropio          # Should be active

# Check backend if applicable:
systemctl status cropio-backend  # Should be active

# Check ports:
ss -tlnp | grep -E '3000|3001|8000'

# Test Cropio directly:
curl -s http://127.0.0.1:3001/

# Test portfolio still works:
curl -s http://127.0.0.1:3000/

# Test through nginx:
curl -sk https://127.0.0.1/ -H "Host: <cropio-domain.com>"
curl -sk https://127.0.0.1/ -H "Host: whoisdhruv.com"
```

---

## Subsequent Deployments

```bash
# Deploy Cropio only (does NOT touch portfolio):
sudo deployWebsite --site cropio

# Deploy with options:
sudo deployWebsite --site cropio --skip-git      # No git pull
sudo deployWebsite --site cropio --skip-build     # Nginx-only update
sudo deployWebsite --site cropio --force           # Deploy with uncommitted changes
```

---

## Constraints & Rules

1. **Never use port 3000** — it belongs to the portfolio site.
2. **Never add `default_server`** to Cropio's nginx `listen` directives.
3. **Never modify `/etc/deploy/machine.conf`** without coordinating — it affects both sites.
4. **Never modify `/etc/nginx/nginx.conf`** — it contains shared rate limiting and gzip config.
5. **Never modify `/etc/deploy/sites/portfolio.conf`** — it belongs to the other site.
6. **Never run `sudo deployWebsite`** without `--site cropio` — the default deploys portfolio.
7. **Service names must be unique**: use `cropio` for your SERVICE_NAME.
8. **SSL certs must be separate**: each domain needs its own Cloudflare Origin Certificate.
9. **The backend on port 8000 must only bind to `127.0.0.1`**, never `0.0.0.0` — UFW blocks it anyway, but defense in depth.
10. Cropio's Next.js config **must** have `output: 'standalone'`.

---

## Troubleshooting

### Static assets returning 404
The deploy script sets directory traversal permissions (`o+x`) up the entire path from the standalone dir to `/`. If you still get 404s on `/_next/static/*` files, run:
```bash
sudo find /home/ubuntu/cropioWebsite -type d -exec chmod o+x {} \;
sudo find /home/ubuntu/cropioWebsite/.next/standalone/.next/static -exec chmod o+r {} \;
sudo find /home/ubuntu/cropioWebsite/.next/standalone/public -exec chmod o+r {} \;
```

### Next.js won't start (check logs)
```bash
journalctl -u cropio -n 50 --no-pager
```

### Backend won't start
```bash
journalctl -u cropio-backend -n 50 --no-pager
```

### nginx config fails
```bash
sudo nginx -t    # Shows the exact syntax error
```

### Port conflict
```bash
ss -tlnp | grep -E '3000|3001|8000'   # See what's on each port
```

### Deployment script fails
Check the deploy log:
```bash
ls -lt /var/log/cropio-deploy/     # Most recent log
cat /var/log/cropio-deploy/deploy-*.log | tail -50
```