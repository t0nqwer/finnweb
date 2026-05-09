# Website Template Design Rules

FinnWeb templates must feel ready for a real Thai SME, not like a blank wireframe with colors attached. A template is acceptable only when it has clear hierarchy, real-looking content density, mobile-first spacing, and enough visual evidence that the business exists.

## Source Of Truth

- Brand rules: `project-context/brand-book.md`
- Template factory code: `packages/shared/src/templates/`
- Public rendering: published snapshot sections only
- MVP renderer preference: structured section props, not raw HTML as the primary path

## Design Quality Bar

Every public website template must pass these rules before it becomes official:

1. The first viewport must clearly show the business type, offer, main CTA, and a real visual anchor.
2. Do not ship empty-looking hero media. Use a real image URL, generated image asset, or deliberate fallback treatment.
3. Avoid huge dark areas with low-contrast text. Deep Space is allowed, but content must remain readable.
4. Use Kanit for Thai copy and keep Thai-heavy text at `line-height >= 1.7`.
5. Body text must not exceed 65-75 characters per line on desktop.
6. Mobile layout is the default design. Desktop is an expansion, not the starting point.
7. Buttons use clear action copy such as "Contact on LINE", "Book now", or "View services".
8. Cards need meaningful content. Never render repeated empty cards with only icons.
9. Each section needs a role: trust, offer, proof, conversion, location, or navigation.
10. Use color with intent: one primary accent, one support color, tinted neutrals. Do not make every section the same tone.
11. No nested cards, glass effects as default, gradient text, or generic repeated icon-card grids.
12. Footer must include business name, contact path, and at least one trust or ownership signal.

## Required Template Anatomy

A good landing template should normally include:

1. `NAVBAR`: logo/business name, short menu, strong CTA.
2. `HERO`: headline, subheadline, CTA, visual anchor, trust cue.
3. `FEATURE` or `ABOUT`: why this business is worth choosing.
4. `GALLERY`, `PRODUCT_GRID`, or `CONTENT`: tangible proof of product/service.
5. `TESTIMONIAL`, `COMPARISON`, or `FAQ`: confidence builder.
6. `CONTACT`, `FORM`, `BOOKING`, or `LINE OA CTA`: conversion point.
7. `FOOTER`: simple close, contact, legal/basic links when needed.

## Template File Model

When creating a new website template, create or update these files:

| Purpose | File location | What belongs there |
| --- | --- | --- |
| Structure | `packages/shared/src/templates/blueprints/<industry>-<shape>.blueprint.ts` | Pages, section order, section types, default prop keys, placeholder tokens |
| Visual style | `packages/shared/src/templates/themes/index.ts` or a split theme file later | Color tokens, font tokens, radius, section visual overrides |
| Real content | `packages/shared/src/templates/content-packs/<business-scenario>-th.content-pack.ts` | Thai copy, SEO text, realistic items, image URLs, testimonials, contact defaults |
| Type support | `packages/shared/src/templates/types/template-factory.types.ts` | Only when a new template capability needs a new type |
| Exports | `packages/shared/src/templates/index.ts` and local registry indexes | Make the new blueprint/theme/content pack available to the generator |
| Tests | `packages/shared/src/templates/generator/generate-template.test.ts` | Verify placeholders resolve and generated sections are complete |

Keep these responsibilities separate. Do not put final copy into the blueprint, do not put layout structure into the content pack, and do not hard-code one-off colors inside section props when they belong in a theme.

## Blueprint Rules

- A blueprint is a skeleton, not a finished design.
- Use stable section keys such as `navbar`, `hero`, `services`, `proof`, `contact`, and `footer`.
- Keep `sortOrder` sequential and deterministic.
- Use placeholders for business-specific values: `{{businessName}}`, `{{phone}}`, `{{lineId}}`, `{{logoUrl}}`, `{{businessType}}`.
- Default props should be complete enough to render safely, but content packs should make them feel real.
- Do not add sections unsupported by the public renderer unless a safe fallback is acceptable.

## Theme Rules

- Theme tokens must include background, surface, primary, muted text, border, font, card radius, and button radius.
- Use FinnWeb brand defaults when the business does not demand a different mood:
  - Primary: `#FF8C00`
  - Highlight: `#FFD700`
  - Dark background: `#1A1C23`
  - Surface: `#2D2F39`
  - Text: `#F9FAFB`
  - Muted: `#9CA3AF`
- Do not use pure `#000000` or `#FFFFFF`; use tinted neutrals.
- Section overrides should improve hierarchy, not fight the content.
- One template should not rely on a single flat background from top to bottom. Alternate section rhythm with background, spacing, or media composition.

## Content Pack Rules

- Content packs make the template believable. They must include real-sounding Thai SME copy, not placeholder filler.
- Hero title and subtitle should state the offer directly.
- Feature items need title plus body text. Empty icon-only cards fail QA.
- Testimonials should include believable names or roles when the industry expects trust.
- Contact sections must include at least one actionable channel: phone, LINE ID, form, booking, or map.
- SEO title and description should be filled for every public page.

## Visual QA Checklist

Before marking a template ready:

1. Generate it with at least one theme and one content pack.
2. Publish or render it through the public route.
3. Check desktop width around 1440px.
4. Check mobile width around 390px.
5. Confirm there are no empty cards, invisible text, oversized blank media boxes, or CTA buttons without context.
6. Confirm Thai text is not clipped and does not overlap.
7. Confirm the first viewport feels like a real business page within 3 seconds.

## Minimum Acceptance For Official Templates

- All placeholders are resolved.
- All visible sections contain meaningful content.
- There is at least one conversion path above the fold or immediately after it.
- The template works without horizontal scrolling on mobile.
- Public rendering looks intentional before any user editing.
