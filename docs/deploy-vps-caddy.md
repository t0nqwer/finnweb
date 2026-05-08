# Deploy FinnWeb to a Test VPS with Caddy

This is a staging-oriented deployment path for one VPS running Caddy, PostgreSQL, Redis, the NestJS API, and the Next.js web app.

## Target Shape

- Caddy terminates HTTPS on `https://staging.example.com`.
- Caddy proxies `/api/*` and `/docs*` to the API on port `4000`.
- Caddy proxies all other routes to Next.js on port `3000`.
- PostgreSQL and Redis run locally on the VPS.
- API, web, and background worker services run through systemd as the `finnweb` user.

## Server Packages

```bash
sudo apt update
sudo apt install -y git curl postgresql redis-server
corepack enable
corepack prepare pnpm@10.17.0 --activate
```

Install Node.js 20+ before running the app. If the VPS does not already have it, use your preferred Node distribution method, then confirm:

```bash
node -v
pnpm -v
```

## App User and Database

```bash
sudo adduser --system --group --home /opt/finnweb finnweb
sudo mkdir -p /opt/finnweb/current /etc/finnweb
sudo chown -R finnweb:finnweb /opt/finnweb

sudo -u postgres createuser finnweb
sudo -u postgres createdb finnweb_staging -O finnweb
sudo -u postgres psql -c "ALTER USER finnweb WITH PASSWORD 'change-me';"
```

## Get the Code

```bash
sudo -u finnweb git clone https://github.com/<your-org>/finnweb.git /opt/finnweb/current
cd /opt/finnweb/current
sudo -u finnweb pnpm install --frozen-lockfile
```

## Environment Files

Use `.env.staging.example` as the checklist, but keep real secrets only on the VPS.

Create `/etc/finnweb/api.env`:

```env
NODE_ENV=production
PORT=4000
APP_URL=https://staging.example.com
FRONTEND_URL=https://staging.example.com
DATABASE_URL=postgresql://finnweb:change-me@127.0.0.1:5432/finnweb_staging
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=change-me-at-least-32-chars
JWT_EXPIRES_IN=7d
JWT_ACCESS_SECRET=change-me-at-least-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change-me-at-least-32-chars
JWT_REFRESH_EXPIRES_IN=30d
RESEND_API_KEY=
EMAIL_FROM=FinnWeb <no-reply@staging.example.com>
STRIPE_SECRET_KEY=sk_test_change_me
STRIPE_WEBHOOK_SECRET=whsec_change_me
QUEUE_PREFIX=finnweb-staging
QUEUE_DEFAULT_ATTEMPTS=3
QUEUE_BACKOFF_MS=5000
WORKER_CONCURRENCY=5
```

Create `/etc/finnweb/web.env`:

```env
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://staging.example.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_change_me
```

Then lock permissions:

```bash
sudo chown root:finnweb /etc/finnweb/api.env /etc/finnweb/web.env
sudo chmod 640 /etc/finnweb/api.env /etc/finnweb/web.env
```

## Build and Prepare the Database

Next.js public environment variables are embedded during build, so load `web.env` before `pnpm build`.

```bash
cd /opt/finnweb/current
sudo -u finnweb bash -lc 'set -a; source /etc/finnweb/web.env; set +a; pnpm build'
sudo -u finnweb bash -lc 'cd apps/api && set -a; source /etc/finnweb/api.env; set +a; pnpm exec prisma db push'
sudo -u finnweb bash -lc 'cd apps/api && set -a; source /etc/finnweb/api.env; set +a; pnpm exec prisma db seed'
```

This repo currently has no committed Prisma migrations directory, so `prisma db push` is the practical staging path. Before production launch, add migrations and switch to `prisma migrate deploy`.

## Install systemd Services

```bash
sudo cp /opt/finnweb/current/deploy/systemd/finnweb-api.service /etc/systemd/system/finnweb-api.service
sudo cp /opt/finnweb/current/deploy/systemd/finnweb-web.service /etc/systemd/system/finnweb-web.service
sudo cp /opt/finnweb/current/deploy/systemd/finnweb-worker.service /etc/systemd/system/finnweb-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now finnweb-api finnweb-worker finnweb-web
sudo systemctl status finnweb-api finnweb-worker finnweb-web
```

## Caddy

Copy `deploy/Caddyfile.staging.example` into your Caddy config and replace `staging.example.com`.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Make sure DNS `A` record points to the VPS and the firewall only exposes SSH, HTTP, and HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Smoke Test

```bash
curl -I https://staging.example.com
curl https://staging.example.com/api/health
curl -I https://staging.example.com/docs
```

Then test in browser:

- Open the landing page.
- Register or sign in.
- Create a workspace and site.
- Publish a site and open `/s/<siteSlug>`.
- Submit a public form and check leads.

## Update Deploy

```bash
cd /opt/finnweb/current
sudo -u finnweb git pull --ff-only
sudo -u finnweb pnpm install --frozen-lockfile
sudo -u finnweb bash -lc 'set -a; source /etc/finnweb/web.env; set +a; pnpm build'
sudo -u finnweb bash -lc 'cd apps/api && set -a; source /etc/finnweb/api.env; set +a; pnpm exec prisma db push'
sudo systemctl restart finnweb-api finnweb-worker finnweb-web
```

## Rollback Note

For a simple test VPS, keep the previous Git commit hash before pulling:

```bash
git rev-parse HEAD
```

Rollback:

```bash
cd /opt/finnweb/current
sudo -u finnweb git checkout <previous-commit>
sudo -u finnweb bash -lc 'set -a; source /etc/finnweb/web.env; set +a; pnpm build'
sudo systemctl restart finnweb-api finnweb-worker finnweb-web
```

If database shape changed through `db push`, rollback may need manual DB repair or a fresh staging database restore. Use real migrations before production.
