# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory Context

Before making UI changes, always read `project-context/brand-book.md`. Task tracking lives in `project-context/tasks.json` — update task status before starting and after completing work. See `AGENTS.md` for the full workflow.

## Commands

All commands run from the repo root using `pnpm`. Turbo parallelizes tasks across apps.

```sh
pnpm dev              # Start all apps in parallel (web :3000, api :4000, worker)
pnpm build            # Production build all apps
pnpm lint             # Lint all apps
pnpm typecheck        # TypeScript check all apps

# Run a single app
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter worker dev

# Tests (Node.js native test runner via tsx — no Jest/Vitest)
pnpm --filter web test
pnpm --filter api test
pnpm --filter api test:auth      # Auth integration tests only

# Task sync to Google Sheets
pnpm sync:tasks                  # One-time push
pnpm sync:tasks:watch            # Continuous watch mode

# Prisma (run from apps/api/)
pnpm --filter api exec npx prisma migrate dev
pnpm --filter api exec npx prisma generate
pnpm --filter api exec npx prisma studio
```

## Monorepo Structure

pnpm workspaces + Turbo. Three apps, two shared packages:

- `apps/web` — Next.js 16 + React 19 frontend
- `apps/api` — NestJS + Fastify backend (API prefix `/api`, Swagger at `/docs`)
- `apps/worker` — BullMQ job processor (concurrency 5, Redis-backed)
- `packages/shared` — Shared types, constants, job definitions (`@finnweb/shared`)
- `packages/config` — Shared config (`@finnweb/config`)

## Frontend Architecture (`apps/web`)

**Routing**: App Router. Public: `/landing`, `/pricing`, `/login`, `/register`. Protected (cookie `finnweb_access_token` required): `/dashboard`, `/sites`, `/billing`, `/settings`. Tenant sites: `/s/[tenant-slug]`.

**Middleware** (`src/middleware.ts`): Rewrites subdomain requests (`tenant.finnweb.site` → `/s/tenant`), enforces auth on protected routes, redirects authenticated users away from guest-only pages.

**API Client** (`src/lib/api-client.ts`): Fetch wrapper with automatic JWT refresh on 401, deduplicates concurrent refresh calls. Auth tokens stored in localStorage via `src/lib/auth-storage.ts`.

**UI Stack**: Tailwind CSS v4, shadcn/ui (Base UI React), GSAP animations, dnd-kit for drag-and-drop (site builder sections), Recharts, TanStack Table, Sonner toasts, Stripe React SDK.

**Design System**: Dark-first "Ignition Console" aesthetic. Primary colors: Ignite Orange `#FF8C00`, Deep Space `#1A1C23`. Typography: Kanit (primary), Geist Mono (code). Thai text requires `line-height >= 1.7`. Orange is reserved for primary actions only ("The Controlled Flame Rule"). Full spec in `DESIGN.md`.

**Features directory** (`src/features/`): Complex feature logic (builder, site-create, site-renderer, admin) is extracted here rather than living in route files.

## Backend Architecture (`apps/api`)

**Framework**: NestJS modules with Fastify HTTP adapter. Each module follows: `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.module.ts`, `dto/`.

**Auth**: JWT + Passport. Guard: `AccessJwtGuard`. Refresh token stored in `Session` table. Email verification and password reset use token tables.

**Database**: PostgreSQL + Prisma ORM. Client generated to `src/generated/prisma`. Uses `@prisma/adapter-pg` for connection pooling. Key models: `User`, `Workspace`, `WorkspaceMember`, `Site`, `Page`, `Section`, `Template`, `Subscription`, `Payment`, `Plan`.

**Plans**: `PlanCode` enum — `FREE`, `BASIC`, `BUSINESS`, `PRO`. Plan features (analytics level, support tier, tracking level) are stored on the `Plan` model.

**Billing**: Stripe integration in `modules/billing/`. Webhook handler at `/api/billing/webhook`. Subscription statuses: `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`.

**Job Queue**: BullMQ. Job type definitions in `packages/shared/src/jobs.ts`. Queue prefix: `finnweb`. Worker lives in `apps/worker`.

**External Services**: Resend (email), Stripe (payments), S3-compatible storage, DeepSeek API (LLM, key `DEEPSEEK_API_KEY`).

## Multi-Tenancy

Sites are tenant-scoped. Subdomain routing is handled in `apps/web/src/middleware.ts` — it reads the subdomain, extracts the tenant slug, and rewrites to `/s/[slug]`. The `Site` model has a `slug` field used for routing. The `NEXT_PUBLIC_ROOT_DOMAIN` env var (default `finnweb.site`) controls subdomain matching.

## Environment Variables

Copy `.env.example` to `.env` in both `apps/api/` and `apps/web/`. Key vars:
- `DATABASE_URL` — PostgreSQL
- `REDIS_URL` — BullMQ job queue
- `RESEND_API_KEY` — Transactional email
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Payments
- `NEXT_PUBLIC_API_BASE_URL` — Frontend → API URL (default `http://localhost:4000/api`)
- `NEXT_PUBLIC_ROOT_DOMAIN` — Root domain for subdomain tenant routing
