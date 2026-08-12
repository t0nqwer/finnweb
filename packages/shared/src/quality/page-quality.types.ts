// ---------------------------------------------------------------------------
// Page quality — shared contract
//
// One rule catalog describing what a "finished" FinnWeb page looks like.
// Consumed by admin template validation, the publish gate, the builder panel,
// and the AI content-fill repair loop, so every surface judges pages the same
// way. Keep this module pure: no NestJS, no DOM, no network.
// ---------------------------------------------------------------------------

export type QualitySeverity = "error" | "warning";

export type QualityIssue = {
  severity: QualitySeverity;
  /** Stable machine code, e.g. CONTENT_PLACEHOLDER_UNRESOLVED */
  code: string;
  /** Path to the offending value, e.g. pages[0].sections[2].props.title */
  path: string;
  /** Developer-facing description (English) for logs and admin tooling */
  message: string;
  /** Owner-facing description (Thai) for the builder and publish dialog */
  ownerMessage: string;
};

export type QualitySection = {
  type: string;
  name?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  props?: Record<string, unknown> | null;
};

export type QualityPage = {
  title?: string | null;
  slug?: string | null;
  path?: string | null;
  pageType?: string | null;
  isHomePage?: boolean;
  isPublished?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
  sections: QualitySection[];
};

export type QualityLocale = "th" | "en";

/**
 * What is being judged.
 *
 * - `site`: a real site heading for publish. Everything the rules dislike is
 *   held to full severity — this is the "perfect" bar.
 * - `template`: a reusable stencil. Placeholders, empty media slots and missing
 *   SEO copy are expected here because create-site fills them in later, so only
 *   structural breakage blocks. Keeps template authoring from being held to a
 *   standard a stencil cannot meet.
 */
export type QualityStage = "site" | "template";

export type QualityContext = {
  /** Site theme tokens (Site.themeConfig / GeneratedTemplate.themeConfig) */
  themeConfig?: Record<string, string> | null;
  /** Drives Thai-specific typography and copy rules. Defaults to "th". */
  locale?: QualityLocale;
  /** Defaults to "site". */
  stage?: QualityStage;
};

/**
 * Codes that block even a stencil. This is exactly the set the original admin
 * template validator refused to save, so moving templates onto the shared
 * engine cannot make a previously valid template unsavable.
 */
export const TEMPLATE_BLOCKING_CODES: readonly string[] = [
  "SITE_PAGES_REQUIRED",
  "SITE_HOME_PAGE_REQUIRED",
  "PAGE_SLUG_DUPLICATE",
  "PAGE_PATH_DUPLICATE",
  "PAGE_SECTIONS_REQUIRED",
  "PAGE_VISIBLE_SECTION_REQUIRED",
  "SECTION_TYPE_INVALID",
  "SECTION_REQUIRED_FIELD_MISSING",
];

export type QualitySiteInput = QualityContext & {
  pages: QualityPage[];
};

export type QualitySummary = {
  errorCount: number;
  warningCount: number;
  pageCount: number;
  sectionCount: number;
};

export type QualityReport = {
  /** True when there are no error-severity issues. Publish requires this. */
  passed: boolean;
  /** 0–100. 100 means no issues at all — the "perfect" bar. */
  score: number;
  summary: QualitySummary;
  issues: QualityIssue[];
};

/** Emits an issue into the report being built. */
export type QualityEmit = (issue: QualityIssue) => void;

/**
 * Section types that capture a lead. A landing/home page without at least one
 * of these has nothing to feed the LINE OA lead engine, which is the product's
 * core promise — so its absence is an error, not a style warning.
 */
export const LEAD_CAPTURE_SECTION_TYPES = [
  "FORM",
  "CONTACT",
  "CTA",
  "BOOKING",
] as const;

/** Mirrors the Prisma SectionType enum / SECTION_TYPES in the API DTO. */
export const QUALITY_SECTION_TYPES = [
  "NAVBAR",
  "SIDEBAR",
  "HEADER",
  "HERO",
  "FEATURE",
  "ABOUT",
  "GALLERY",
  "TESTIMONIAL",
  "PRICING",
  "FAQ",
  "CONTACT",
  "CTA",
  "RICH_TEXT",
  "IMAGE",
  "VIDEO",
  "FORM",
  "BOOKING",
  "COMPARISON",
  "CONTENT",
  "FOOTER",
  "PRODUCT_GRID",
  "BLOG_LIST",
  "NEWS_LIST",
  "CUSTOM",
] as const;

/**
 * Minimum contrast ratio for body text (WCAG AA). Brand rule: Cloud White on
 * Deep Space passes comfortably, so failing this means the theme was edited
 * into an unreadable state.
 */
export const MIN_TEXT_CONTRAST_RATIO = 4.5;

/** Large display text (headlines) may use the WCAG AA large-text threshold. */
export const MIN_LARGE_TEXT_CONTRAST_RATIO = 3;

/** brand-book.md: Thai vowels clip below this line height. */
export const MIN_THAI_LINE_HEIGHT = 1.7;
