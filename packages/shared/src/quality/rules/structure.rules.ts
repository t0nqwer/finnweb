// ---------------------------------------------------------------------------
// Structure rules — is this a coherent page/site skeleton at all?
// ---------------------------------------------------------------------------

import {
  LEAD_CAPTURE_SECTION_TYPES,
  QUALITY_SECTION_TYPES,
  type QualityEmit,
  type QualityPage,
  type QualitySection,
} from "../page-quality.types";
import { isPlainObject, trimmedString } from "../props";

const SECTION_TYPE_SET = new Set<string>(QUALITY_SECTION_TYPES);
const LEAD_CAPTURE_SET = new Set<string>(LEAD_CAPTURE_SECTION_TYPES);

/** Page types that must be able to convert a visitor into a lead. */
const CONVERSION_PAGE_TYPES = new Set(["LANDING"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolvePageIdentity(page: QualityPage): {
  slug: string;
  path: string;
} {
  const slug = trimmedString(page.slug) || slugify(trimmedString(page.title));
  const path = page.isHomePage ? "/" : trimmedString(page.path) || `/${slug}`;
  return { slug, path };
}

/** Rules that only make sense across the whole site. */
export function checkSiteStructure(
  pages: QualityPage[],
  emit: QualityEmit,
): void {
  if (pages.length === 0) {
    emit({
      severity: "error",
      code: "SITE_PAGES_REQUIRED",
      path: "pages",
      message: "A site must include at least one page.",
      ownerMessage: "เว็บไซต์ต้องมีอย่างน้อย 1 หน้า",
    });
    return;
  }

  const homePages = pages.filter((page, index) =>
    Boolean(page.isHomePage ?? index === 0),
  );

  if (homePages.length !== 1) {
    emit({
      severity: "error",
      code: "SITE_HOME_PAGE_REQUIRED",
      path: "pages",
      message: `A site must have exactly one home page (found ${homePages.length}).`,
      ownerMessage: `เว็บไซต์ต้องมีหน้าแรกเพียงหน้าเดียว (ตอนนี้พบ ${homePages.length} หน้า)`,
    });
  }

  const seenSlugs = new Set<string>();
  const seenPaths = new Set<string>();

  pages.forEach((page, index) => {
    const { slug, path } = resolvePageIdentity(page);

    if (seenSlugs.has(slug)) {
      emit({
        severity: "error",
        code: "PAGE_SLUG_DUPLICATE",
        path: `pages[${index}].slug`,
        message: `Duplicate page slug: ${slug}`,
        ownerMessage: `slug ของหน้าซ้ำกัน: ${slug}`,
      });
    }
    seenSlugs.add(slug);

    if (seenPaths.has(path)) {
      emit({
        severity: "error",
        code: "PAGE_PATH_DUPLICATE",
        path: `pages[${index}].path`,
        message: `Duplicate page path: ${path}`,
        ownerMessage: `path ของหน้าซ้ำกัน: ${path}`,
      });
    }
    seenPaths.add(path);
  });
}

/** Rules scoped to a single page and its section list. */
export function checkPageStructure(
  page: QualityPage,
  basePath: string,
  emit: QualityEmit,
): void {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  if (sections.length === 0) {
    emit({
      severity: "error",
      code: "PAGE_SECTIONS_REQUIRED",
      path: `${basePath}.sections`,
      message: "Every page must include at least one section.",
      ownerMessage: "ทุกหน้าต้องมีอย่างน้อย 1 section",
    });
    return;
  }

  const visibleSections = sections.filter(
    (section) => section.isVisible !== false,
  );

  if (visibleSections.length === 0) {
    emit({
      severity: "error",
      code: "PAGE_VISIBLE_SECTION_REQUIRED",
      path: `${basePath}.sections`,
      message: "Every page must include at least one visible section.",
      ownerMessage: "ทุกหน้าต้องมี section ที่แสดงผลอย่างน้อย 1 อัน",
    });
  }

  checkSectionTypes(sections, basePath, emit);
  checkSectionOrder(visibleSections, basePath, emit);
  checkConversionPath(page, visibleSections, basePath, emit);
  checkHeroPresence(page, visibleSections, basePath, emit);
}

function checkSectionTypes(
  sections: QualitySection[],
  basePath: string,
  emit: QualityEmit,
): void {
  sections.forEach((section, index) => {
    const sectionPath = `${basePath}.sections[${index}]`;

    if (!SECTION_TYPE_SET.has(section.type)) {
      emit({
        severity: "error",
        code: "SECTION_TYPE_INVALID",
        path: `${sectionPath}.type`,
        message: `${section.type} is not a supported section type.`,
        ownerMessage: `ไม่รองรับ section ชนิด ${section.type}`,
      });
      return;
    }

    if (section.isVisible === false) {
      return;
    }

    const missingField = findMissingRequiredField(section.type, section.props);
    if (missingField) {
      emit({
        severity: "error",
        code: "SECTION_REQUIRED_FIELD_MISSING",
        path: `${sectionPath}.props.${missingField}`,
        message: `${section.type} section is missing ${missingField}.`,
        ownerMessage: `section ${section.type} ยังไม่ได้กรอก ${missingField}`,
      });
    }
  });
}

function checkSectionOrder(
  visibleSections: QualitySection[],
  basePath: string,
  emit: QualityEmit,
): void {
  const ordered = [...visibleSections].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const navbarIndex = ordered.findIndex((section) => section.type === "NAVBAR");
  if (navbarIndex > 0) {
    emit({
      severity: "warning",
      code: "SECTION_NAVBAR_NOT_FIRST",
      path: `${basePath}.sections`,
      message: "NAVBAR should be the first visible section.",
      ownerMessage: "แถบเมนู (NAVBAR) ควรอยู่บนสุดของหน้า",
    });
  }

  const footerIndex = ordered.findIndex((section) => section.type === "FOOTER");
  if (footerIndex >= 0 && footerIndex !== ordered.length - 1) {
    emit({
      severity: "warning",
      code: "SECTION_FOOTER_NOT_LAST",
      path: `${basePath}.sections`,
      message: "FOOTER should be the last visible section.",
      ownerMessage: "ส่วนท้ายเว็บ (FOOTER) ควรอยู่ล่างสุดของหน้า",
    });
  }
}

/**
 * The product promise is "beautiful site → lead lands in LINE". A landing or
 * home page with no way to capture a lead breaks that funnel, so this is an
 * error rather than a suggestion.
 */
function checkConversionPath(
  page: QualityPage,
  visibleSections: QualitySection[],
  basePath: string,
  emit: QualityEmit,
): void {
  const needsConversion =
    Boolean(page.isHomePage) ||
    CONVERSION_PAGE_TYPES.has(trimmedString(page.pageType).toUpperCase());

  if (!needsConversion) {
    return;
  }

  const hasLeadCapture = visibleSections.some((section) =>
    LEAD_CAPTURE_SET.has(section.type),
  );

  if (!hasLeadCapture) {
    emit({
      severity: "error",
      code: "PAGE_LEAD_CAPTURE_MISSING",
      path: `${basePath}.sections`,
      message:
        "A landing or home page must include a lead-capture section (FORM, CONTACT, CTA, or BOOKING).",
      ownerMessage:
        "หน้าแรก/หน้า Landing ต้องมีช่องทางเก็บ lead อย่างน้อย 1 อัน (ฟอร์ม, ติดต่อ, CTA หรือจองคิว) ไม่งั้นลูกค้าที่สนใจจะติดต่อกลับไม่ได้",
    });
  }
}

function checkHeroPresence(
  page: QualityPage,
  visibleSections: QualitySection[],
  basePath: string,
  emit: QualityEmit,
): void {
  if (!page.isHomePage) {
    return;
  }

  const hasHero = visibleSections.some(
    (section) => section.type === "HERO" || section.type === "HEADER",
  );

  if (!hasHero) {
    emit({
      severity: "warning",
      code: "PAGE_HERO_RECOMMENDED",
      path: `${basePath}.sections`,
      message: "A home page usually opens with a HERO section.",
      ownerMessage: "หน้าแรกควรเปิดด้วย section HERO เพื่อบอกว่าธุรกิจคุณคืออะไร",
    });
  }
}

/**
 * Fields a section cannot render meaningfully without. Mirrors the original
 * admin template validator so template rules and page rules stay identical.
 */
export function findMissingRequiredField(
  sectionType: string,
  props: unknown,
): string | null {
  if (!isPlainObject(props)) {
    return "props";
  }

  switch (sectionType) {
    case "HERO":
    case "CTA":
    case "FORM":
    case "CONTACT":
    case "BOOKING":
      return trimmedString(props.title) ? null : "title";
    case "NAVBAR": {
      const menuItems = props.menuItems;
      return Array.isArray(menuItems) && menuItems.length > 0
        ? null
        : "menuItems";
    }
    case "COMPARISON": {
      const plans = props.plans;
      return Array.isArray(plans) && plans.length > 0 ? null : "plans";
    }
    default:
      return null;
  }
}
