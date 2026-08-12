# Changelog

## 2026-08-11

- Added a shared page-quality engine in `packages/shared/src/quality/` as the single source of truth for what a finished FinnWeb page looks like: structure (lead-capture path, section order, required fields), content (unresolved placeholders, filler copy, empty cards, duplicate/overlong headlines, Thai-copy expectation), media (empty image slots, placeholder hosts, alt text), SEO (title/description length, OG image), and theme (WCAG contrast, Thai line height >= 1.7, Thai-capable fonts, Controlled Flame Rule). The engine is pure — no NestJS, no DOM — so the API, worker, builder, and AI fill can all run it.
- Every issue carries both a developer `message` (English) and an owner-facing `ownerMessage` (Thai) so the same rule can serve logs and the builder UI without a second translation table.
- Introduced a quality `stage`: `site` holds a real site to the full bar, while `template` treats placeholders, empty media slots, and missing SEO copy as advisory because create-site fills them in later. `TEMPLATE_BLOCKING_CODES` pins the template-blocking set to exactly what the old validator refused, so no previously savable template became unsavable.
- Rewired `AdminTemplateValidationService` onto the shared engine, preserving its response shape (`valid` / `summary` / `issues`) and its template-only rules (matching metadata, unsafe `customCss`). Issue codes are now the shared vocabulary (e.g. `TEMPLATE_PAGES_REQUIRED` → `SITE_PAGES_REQUIRED`); the admin dashboard renders codes generically so no UI change was needed.
- Audited the shipped templates with the engine at site stage: restaurant+mala 77, restaurant+cafe 77, aesthetic-clinic 84 — none passes. Causes are real defects, not rule noise: blueprints ship `logoUrl`/`imageUrl` empty (the public renderer draws an empty gradient tile in place of the photo) and no theme defines a line-height token at all despite the brand book requiring >= 1.7 for Thai. Queued for the template pass.
- Coverage: 45 engine tests plus 5 admin validator tests, `pnpm typecheck` and `pnpm build` pass.

## 2026-05-22

- Implemented the real LINE OA lead delivery path with LINE Messaging API push support, per-form channel token usage, webhook signature verification, bot info discovery helper, and follow-event recipient capture.
- Moved LINE OA quota enforcement to send time: public form submission now still succeeds, while FREE/BASIC quota exhaustion records `LineOaDelivery.status = SKIPPED` with `LINE_OA_QUOTA_REACHED`; BUSINESS/PRO remain unlimited with `Plan.lineOaMonthlyQuota = null`.
- Migrated `/billing/plan-usage` LINE OA usage to count successful `LineOaDelivery` rows (`status = SENT`, current-month `sentAt`) instead of submission rows with a token. Owner-visible usage may decrease compared with the previous telemetry because failed/skipped/fallback deliveries are no longer counted as LINE sends.
- Added async BullMQ delivery for LINE OA leads with deterministic `jobId = line-oa-lead:{formSubmissionId}`, global queue limiter, retryable/non-retryable LINE error handling, idempotent delivery status, and fallback email after retry exhaustion.
- Added fallback email behavior for failed LINE delivery: send to `Form.notifyEmail`, then workspace owner email; if no email exists, keep delivery failed with `LINE_OA_FALLBACK_EMAIL_MISSING`. Fallback email does not count toward LINE OA quota.
- Added focused coverage for LINE sender success/errors/timeouts/rate limits, webhook signature/recipient capture, send-time quota skip, unlimited plan delivery, billing usage from `SENT`, retry success, retry exhaustion fallback, no-email failure, idempotency, and token leak checks. Verified `pnpm typecheck` and `pnpm build`; the full API glob test command still times out locally after 10 minutes, so focused API and worker subsets were used for regression signal.
- Technical debt recorded: `Form.lineOaAccessToken` is still stored plaintext at rest, and the worker currently imports API services directly for the modular-monolith worker path. Both should be revisited in a hardening/refactor task.

## 2026-05-20

- Decoupled CSS-engine and GSAP-engine motion paths in `MotionSection` to fix scroll-reveal failures verified in browser: sections with `props.motion` directives now set `data-fw-motion-engine="gsap"` and skip the CSS `fw-armed`/`is-visible` classes (GSAP owns inline opacity/visibility); sections without directives use React-managed inline `opacity:0; visibility:hidden` while armed (deterministic, independent of `@layer utilities` cascade quirks). For in-fold reveal presets the GSAP hide+tween path is skipped (content stays visible by CSS default); for below-fold sections the guarded ScrollTrigger only fires once the user has actually scrolled.
- Fixed the resize/rotate scroll-reveal regression: GSAP reveal presets now use guarded paused tweens that only play when the section is actually near the viewport, so `ScrollTrigger.refresh()` no longer reveals below-fold sections at scroll 0 while parallax/pin refresh behavior and footer bottom safety remain intact.
- Fixed the follow-up scroll-reveal regression where pinned layout refresh could reveal below-fold sections at scroll 0: `MotionSection` now waits for layout to settle before observing/revealing, keeps unrevealed sections explicitly hidden while armed, and still reveals the final footer at document bottom.
- Fixed the public motion footer regression without killing scroll reveal: removed blanket 1.2s reveal timers from `MotionSection`/GSAP safety paths, kept IntersectionObserver as the main reveal path, and limited fallback reveal to the document-bottom safety case so short final sections become visible while below-fold sections still animate on scroll.
- Upgraded public rendering foundations for premium site output: published snapshots now include `Site.themeConfig`, public APIs return the publish version, and `/s/:siteSlug` routes wrap rendered pages in scoped `fw-site-{siteId} fw-version-{version}` containers with Deep Space CSS variables.
- Fixed public motion progressive enhancement so sections are visible by default on SSR/no-JS, then arm reveal states only after the client motion engine is ready.
- Added a first-party JSON-only motion normalizer in shared code and wired public sections to lazy-load GSAP + ScrollTrigger presets with reduced-motion/no-JS fallbacks and cleanup on unmount.
- Converted default public section colors to FinnWeb token CSS variables, changed key CTA spans into real links, and added Thai fallback copy for core public sections.
- Added the Thai “คลินิกความงามพรีเมียม” showcase template factory pack with aesthetic clinic blueprint, Deep Space Premium theme, Thai content pack, real image URLs, LINE CTA, and motion directives across hero, pinned services, sticky story, gallery, testimonials, FAQ, and contact.
- Verified generator coverage, `pnpm typecheck`, and `pnpm build`.

## 2026-05-12

- Updated builder canvas preview to render imported high-design template variants through `PublicSectionRenderer`, matching admin/public preview behavior while keeping normal builder registry rendering for standard sections. Desktop builder canvas now supports a 1280px preview width.
- Fixed underfilled hero metrics after duplicate-section removal: high-design hero/metric renderers now preserve extracted stats but complete partial stat sets to four cards so the DevOnMars-style layout does not leave an empty column.
- Removed duplicate stats in high-design education imports: deterministic drafts now keep metrics inside the hero instead of also adding a separate metric strip, and the DeepSeek prompt explicitly blocks duplicating hero stats as a second section.
- Fixed remaining high-design import preview gaps: image capture now reads `srcset`, lazy image attributes, and CSS background URLs; education cards can reuse generic captured cards with images; metrics/features/cards render `value`/`label` data without blank placeholders; feature bento layout is balanced when only three cards are available.
- Upgraded URL/ZIP website-to-template import quality for high-design education sites: HTML capture now extracts richer source text plus stats, cards, logos, and FAQs; deterministic drafts map education captures to animated/high-design public section variants; DeepSeek enhancement receives the richer capture and approved variant list.
- Extended website-to-template admin import beyond JSON paste: added `POST /api/admin/templates/import-from-url` (best-effort HTML capture) and `POST /api/admin/templates/import-from-zip` (ZIP HTML/CSS/JS/asset extraction), plus admin dashboard controls for URL input and ZIP upload that generate editable template drafts with validation and no DB writes until explicit save.
- Connected optional DeepSeek API enhancement into admin template import pipeline (`import-draft`, `import-from-url`, `import-from-zip`) so drafts can be AI-polished when `DEEPSEEK_API_KEY` is configured, with deterministic fallback when unavailable.
- Added custom CSS import pipeline for template drafts: ZIP `.css` files are merged into template `customCss`, validation blocks unsafe CSS patterns, admin save persists customCss in template metadata tags, and admin live visual preview now scopes customCss under `.fw-template-preview` to prevent conflict with dashboard styles.
- Cleaned up the admin template workspace UI so URL/ZIP import is the primary path, raw capture JSON and template JSON are tucked into advanced foldouts, and the visual preview plus validation results are grouped into a clearer review panel.
- Expanded the admin template live preview into a full-width 1280px desktop canvas so imported templates can be reviewed at realistic desktop size instead of a narrow side panel.

## 2026-05-11

- Recorded the template/import-template pipeline direction: imported ZIP/URL designs become editable FinnWeb template drafts first, then user site drafts, then publish-worker artifacts with isolated CSS/assets at publish time.
- Added the worker-generated publish artifacts architecture design in `docs/publish-worker-artifacts.md`, defining artifact-first public serving, isolated per-site CSS, sanitized animation CSS, queue/storage direction, and snapshot-render fallback during migration.
- Improved public-site animation support for high-design templates: public sections now read safe `props.motion` metadata through `MotionSection`, with scroll/load reveal presets, staggered reveal, scale-in, soft-float, marquee, button feedback, and `prefers-reduced-motion` fallback.
- Added the website-to-template AI agent foundation: `docs/website-to-template-agent.md` defines the crawl, AI extraction, normalization, validation, and admin review pipeline; `@finnweb/shared/templates` now exports `WebsiteProfile` types and `createTemplateDraftFromWebsiteProfile()` for producing structured editable template drafts with safe motion metadata.
- Extended the website-to-template agent with `createWebsiteProfileFromCapture()`, allowing deterministic browser/ZIP capture payloads to become normalized `WebsiteProfile` data before admin validation and template draft creation.
- Added an admin dry-run import flow for website-to-template drafts: `POST /api/admin/templates/import-draft` returns generated template JSON with validation and no database writes, and the admin template dashboard can generate a draft from capture JSON into the existing editor.
- Deleted all existing template data from the current database without running seed: website templates, template pages/sections/versions/installs/categories, section templates, and section template versions are now empty, and existing sections no longer retain `sectionTemplateId` references.
- Disabled Prisma database seeding entirely by replacing `apps/api/prisma/seed.ts` with a no-op script. Running the seed command now performs no database writes.
- Removed the old official website template seed block from `apps/api/prisma/seed.ts` so weak-looking starter templates are no longer recreated by seed runs.
- Added seed-time archival for known legacy official template slugs (`official-sme-leadgen`, `official-clinic-booking`, `official-restaurant-reservation`, `official-real-estate-listing`, `official-agency-portfolio`) so existing seeded records stop appearing in customer template flows.

## 2026-05-10

- Added admin template management workflow for validating JSON templates, saving valid templates as official, and changing template status between usable, not used, and archived.
- Added admin edit workflow for existing templates: load template JSON into the editor, preview page/section structure, validate, and save edits as a new active template version.
- Added admin-only template validation rules covering metadata, home page structure, duplicate slugs/paths, section visibility, supported section types, and required props.
- Added platform admin role gating for the admin templates dashboard.
- Added `User.role` with `USER`/`ADMIN`, included role in safe auth user payloads and JWTs, and protected `/api/admin/templates/overview` with `PlatformAdminGuard`.
- Updated the admin templates dashboard to load from the admin-only overview endpoint and show a forbidden state for non-admin users.
- Added `ADMIN_EMAIL`/`ADMIN_EMAILS` seed support to promote existing users to platform admin.

## 2026-05-09

- Added website template design rules in `docs/template-design-rules.md`, covering public template quality bar, required anatomy, blueprint/theme/content-pack responsibilities, and visual QA checks for Thai SME sites.
- Added `packages/shared/src/templates/README.md` to document the exact files to create when turning a website design into a reusable template.

## 2026-05-06

- Completed Site Builder MVP audit: confirmed `/sites/[siteId]/builder` renders `BuilderShell`, kept builder API exports intact and added publish support, expanded builder section registry/library coverage, preserved move up/down reorder, and added a focused builder smoke checklist.
- Fixed public site frontend rendering for published `/s/:siteSlug` and `/s/:siteSlug/:pageSlug` routes by returning `PublicSectionRenderer` directly with published sections, site id, and page id.
- Simplified public section rendering so known section types render their mapped component with props and unknown section types render the safe generic fallback.
- Verified with `pnpm typecheck` and `pnpm build`.
- Aligned public lead honeypot handling with silent anti-spam behavior: `_hp` is accepted as an optional string, filled honeypot submissions return a success-shaped response without creating `FormSubmission`, and the frontend submit contract now includes `_hp`.

## 2026-05-05

- Completed the real builder section-management pass for `/sites/{siteId}/builder`: the left panel now creates sections through `POST /sites/:siteId/pages/:pageId/sections`, duplicates by creating a copied section, deletes through the section API with optimistic rollback, and keeps selection/save state synced.
- Closed `sites-service-focused-split` against its scoped acceptance: `SitesService` delegates publishing, public rendering, public lead handling, and preview tokens to focused services while keeping existing controller routes and response shapes.
- Completed plan-gating enforcement coverage with focused `SitesService` regression tests for FREE site/page/section limits and standardized error codes.
- Completed LINE OA quota enforcement for LINE-enabled public forms: `SiteLeadService` blocks exhausted FREE/BASIC monthly quotas with `LINE_OA_QUOTA_REACHED`, while BUSINESS/PRO unlimited quotas continue to accept submissions.
- Expanded regression coverage for billing usage and LINE OA quotas with focused service tests plus billing plan-usage assertions.

## 2026-04-23

- Completed `section-template-library-v11`: introduced section-template domain models (`SectionTemplate`, `SectionTemplateVersion`) and linked `Section` with `sectionTemplateId`, template version, metadata, and custom-data fallback fields for canonical slot migration.
- Added API surface for section templates and template switching: `GET /api/section-templates`, `GET /api/section-templates/:id`, and `PATCH /api/sites/:siteId/pages/:pageId/sections/:sectionId/template` (same-type guard + data-preserving canonical mapping).
- Upgraded section creation flow to support `sectionTemplateId` and seeded official section template library (all current section types + key variants) with active snapshot versions.
- Updated CMS editor (`SiteEditorSimulator`) to require template selection when adding sections and support changing section template from settings while preserving existing editable data.
- Verified with API/web typecheck, `prisma db push`, `prisma db seed`, and passing `sites.integration.test.ts` including new section-template integration cases.
- Added 10 responsive NAVBAR section layouts in section-template library (picker-ready) and updated editor preview renderer to display each layout variant on both desktop and mobile.
- Refactored section-template rendering pipeline to DB-driven version payloads by extending `SectionTemplateVersion` with `renderMode`, `htmlTemplate`, and `cssTemplate`; SAFE_HTML navbar templates now render directly from template data instead of hardcoded-only UI branches.

- Completed `website-template-system-v1`: implemented backend template module (`/api/templates` list/detail/create/update/apply), introduced template-driven site creation via `templateId` in `POST /api/sites`, and wired template install tracking (`TemplateInstall`) during site creation.
- Extended schema and validation for new section capabilities required by template library: `NAVBAR`, `SIDEBAR`, `HEADER`, `FOOTER`, `BOOKING`, `COMPARISON`, `CONTENT` plus prop validation/error codes for menu/cta/booking/comparison/source-mode patterns.
- Seeded official template library (5 templates) with multi-page/multi-section Thai-ready sample content and category metadata in Prisma seed, including active template versions/snapshots.
- Connected web create-site flow to Template Picker API (`GET /api/templates?scope=all`) and switched creation path to backend template cloning (`POST /api/sites` with `templateId`) instead of client-side section bootstrapping.
- Added “Save as template” flow from site editor to create user-owned custom templates from current site pages/sections.
- Verified rollout by running `prisma db push --accept-data-loss`, `prisma db seed`, API typecheck, web typecheck, and passing integration suites for both sites and templates modules.

- Improved `/sites/{siteId}/builder` UX for imported/high-design templates: the canvas now behaves as the primary desktop preview, shows the selected section context, scrolls selected sections into view, and keeps section/list/edit panels easier to scan.
- Added a builder-only option to `PublicSectionRenderer` so high-design scroll progress chrome is not duplicated when builder renders one section at a time.
- Fixed builder content edits for imported/high-design templates by syncing legacy editor fields such as `headline`, `body`, `featureOne`, `questions`, `quotes`, and `plans` back into the prop keys that public high-design renderers actually read.
- Rebuilt `/sites` into a current dashboard control center: edit actions now open the real builder, public links use `finnweb.site`, site cards include builder/leads/public actions, and the old `SiteEditorSimulator` path was removed.
- Added site-level theme config editing from `/sites`: users can adjust primary/accent/background/surface/text colors and font family, preview the token set, and save it through `PATCH /sites/:siteId/theme` into `Site.themeConfig`.
- Attached template identity to site theme config UX: `/sites` now receives the latest `TemplateInstall` with template/version metadata and shows the attached template and theme source beside editable theme tokens.

## 2026-05-01

- Rebuilt `/sites/create` to follow the site-builder brief: business questions first, API template picker second, review/create third, then open the builder. The flow no longer relies on client-side fallback templates or manual section seeding, and `POST /api/sites` now carries `templateId` plus business/contact placeholders for backend template replacement.
- Refactored the create-site wizard into `apps/web/src/features/site-create/` with separate step components, template normalization/matching helpers, and explicit flow types; the route page now only renders `CreateSiteWizard`.
- Changed create-site success handling to redirect to `/sites/{siteId}/builder` instead of rendering `SiteEditorSimulator`, and added a temporary builder shell route with topbar, section list, canvas, and edit panel placeholders.
- Added the first feature-based builder shell UI under `features/builder/components`, including topbar, device preview toggle, save status, mock section list, canvas preview, and edit panel for `/sites/[siteId]/builder`.
- Added the first builder section registry foundation under `features/builder/registry` and `features/builder/sections`, with registry-driven mock canvas rendering plus a safe unknown-section fallback.
- Added schema-driven section editing for the builder shell: registry entries now define typed editor fields and the right edit panel updates local section props so the canvas preview changes immediately.
- Connected `/sites/[siteId]/builder` to real authenticated page/section APIs, including page selection, loading/error states, backend section-to-registry adaptation, and local-only section prop editing.
- Added debounced builder autosave for section prop edits with optimistic preview updates, topbar save status, failed-save retry, and latest-edit-wins guards.
- Improved builder section management with synced list/canvas/edit selection, visible canvas highlight, local/API hide-show action, hidden-section placeholders, and duplicate/delete placeholders.
- Added basic builder section reorder support with up/down controls, optimistic local ordering, sort-order normalization, reorder API calls, and rollback on failure.

## 2026-05-02

- Added explicit template metadata for create-site matching: official template seeds now include `businessTypes`, `goals`, `styles`, `languages`, and `keywords` in template `tags`; the template API exposes those arrays as top-level response fields while keeping old records safe with empty arrays.
- Updated frontend template normalization and matching to read metadata first, then fall back to legacy inference for older templates; create-site sorting now prioritizes business type, goal, style, language, then free/popular templates.

## 2026-04-18

- Started canonical pricing matrix rollout requested by product direction; registered matrix in `project-context/pricing-feature-matrix.md` and aligned context files (`decisions.md`, `memory.md`, `finn_web_summary.md`) to treat 2026-04-18 package definition as official baseline.
- Completed canonical pricing matrix rollout: added task tracking entry in `tasks.json` and closed it after implementation; synced pricing copy/features across `apps/web/src/app/subscription/page.tsx`, `apps/web/src/app/subscription/checkout/page.tsx`, and `apps/web/src/app/pricing/page.tsx`; updated Prisma plan seed in `apps/api/prisma/seed.ts` to align key limits with matrix (including BASIC ecommerce = 3 products and PRO trial = 0); validated with TypeScript checks and no file-level diagnostics.
- Completed frontend plan source-of-truth consolidation: introduced shared plan catalog in `apps/web/src/lib/plan-catalog.ts` and refactored `apps/web/src/app/pricing/page.tsx`, `apps/web/src/app/subscription/page.tsx`, and `apps/web/src/app/subscription/checkout/page.tsx` to consume the same metadata source for pricing, feature lists, and plan validation fallback.
- Completed plan schema feature expansion: added new capability fields on `Plan` (`lineOaMonthlyQuota`, `supportTier`, `trackingLevel`, `analyticsLevel`) in `apps/api/prisma/schema.prisma`; updated `apps/api/prisma/seed.ts`; expanded billing API responses in `apps/api/src/modules/billing/billing.service.ts` and selection in `apps/api/src/modules/billing/billing.repository.ts`; frontend now consumes these capability fields in `apps/web/src/components/dashboard-home-content.tsx`.
- Added LINE OA monthly usage telemetry to `/billing/plan-usage` (`lineOaMonthlyUsed`, `lineOaMonthlyRemaining`, `lineOaQuotaReached`) using current-month `FormSubmission` counts from LINE OA-enabled forms, updated dashboard usage display, and documented rollout-safe deployment/validation in `project-context/line-oa-quota-rollout.md`.
- Completed `forms-schema-and-submission`: added public submit endpoint `POST /api/public/sites/:siteId/forms/submit` with payload validation for name/email/phone/message (+ optional pageId/sectionId), implemented `SitesService.submitPublicLead()` to upsert a public form and persist `FormSubmission` with site/page context plus ip/user-agent/referrer/utm metadata, and extended sites integration tests to cover success/invalid/not-published-page scenarios.

## 2026-04-17

- Completed `publish-public-render`: added unguarded public endpoint `GET /api/public/sites/page?domain={domain}&path={pathOrSlug}` via `public-sites.controller.ts`; implemented domain + path/slug resolver in `sites.service.ts` with strict `isPublished=true` filtering; returns `PUBLIC_PAGE_NOT_FOUND` (404) for draft or missing pages; public response now includes site metadata, page fields, and ordered visible sections JSON payload; API typecheck passes.
- Migrated terminology and capability keys across backend/frontend/docs from LINE Notify to LINE OA, including Prisma fields `lineOaMonthlyQuota` and `lineOaAccessToken`.
- Ran database sync and seed on dev (`prisma db push`, `prisma db seed`) after LINE OA rename to keep schema/data consistent.
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
- Improved SAFE_HTML template scalability in CMS preview: replaced large global navbar CSS dependency with runtime style registry (per-page used-template CSS injection + dedupe by style key/hash), keeping DB-driven HTML/CSS templates while preventing `globals.css` growth as template count scales.
- Started builder rework based on `finnweb-site-builder-flow-ai-brief.md`: disabled SAFE_HTML rendering path in editor preview so builder uses structured section renderer path only (JSON/registry direction), while keeping DB HTML fields for backward compatibility.
- Reworked builder architecture toward brief-compliant structure: extracted section registry and editor schema from `site-editor-simulator` into `features/builder/registry` and `features/builder/editor-schemas` modules.
- Added publish endpoint `POST /api/sites/:siteId/publish` that validates base publish conditions and creates versioned `PublishLog` snapshots; site status now updates to `PUBLISHED` with publish timestamp.
- Switched public page resolution (`GET /api/public/sites/page`) to read from latest publish snapshot instead of draft page/section tables (snapshot-only public render path).
- Updated builder shell UX with clearer three-pane desktop layout by adding dedicated right-side edit panel while keeping existing left controls and canvas interactions.
- Extended Prisma schema for publishing flow with `Site.publishedVersion` and `PreviewToken` model to support snapshot/versioned public workflows.
