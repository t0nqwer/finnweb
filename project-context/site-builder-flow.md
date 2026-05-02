# FinnWeb Site Builder — Architecture Reference

> Read this before implementing any site-builder, template, or public rendering task.
> This document is the canonical reference for AI agents (Copilot, Codex, OpenHands, etc.).

---

## Product Goal

FinnWeb is a website builder for Thai SMEs. The builder must be **simple, fast, and template-first**. Target users are non-technical business owners who want a working landing page in minutes, not a Webflow-style design tool.

**Core outcome:** User answers a few questions → picks a template → FinnWeb creates the site with real content → user opens the builder to tune it.

---

## Architecture Overview

```
apps/api/         — NestJS (Fastify) backend, Prisma ORM, PostgreSQL
apps/web/         — Next.js 15 App Router frontend
packages/shared/  — TypeScript-only shared types, constants, template factory
```

### Key modules in apps/api/src/modules/

| Module              | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `sites`             | Site CRUD, page/section management, publish, public rendering |
| `templates`         | Site template library (official + user-created)               |
| `section-templates` | Section-level template picker                                 |
| `billing`           | Stripe subscriptions, plan gating                             |
| `auth`              | JWT + refresh token flow                                      |

---

## Data Model (key relationships)

```
Workspace
  └── Site (slug, themeConfig, publishedAt)
        ├── Page (slug, path, isHomePage, isPublished, sortOrder)
        │     └── Section (type, props JSON, sortOrder, isVisible)
        └── PublishLog (snapshot JSON)

Template
  ├── TemplatePage
  │     └── TemplateSection
  └── TemplateVersion (snapshot JSON — for backward compat)
```

**Section types** (Prisma enum): `NAVBAR SIDEBAR HEADER HERO FEATURE ABOUT GALLERY TESTIMONIAL PRICING FAQ CONTACT CTA RICH_TEXT IMAGE VIDEO FORM BOOKING COMPARISON CONTENT FOOTER PRODUCT_GRID BLOG_LIST NEWS_LIST CUSTOM`

---

## Create Site Flow

1. User opens `/sites/create` → `CreateSiteWizard` renders.
2. **Step 1 – Profile:** user fills `businessName`, `businessType`, `goal`, `style`, `language`, phone, LINE ID, logo URL.
3. **Step 2 – Template:** templates loaded from `GET /api/templates?scope=all`. Recommended templates sorted to top based on `businessType` + `goal` match. User can filter by type/goal/style/language/free. Search by name/description/keywords.
4. **Step 3 – Review:** confirm details, then call `POST /api/sites` with `templateId` + wizard answers.
5. Backend (`SitesService.create`) installs the template: replaces `{{placeholder}}` tokens in section props, creates `Page` and `Section` rows from template structure.
6. On success, redirect to `/sites/{siteId}/builder`.

**Do not re-seed sections from the frontend.** The backend `installTemplateIntoSite` function owns this.

---

## Template System

### What a template is

A template is a JSON-based structural skeleton — **not raw HTML**. It stores:

- One or more `TemplatePage` rows, each with ordered `TemplateSection` rows
- Each `TemplateSection` has `type` (enum), `props` (JSON), `sortOrder`, `isVisible`
- `Template.tags` stores optional `{ theme: { ...CSS token map } }`

### Placeholder syntax

Section props and page fields support `{{key}}` tokens:

```
businessName  brandName  siteName  businessType  goal  mainGoal
style  language  phone  lineId  lineUrl  logoUrl
```

These are resolved at install time by `buildTemplatePlaceholderValues` + `replaceTemplatePlaceholders`.

### Template Factory (packages/shared/src/templates/)

A composable generation system for creating new templates programmatically:

- **Blueprint** — structural skeleton (section slots with `type`, `defaultProps`)
- **ThemePack** — CSS token map + per-section style overrides
- **ContentPack** — locale-specific copy filling blueprint section props
- **`generateTemplate(input)`** — merges blueprint + theme + content pack into a `GeneratedTemplate` compatible with `installTemplateIntoSite`

To add a new template combination: create a new `ContentPack` and/or `ThemePack`; reuse existing blueprints. 4+ combinations from 1 blueprint × 2 themes × 2 content packs.

### Template API endpoints

| Method | Path                                     | Purpose                                                |
| ------ | ---------------------------------------- | ------------------------------------------------------ |
| GET    | `/api/templates?scope=official\|my\|all` | List templates                                         |
| GET    | `/api/templates/:id`                     | Get single template                                    |
| POST   | `/api/templates`                         | Create custom template (Save as template from builder) |
| PATCH  | `/api/templates/:id`                     | Update template                                        |
| POST   | `/api/sites` with `templateId`           | Create site from template                              |
| POST   | `/api/sites/:siteId/apply-template`      | Apply template to existing site (replaces draft pages) |

---

## Builder Architecture

### Frontend location

```
apps/web/src/features/builder/
  components/       — BuilderShell, canvas, left/right panels
  registry/         — section-registry.ts (type key → React component + editorSchema)
```

### Section Registry

Each entry maps a string key (e.g. `hero.splitImage`) to:

- A React render component
- An `editorSchema` array describing editable fields (text, textarea, url, image, color, select, switch)

The registry is **structured JSON only** — no raw HTML injection. Renderer reads `section.props` and passes them to the registered component.

### Autosave

Section prop edits debounce 800ms then call `PATCH /api/sites/:siteId/pages/:pageId/sections/:sectionId`. Optimistic local state, stale responses are ignored.

### Section Template Picker

Each section can switch to a same-type official section template via `PATCH .../sections/:sectionId/template`. `SectionTemplate` + `SectionTemplateVersion` are separate DB entities.

---

## Draft vs Published

**Critical rule: public sites must never read from live draft rows.**

| Layer                          | What it reads                        |
| ------------------------------ | ------------------------------------ |
| Builder (`/sites/:id/builder`) | Live `Page` + `Section` rows (draft) |
| Public site (`/s/:slug`)       | `PublishLog.snapshot` JSON only      |

**Publish flow:**

1. Validate: no `{{unresolved}}` placeholders, required section fields present.
2. Create `PublishLog` with `snapshot = { pages: [...] }` capturing full current state.
3. Public renderer resolves content from the latest `PublishLog.snapshot` — never from draft tables.

After publish, editing draft pages does not affect the live public site until a new publish.

---

## Public Rendering

### Backend endpoints

| Method | Path                                                  | Purpose                        |
| ------ | ----------------------------------------------------- | ------------------------------ |
| GET    | `/api/public/sites/by-slug/:siteSlug`                 | Get published site + home page |
| GET    | `/api/public/sites/by-slug/:siteSlug/pages/:pageSlug` | Get specific published page    |

Returns `null` if site has no published snapshot (draft-only).

### Frontend routes

```
/s/[siteSlug]              — renders published home page (SSR, generateMetadata)
/s/[siteSlug]/[pageSlug]   — renders published sub-page
```

`PublicSectionRenderer` maps section `type` to registered components. Injects `_siteId`, `_pageId`, `_sectionId` into all section props for lead capture forms.

---

## Lead Capture

`POST /api/public/sites/:siteId/forms/submit` — no auth required.

Fields: `name` (required), `phone` (required), `email` (optional), `message` (optional), `_hp` (honeypot, must be empty).

Backend upserts a deterministic public `Form` record and writes `FormSubmission`. Site owner views leads at `GET /api/sites/:siteId/leads`.

---

## MVP Scope

### Build this

- Section-based page builder (not a visual drag-drop canvas like Webflow or Elementor)
- Template-first create flow
- Structured JSON section props with schema-driven edit panel
- Draft/publish separation
- Public SSR rendering from snapshots
- Lead capture form on public pages
- Publish validation (placeholder + required field checks)

### Do NOT build in MVP

- Free-form CSS or HTML editing in the builder
- Raw HTML section template rendering (keep as non-MVP path)
- Full drag-and-drop canvas reordering (up/down controls only)
- E-commerce checkout flow (plan-gated, separate epic)
- Multi-language site versions
- Real-time collaboration
- Custom code injection (scripts, tracking pixels) — plan-gated for Pro

---

## Implementation Phases Reference

| Phase   | Focus                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------- |
| Phase 1 | Auth, workspace, Stripe billing, plan gating                                                   |
| Phase 2 | Site builder MVP: templates, create flow, builder canvas, publish, public render, lead capture |
| Phase 3 | Section template library, custom templates, Save-as-template                                   |
| Phase 4 | Analytics, LINE OA deep integration, advanced SEO, e-commerce                                  |

---

## Agent Rules

1. **Templates are JSON-based.** Never generate raw HTML into section `props` or `TemplateSection` records for MVP builder paths.
2. **Public render from snapshots only.** Never expose draft `Page`/`Section` rows through public API endpoints.
3. **Placeholder tokens, not hardcoded values.** Template section props should use `{{phone}}`, `{{businessName}}` etc. so placeholder replacement works at install time and at override time.
4. **Keep the builder simple.** Schema-driven edit panel + autosave is the target UX. Full visual editor is out of scope.
5. **Feature-scope frontend code.** Site create code → `features/site-create/`. Builder code → `features/builder/`. Public renderer → `features/site-renderer/`. Route files are thin wrappers.
6. **Plan gating lives in the API.** Frontend can hide UI elements by plan but the enforcement is on the backend `PlanGuard` / `SubscriptionService`.
7. **Thai-first UX copy.** All customer-facing text defaults to Thai (Kanit font, line-height ≥ 1.7 for Thai text blocks).
