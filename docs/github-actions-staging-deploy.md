# GitHub Actions Staging Deploy

This repo deploys staging with `.github/workflows/deploy-staging.yml`.

## Required GitHub Secrets

Add these in GitHub:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

- `VPS_HOST`: VPS IP or hostname.
- `VPS_USER`: SSH user. For the current test VPS setup, use `root`.
- `VPS_SSH_KEY`: private SSH key allowed to connect to the VPS.
- `VPS_PORT`: SSH port. Optional if `22`.
- `VPS_APP_DIR`: app path. Optional, defaults to `/opt/finnweb/current`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for build-time web env. Can be blank only if checkout is not tested.

## VPS Requirements

The VPS must already have:

- Repo cloned at `/opt/finnweb/current`.
- `/etc/finnweb/api.env`.
- `/etc/finnweb/web.env`.
- Caddy configured for `finnweb.site`.
- `pnpm` available.
- systemd available.

The workflow pulls `origin/main`, installs dependencies, builds, runs `prisma db push`, runs seed, copies systemd files, restarts services, reloads Caddy, and checks local health endpoints.

## Wildcard Public Sites

FinnWeb supports both public URL styles:

- `https://finnweb.site/s/<siteSlug>`
- `https://<siteSlug>.finnweb.site`

For subdomain public sites, add this DNS record in Hostinger:

```text
Type: A
Name: *
Value: <your-vps-ip>
TTL: 300
```

Then make Caddy serve the wildcard host:

```caddy
finnweb.site, *.finnweb.site {
	encode gzip zstd

	handle /api/* {
		reverse_proxy 127.0.0.1:4000
	}

	handle /docs* {
		reverse_proxy 127.0.0.1:4000
	}

	handle {
		reverse_proxy 127.0.0.1:3000
	}
}
```

In `/etc/finnweb/web.env`, set:

```env
NEXT_PUBLIC_ROOT_DOMAIN=finnweb.site
NEXT_PUBLIC_API_BASE_URL=https://finnweb.site/api
```

## Manual Deploy

Open GitHub Actions, choose `Deploy Staging`, then click `Run workflow`.

Deploy also runs automatically on pushes to `main`.
