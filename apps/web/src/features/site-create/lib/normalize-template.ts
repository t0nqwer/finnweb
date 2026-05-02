import type {
  ApiTemplateRecord,
  BusinessType,
  MainGoal,
  SiteLanguage,
  SiteStyle,
  SiteTemplate,
} from "../types/create-site.types";

export const DEFAULT_TEMPLATE_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200";

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: "ร้านอาหาร / คาเฟ่",
  service: "ธุรกิจบริการ",
  clinic: "คลินิก / ความงาม",
  fashion: "แฟชั่น / แบรนด์",
  product: "Product Landing",
};

const BUSINESS_TYPES: BusinessType[] = [
  "restaurant",
  "service",
  "clinic",
  "fashion",
  "product",
];
const GOALS: MainGoal[] = ["leads", "sales", "store", "booking"];
const STYLES: SiteStyle[] = ["modern", "luxury", "minimal", "fun"];
const LANGUAGES: SiteLanguage[] = ["thai", "english", "thai-english"];

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function normalizeKnownArray<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): T[] {
  const allowed = new Set<string>(allowedValues);

  return normalizeStringArray(value).filter((item): item is T =>
    allowed.has(item),
  );
}

function inferBusinessType(template: ApiTemplateRecord): BusinessType {
  const raw =
    `${template.category?.slug ?? ""} ${template.category?.name ?? ""} ${template.slug} ${template.name}`.toLowerCase();

  if (
    raw.includes("restaurant") ||
    raw.includes("food") ||
    raw.includes("cafe")
  ) {
    return "restaurant";
  }
  if (raw.includes("clinic") || raw.includes("beauty") || raw.includes("spa")) {
    return "clinic";
  }
  if (raw.includes("fashion") || raw.includes("brand")) {
    return "fashion";
  }
  if (
    raw.includes("product") ||
    raw.includes("landing") ||
    raw.includes("shop")
  ) {
    return "product";
  }

  return "service";
}

function inferGoals(template: ApiTemplateRecord): MainGoal[] {
  const sectionTypes = template.pages
    .flatMap((page) => page.sections.map((section) => section.type))
    .join(" ")
    .toLowerCase();
  const raw = `${template.slug} ${template.name} ${sectionTypes}`.toLowerCase();
  const goals = new Set<MainGoal>();

  if (raw.includes("booking") || raw.includes("appointment")) {
    goals.add("booking");
  }
  if (
    raw.includes("product") ||
    raw.includes("pricing") ||
    raw.includes("offer")
  ) {
    goals.add("sales");
  }
  if (
    raw.includes("location") ||
    raw.includes("gallery") ||
    raw.includes("menu")
  ) {
    goals.add("store");
  }
  if (
    raw.includes("form") ||
    raw.includes("contact") ||
    raw.includes("cta") ||
    raw.includes("line")
  ) {
    goals.add("leads");
  }

  return goals.size > 0 ? [...goals] : ["leads", "store"];
}

function inferStyles(template: ApiTemplateRecord): SiteStyle[] {
  const raw =
    `${template.category?.slug ?? ""} ${template.category?.name ?? ""} ${template.slug} ${template.name} ${template.description ?? ""}`.toLowerCase();

  if (raw.includes("luxury") || raw.includes("gold") || raw.includes("fine")) {
    return ["luxury"];
  }
  if (raw.includes("minimal") || raw.includes("clinic")) {
    return ["minimal", "modern"];
  }
  if (raw.includes("fun") || raw.includes("cafe") || raw.includes("fashion")) {
    return ["fun", "modern"];
  }

  return ["modern"];
}

function inferLanguages(template: ApiTemplateRecord): SiteLanguage[] {
  const raw = `${template.slug} ${template.name} ${template.description ?? ""}`;
  const hasThai = /[\u0E00-\u0E7F]/.test(raw);
  const hasLatin = /[a-zA-Z]/.test(raw);

  if (hasThai && hasLatin) {
    return ["thai", "thai-english"];
  }

  if (hasLatin) {
    return ["english", "thai-english"];
  }

  return ["thai"];
}

function inferKeywords(template: ApiTemplateRecord): string[] {
  const raw =
    `${template.category?.slug ?? ""} ${template.category?.name ?? ""} ${template.slug} ${template.name}`.toLowerCase();

  return Array.from(
    new Set(
      raw
        .split(/[^a-z0-9ก-๙]+/i)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length >= 2),
    ),
  ).slice(0, 12);
}

export function normalizeTemplate(
  apiTemplate: ApiTemplateRecord,
): SiteTemplate {
  const pages = [...apiTemplate.pages].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const businessTypes =
    normalizeKnownArray(apiTemplate.businessTypes, BUSINESS_TYPES).length > 0
      ? normalizeKnownArray(apiTemplate.businessTypes, BUSINESS_TYPES)
      : [inferBusinessType(apiTemplate)];
  const goals =
    normalizeKnownArray(apiTemplate.goals, GOALS).length > 0
      ? normalizeKnownArray(apiTemplate.goals, GOALS)
      : inferGoals(apiTemplate);
  const styles =
    normalizeKnownArray(apiTemplate.styles, STYLES).length > 0
      ? normalizeKnownArray(apiTemplate.styles, STYLES)
      : inferStyles(apiTemplate);
  const languages =
    normalizeKnownArray(apiTemplate.languages, LANGUAGES).length > 0
      ? normalizeKnownArray(apiTemplate.languages, LANGUAGES)
      : inferLanguages(apiTemplate);
  const keywords =
    normalizeStringArray(apiTemplate.keywords).length > 0
      ? normalizeStringArray(apiTemplate.keywords)
      : inferKeywords(apiTemplate);
  const businessType = businessTypes[0] ?? inferBusinessType(apiTemplate);

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    description:
      apiTemplate.description?.trim() ||
      "เทมเพลตแบบ section-based พร้อมหน้าและคอนเทนต์เริ่มต้น",
    thumbnailUrl: apiTemplate.thumbnailUrl || DEFAULT_TEMPLATE_IMAGE,
    categoryLabel:
      apiTemplate.category?.name || BUSINESS_TYPE_LABELS[businessType],
    categorySlug: apiTemplate.category?.slug ?? businessType,
    businessType,
    businessTypes,
    matchedGoals: goals,
    goals,
    styles,
    languages,
    keywords,
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      isHomePage: Boolean(page.isHomePage),
      sectionTypes: [...page.sections]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((section) => section.type),
    })),
    sectionCount: pages.reduce((total, page) => total + page.sections.length, 0),
    isOfficial: Boolean(apiTemplate.isOfficial),
    isFree: apiTemplate.isFree ?? true,
    installCount: apiTemplate.installCount ?? 0,
    ratingAvg: apiTemplate.ratingAvg ?? null,
    ratingCount: apiTemplate.ratingCount ?? 0,
    sortOrder: apiTemplate.sortOrder ?? 999,
  };
}
