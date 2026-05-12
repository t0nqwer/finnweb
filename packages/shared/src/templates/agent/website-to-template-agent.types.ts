import type { SectionType } from "../types/template-factory.types";

export type WebsiteAnimationSignal = {
  name: string;
  trigger: "load" | "scroll" | "hover" | "loop";
  target?: string;
  intensity?: "subtle" | "medium" | "strong";
  notes?: string;
};

export type WebsiteDesignTokens = {
  colors?: {
    background?: string;
    surface?: string;
    text?: string;
    mutedText?: string;
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  radius?: string;
  shadow?: string;
};

export type WebsiteAsset = {
  url: string;
  alt?: string;
  role?: "logo" | "hero" | "gallery" | "icon" | "background" | "other";
};

export type WebsiteSectionAnalysis = {
  id?: string;
  kind:
    | "navbar"
    | "hero"
    | "stats"
    | "courses"
    | "logos"
    | "categories"
    | "articles"
    | "features"
    | "about"
    | "gallery"
    | "testimonials"
    | "pricing"
    | "faq"
    | "contact"
    | "form"
    | "cta"
    | "footer"
    | "content"
    | "unknown";
  heading?: string;
  eyebrow?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  links?: Array<{ label: string; href: string }>;
  items?: Array<Record<string, unknown>>;
  imageUrl?: string;
  variant?: string;
  motion?: WebsiteAnimationSignal[];
};

export type WebsitePageAnalysis = {
  title: string;
  slug?: string;
  path?: string;
  description?: string;
  keywords?: string[];
  sections: WebsiteSectionAnalysis[];
};

export type WebsiteProfile = {
  sourceUrl: string;
  name?: string;
  description?: string;
  language?: string;
  industry?: string;
  goals?: string[];
  styleKeywords?: string[];
  assets?: WebsiteAsset[];
  designTokens?: WebsiteDesignTokens;
  animations?: WebsiteAnimationSignal[];
  pages: WebsitePageAnalysis[];
};

export type CapturedWebsiteLink = {
  label: string;
  href: string;
};

export type CapturedWebsiteImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
};

export type CapturedWebsiteForm = {
  id?: string;
  title?: string;
  action?: string;
  fields?: string[];
};

export type CapturedWebsitePage = {
  url: string;
  title?: string;
  path?: string;
  metaDescription?: string;
  headings?: string[];
  textBlocks?: string[];
  stats?: Array<{ value: string; label: string }>;
  cards?: Array<{
    title: string;
    description?: string;
    imageUrl?: string;
    eyebrow?: string;
    meta?: string;
    price?: string;
  }>;
  logos?: string[];
  faqs?: Array<{ question: string; answer?: string }>;
  links?: CapturedWebsiteLink[];
  images?: CapturedWebsiteImage[];
  forms?: CapturedWebsiteForm[];
  colorSamples?: string[];
  fontFamilies?: string[];
};

export type CapturedWebsiteSource = {
  sourceUrl: string;
  name?: string;
  language?: string;
  industry?: string;
  goals?: string[];
  styleKeywords?: string[];
  pages: CapturedWebsitePage[];
};

export type WebsiteToTemplateAgentOptions = {
  templateName?: string;
  category?: string;
  defaultLanguage?: string;
  fallbackBusinessType?: string;
  fallbackGoal?: string;
  fallbackStyle?: string;
};

export type TemplateDraftSection = {
  type: SectionType;
  name?: string;
  sortOrder?: number;
  isVisible?: boolean;
  props?: Record<string, unknown>;
};

export type TemplateDraftPage = {
  title: string;
  slug?: string;
  path?: string;
  pageType?: "LANDING" | "NORMAL" | "BLOG" | "PRODUCT";
  isHomePage?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  sections: TemplateDraftSection[];
};

export type WebsiteTemplateDraft = {
  name: string;
  slug: string;
  code: string;
  description: string;
  thumbnailUrl?: string;
  category?: string;
  businessTypes: string[];
  goals: string[];
  styles: string[];
  languages: string[];
  keywords: string[];
  pages: TemplateDraftPage[];
};

export type WebsiteToTemplateDraftResult = {
  template: WebsiteTemplateDraft;
  confidence: number;
  warnings: string[];
  source: {
    url: string;
    extractedPageCount: number;
    extractedSectionCount: number;
  };
};
