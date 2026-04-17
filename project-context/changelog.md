# Changelog

## 2026-04-17

- Completed `publish-public-render`: added unguarded public endpoint `GET /api/public/sites/page?domain={domain}&path={pathOrSlug}` via `public-sites.controller.ts`; implemented domain + path/slug resolver in `sites.service.ts` with strict `isPublished=true` filtering; returns `PUBLIC_PAGE_NOT_FOUND` (404) for draft or missing pages; public response now includes site metadata, page fields, and ordered visible sections JSON payload; API typecheck passes.
- Completed `billing-failure-and-cancel-path`: implemented subscription reactivation via POST /billing/reactivate to reverse cancel_at_period_end flag before period ends (allows users to undo cancellation); enhanced GET /billing/subscription endpoint to return cancelAtPeriodEnd and latestPaymentStatus so UI can display "Payment failed" status and recovery options; verified handleInvoicePaymentFailed webhook handler (invoice.payment_failed → PAST_DUE subscription status) working correctly; confirmed fallback to FREE plan on subscription deletion (handleSubscriptionDeleted); reactivateSubscription includes pre-flight checks (workspace access, active paid subscription, subscription marked for cancellation) with appropriate error codes; typechecks successfully.
- Completed `billing-checkout-success-path`: full Stripe checkout to active subscription flow verified; checkout session creation (POST /billing/checkout-session), webhook processing for subscription upsert (customer.subscription.created/updated), and current subscription tracking (isCurrent flag) all implemented; added GET /billing/subscription endpoint to expose current plan details (code, name, status, billing interval, period dates) to dashboard; typechecks successfully.
- Completed `auth-rate-limit-and-abuse-guard`: implemented Redis-based rate limiting for login (10 attempts/15min per IP) and password reset endpoints (5 attempts/40min per email); added RateLimitGuard with decorators (@RateLimitLogin, @RateLimitForgotPassword, @RateLimitResetPassword); ensured error responses don't leak sensitive information; created AUTH_ERROR_CODES constant with Thai translations.
- Completed `pricing-tier-positioning`: locked Business tier (490 บาท/month, 3 websites) as primary monetization lever for Thai SME launch with "แนะนำ" (Recommended) positioning; documented tier strategy in `decisions.md` (Free = acquisition funnel, Business = core value, Pro = advanced); verified marketing copy alignment across landing and pricing pages.
- Completed `pricing-consistency-audit`: fixed landing tier naming mismatches (Business/Pro), removed `Ultimate` naming, confirmed Stripe tier mapping (BASIC/BUSINESS/PRO), and aligned FREE seed description.
- Expanded `project-context/tasks.json` to match the roadmap in `project-context/tasks-notion-kanban.csv`, preserving richer completed-task state and progress notes where JSON had newer information.
- Updated `project-context/tasks-notion-kanban.csv` to reflect the completed auth hardening task and added a `progressNotes` column so the CSV can carry the same task detail level as JSON.
- Aligned project pricing documentation to the implemented plan tiers: Free / Basic / Business / Pro.
- Updated pricing references in product brief, decisions, and project summary files.
- Implemented centralized frontend token refresh retry flow in web API client and migrated protected pages to use it.
- Added web integration test coverage for 401 -> refresh -> retry success path (`apps/web/src/lib/api-client.test.ts`).
- Replaced auth verification/reset URL console logs with Resend-backed email service wiring in API auth module.
- Added API auth integration coverage for register, login, refresh, logout, and password reset flows in `apps/api/src/modules/auth/auth.integration.test.ts`.
- Extended API auth integration coverage with verify-email flow (send verification email, verify token, and assert `emailVerified=true`) in `apps/api/src/modules/auth/auth.integration.test.ts`.
- Fixed auth refresh token rotation to always produce a new token by adding a unique JWT identifier (`jti`).
- Aligned auth controller non-create POST endpoints with documented `200` responses for forgot/reset/verify/change-password flows.
- Added GitHub Actions workflow for API auth CI in `.github/workflows/api-auth.yml` (Postgres service, Prisma generate/db push/seed, focused auth suite, and API typecheck).
- Confirmed green CI run for API auth workflow and green local API package typecheck.
- Fixed billing webhook Stripe typing issues in `apps/api/src/modules/billing/billing-webhook.service.ts` to restore package-wide type safety.
