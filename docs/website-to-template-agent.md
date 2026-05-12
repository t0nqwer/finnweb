# Website-To-Template AI Agent

FinnWeb should turn a reference website into an editable FinnWeb template by understanding the design, then rebuilding it with supported sections. Do not store a copied website as arbitrary raw HTML/JS.

## Goal

Input:

- Public URL or uploaded website folder.
- Optional business type, language, and target goal.

Output:

- Reviewable template JSON compatible with `POST /api/templates` or admin template validation.
- Theme tokens for color, typography, spacing, radius, and image style.
- Structured sections that FinnWeb can edit and render safely.
- Animation metadata that renderer components can interpret.

## Agent Pipeline

1. Capture
   - Open URL in a browser automation worker.
   - Capture desktop and mobile screenshots.
   - Extract DOM outline, headings, links, forms, images, computed colors, fonts, spacing, and visible animation hints.
   - Save source URL and asset references for review.

2. Understand
   - Ask an AI model to classify page intent, business type, visual style, and conversion goal.
   - Convert DOM regions into semantic section candidates: `NAVBAR`, `HERO`, `FEATURE`, `ABOUT`, `GALLERY`, `TESTIMONIAL`, `PRICING`, `FAQ`, `FORM`, `CTA`, `CONTACT`, `FOOTER`, or `CONTENT`.
   - Extract animation signals only as safe descriptors, for example `load reveal`, `scroll fade-up`, `hover lift`, or `loop marquee`.

3. Normalize
   - For deterministic browser/ZIP captures, first use `createWebsiteProfileFromCapture()` from `@finnweb/shared/templates`.
   - Use `createTemplateDraftFromWebsiteProfile()` from `@finnweb/shared/templates`.
   - Produce a `WebsiteTemplateDraft` with supported section types and required props.
   - Add safe fallback `NAVBAR`, `HERO`, and `FOOTER` when the source is incomplete.

4. Quality Gate
   - Run admin validation before save.
   - Reject drafts with unsupported section types, empty visible pages, missing hero title, missing navbar items, or unresolved placeholders.
   - Apply `docs/template-design-rules.md`: real content density, mobile-first Thai typography, strong first viewport, clear CTA, and no empty blocks.

5. Review
   - Use `POST /api/admin/templates/import-draft` to generate a draft from captured website JSON without writing to the database.
   - Show the generated template in the admin dashboard JSON editor with validation results.
   - Admin can edit JSON, preview pages/sections, then publish.
   - Never auto-seed imported templates into the database.

## Animation Rule

Templates can accept animation, but only as safe renderer metadata:

```json
{
  "motion": [
    {
      "name": "fade-up",
      "trigger": "scroll",
      "target": "hero-main",
      "intensity": "subtle"
    }
  ]
}
```

The renderer decides how to animate. The agent must not import arbitrary JavaScript from the source site.

## Shared Data Shape

The browser or ZIP extractor can create a plain capture payload first:

```ts
import {
  createTemplateDraftFromWebsiteProfile,
  createWebsiteProfileFromCapture
} from "@finnweb/shared/templates";

const profile = createWebsiteProfileFromCapture({
  sourceUrl: "https://example.com",
  name: "Example Brand",
  pages: [
    {
      url: "https://example.com/",
      title: "Example Brand",
      metaDescription: "High-conversion websites and campaigns.",
      headings: ["Creative Agency", "Services", "Contact"],
      links: [{ label: "Contact", href: "#contact" }],
      images: [{ url: "https://example.com/hero.jpg", width: 1600, height: 900 }],
      colorSamples: ["#1A1C23", "#FF8C00"],
      fontFamilies: ["Kanit"]
    }
  ]
});

const result = createTemplateDraftFromWebsiteProfile(profile);
```

An AI extractor can also create a richer `WebsiteProfile` directly:

```ts
import { createTemplateDraftFromWebsiteProfile } from "@finnweb/shared/templates";

const result = createTemplateDraftFromWebsiteProfile({
  sourceUrl: "https://example.com",
  name: "Example Brand",
  industry: "agency",
  goals: ["leads"],
  styleKeywords: ["bold", "animated"],
  designTokens: {
    colors: {
      background: "#111318",
      text: "#f7f5ef",
      primary: "#ff8c00"
    },
    fonts: {
      heading: "Kanit",
      body: "Kanit"
    }
  },
  pages: [
    {
      title: "Home",
      path: "/",
      sections: [
        {
          id: "hero-main",
          kind: "hero",
          heading: "Creative Agency",
          body: "High-conversion websites and campaigns.",
          ctaLabel: "Start project",
          ctaHref: "#contact",
          motion: [{ name: "fade-up", trigger: "load" }]
        }
      ]
    }
  ]
});
```

The returned `result.template` can be sent to the existing template validation and save flow.

## Admin Dry Run API

Admin tools can call `POST /api/admin/templates/import-draft` with the capture payload shape above. The response includes:

- `template`: editable `CreateTemplateDto`-compatible draft JSON.
- `validation`: the same admin validation result used before saving official templates.
- `confidence`, `warnings`, and `source`: review metadata for the importer.

The endpoint is admin-only and performs no database writes. Saving remains a separate admin review action.

## What This Enables

- Import design inspiration from high-quality sites.
- Keep output editable in FinnWeb builder.
- Preserve animation intent without unsafe code injection.
- Let admins curate templates instead of rebuilding everything by hand.
