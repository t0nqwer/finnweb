// ---------------------------------------------------------------------------
// Section types (mirrors the Prisma SectionType enum)
// ---------------------------------------------------------------------------
export type SectionType =
  | "NAVBAR"
  | "SIDEBAR"
  | "HEADER"
  | "HERO"
  | "FEATURE"
  | "ABOUT"
  | "GALLERY"
  | "TESTIMONIAL"
  | "PRICING"
  | "FAQ"
  | "CONTACT"
  | "CTA"
  | "RICH_TEXT"
  | "IMAGE"
  | "VIDEO"
  | "FORM"
  | "BOOKING"
  | "COMPARISON"
  | "CONTENT"
  | "FOOTER"
  | "PRODUCT_GRID"
  | "BLOG_LIST"
  | "NEWS_LIST"
  | "CUSTOM";

// ---------------------------------------------------------------------------
// Blueprint — structural skeleton of a template (no content, no colors)
// ---------------------------------------------------------------------------

/**
 * A single section slot in a blueprint page.
 * `key` is used to look up content from ContentPack.
 * `propKeys` lists the props the content pack should fill.
 */
export type BlueprintSection = {
  /** Section slot identifier used when merging content */
  key: string;
  type: SectionType;
  name?: string;
  sortOrder: number;
  isVisible: boolean;
  /** Default props that will be overridden by content-pack values */
  defaultProps: Record<string, unknown>;
};

export type BlueprintPage = {
  key: string;
  title: string;
  slug: string;
  path: string;
  pageType: "LANDING" | "NORMAL" | "BLOG" | "PRODUCT";
  isHomePage: boolean;
  isPublished: boolean;
  sortOrder: number;
  sections: BlueprintSection[];
};

export type TemplateBlueprint = {
  id: string;
  /** Human-readable name for display */
  name: string;
  /** Industry tag — must match BusinessType used in frontend */
  industry: string;
  pages: BlueprintPage[];
};

// ---------------------------------------------------------------------------
// ThemePack — color, font, and visual configuration
// ---------------------------------------------------------------------------

export type ThemePack = {
  id: string;
  name: string;
  /** CSS variables / design-token map injected as themeConfig */
  tokens: Record<string, string>;
  /** Partial section prop overrides keyed by SectionType */
  sectionOverrides?: Partial<Record<SectionType, Record<string, unknown>>>;
};

// ---------------------------------------------------------------------------
// ContentPack — copy and media for a specific locale / business scenario
// ---------------------------------------------------------------------------

/**
 * Content for a single section, keyed by BlueprintSection.key.
 * These values are deep-merged over blueprint defaultProps.
 */
export type ContentPackSection = Record<string, unknown>;

export type ContentPackPage = {
  /** Matches BlueprintPage.key */
  key: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  /** Keyed by BlueprintSection.key */
  sections: Record<string, ContentPackSection>;
};

export type ContentPack = {
  id: string;
  name: string;
  locale: string;
  industry: string;
  /** Placeholder substitutions: {{businessName}}, {{phone}}, … */
  placeholders?: Record<string, string>;
  pages: ContentPackPage[];
};

// ---------------------------------------------------------------------------
// Generator input & output
// ---------------------------------------------------------------------------

export type GenerateTemplateInput = {
  industry: string;
  blueprintId: string;
  themeId: string;
  contentPackId: string;
  /** Optional seed to pick deterministic variant names/descriptions */
  variantSeed?: string;
  /** Passed to placeholder replacement */
  placeholderOverrides?: Record<string, string>;
};

/** Shape compatible with `installTemplateIntoSite` templatePages array */
export type GeneratedTemplatePage = {
  title: string;
  slug: string;
  path: string;
  pageType: string;
  isHomePage: boolean;
  isPublished: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  sections: GeneratedTemplateSection[];
};

export type GeneratedTemplateSection = {
  type: string;
  name: string | null;
  sortOrder: number;
  isVisible: boolean;
  props: Record<string, unknown>;
};

export type GeneratedTemplate = {
  id: string;
  name: string;
  industry: string;
  blueprintId: string;
  themeId: string;
  contentPackId: string;
  /** themeConfig to apply to the Site.themeConfig field */
  themeConfig: Record<string, string>;
  pages: GeneratedTemplatePage[];
};
