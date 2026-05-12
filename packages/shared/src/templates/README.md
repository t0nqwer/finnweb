# Template Factory Guide

Use this folder when turning a website design into a reusable FinnWeb template.

## What To Create

For a new reusable website template, usually create three files and update two indexes:

1. `blueprints/<industry>-<shape>.blueprint.ts`
   - Defines the page structure.
   - Owns page order, section order, section type, section key, and safe default props.
   - Uses placeholder tokens for business-specific values.

2. `content-packs/<scenario>-th.content-pack.ts`
   - Defines Thai copy and realistic business data.
   - Owns hero copy, service items, testimonials, gallery items, SEO text, and contact defaults.
   - Makes the template feel like an actual SME website.

3. `themes/<theme-name>.theme.ts` or `themes/index.ts`
   - Defines design tokens and broad visual overrides.
   - Owns colors, font tokens, border colors, radius, and section-level style defaults.

4. Update registry exports:
   - Export new blueprints from the blueprint registry.
   - Export new content packs from `content-packs/index.ts`.
   - Export new themes from the theme registry.
   - Ensure `templates/index.ts` exposes the generator and registry helpers.

5. Update tests:
   - Add generator tests in `generator/generate-template.test.ts`.
   - Verify placeholder replacement, generated section count, SEO fields, and no empty critical arrays.

## Responsibility Split

| Layer | Owns | Must not own |
| --- | --- | --- |
| Blueprint | Structure and section slots | Final business copy, one-off colors |
| Theme | Visual tokens and broad style | Business-specific wording |
| Content pack | Copy, media, SEO, realistic data | Page architecture |
| Generator | Merge and placeholder resolution | Design decisions |

## Design Quality Gate

Before a template becomes official, check `docs/template-design-rules.md`.

A generated site must not look like a blank page with blocks. It needs clear first-viewport hierarchy, real content in each visible section, mobile-safe Thai typography, and a strong conversion path.

## AI Website Import Agent

For turning an existing website into a template, use the agent flow in `docs/website-to-template-agent.md`.

The shared package exposes `createTemplateDraftFromWebsiteProfile()`, which converts an extracted `WebsiteProfile` into a reviewable FinnWeb template draft. The extractor may use browser screenshots, DOM analysis, and AI reasoning, but the saved output must stay structured: pages, supported section types, editable props, design tokens, and safe motion metadata. Do not import arbitrary source-site JavaScript or seed imported templates directly into the database.
