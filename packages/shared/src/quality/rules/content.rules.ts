// ---------------------------------------------------------------------------
// Content rules — is there real copy on the page, or an unfinished shell?
// ---------------------------------------------------------------------------

import type {
  QualityEmit,
  QualityLocale,
  QualityPage,
} from "../page-quality.types";
import {
  BODY_KEYS,
  HEADLINE_KEYS,
  containsPlaceholder,
  containsThai,
  forEachObjectList,
  forEachString,
  isEmptyContentItem,
  isFillerText,
  trimmedString,
} from "../props";

/** Headlines longer than this wrap badly on mobile. */
const MAX_HEADLINE_LENGTH = 70;

/** Page fields that are published verbatim and must not carry a placeholder. */
const PAGE_TEXT_FIELDS = [
  "title",
  "slug",
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "ogImageUrl",
] as const;

export function checkPageContent(
  page: QualityPage,
  basePath: string,
  locale: QualityLocale,
  emit: QualityEmit,
): void {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const headlines = new Map<string, string>();

  for (const field of PAGE_TEXT_FIELDS) {
    const value = trimmedString(page[field]);
    if (value && containsPlaceholder(value)) {
      emit({
        severity: "error",
        code: "CONTENT_PLACEHOLDER_UNRESOLVED",
        path: `${basePath}.${field}`,
        message: `Unresolved placeholder in page ${field}: ${value}`,
        ownerMessage: `ข้อมูลหน้า (${field}) ยังมีตัวแปรที่ไม่ถูกแทนที่: ${value}`,
      });
    }
  }

  sections.forEach((section, index) => {
    if (section.isVisible === false) {
      return;
    }

    const sectionPath = `${basePath}.sections[${index}]`;

    const sectionName = trimmedString(section.name);
    if (sectionName && containsPlaceholder(sectionName)) {
      emit({
        severity: "error",
        code: "CONTENT_PLACEHOLDER_UNRESOLVED",
        path: `${sectionPath}.name`,
        message: `Unresolved placeholder in ${section.type} name: ${sectionName}`,
        ownerMessage: `ชื่อ section ${section.type} ยังมีตัวแปรที่ไม่ถูกแทนที่: ${sectionName}`,
      });
    }

    const props = section.props;
    if (!props) {
      return;
    }

    forEachString(props, (text, propPath) => {
      const fullPath = `${sectionPath}.props.${propPath}`;

      if (containsPlaceholder(text)) {
        emit({
          severity: "error",
          code: "CONTENT_PLACEHOLDER_UNRESOLVED",
          path: fullPath,
          message: `Unresolved placeholder in ${section.type}: ${text.trim()}`,
          ownerMessage: `ยังมีข้อความตัวแปรที่ยังไม่ถูกแทนที่ใน section ${section.type}: ${text.trim()}`,
        });
      }

      if (isFillerText(text)) {
        emit({
          severity: "error",
          code: "CONTENT_FILLER_TEXT",
          path: fullPath,
          message: `Filler text left in ${section.type}: ${text.trim().slice(0, 60)}`,
          ownerMessage: `ยังมีข้อความตัวอย่างค้างอยู่ใน section ${section.type} กรุณาแก้เป็นข้อความจริง`,
        });
      }
    });

    checkHeadlines(section.type, props, sectionPath, headlines, emit);
    checkEmptyItems(section.type, props, sectionPath, emit);

    if (locale === "th") {
      checkThaiCopy(section.type, props, sectionPath, emit);
    }
  });
}

function checkHeadlines(
  sectionType: string,
  props: Record<string, unknown>,
  sectionPath: string,
  headlines: Map<string, string>,
  emit: QualityEmit,
): void {
  for (const key of HEADLINE_KEYS) {
    const headline = trimmedString(props[key]);
    if (!headline) {
      continue;
    }

    if (headline.length > MAX_HEADLINE_LENGTH) {
      emit({
        severity: "warning",
        code: "CONTENT_HEADLINE_TOO_LONG",
        path: `${sectionPath}.props.${key}`,
        message: `Headline is ${headline.length} characters; keep it under ${MAX_HEADLINE_LENGTH} so it does not wrap awkwardly on mobile.`,
        ownerMessage: `หัวข้อยาว ${headline.length} ตัวอักษร ควรสั้นกว่า ${MAX_HEADLINE_LENGTH} ตัว เพื่อไม่ให้ตกบรรทัดบนมือถือ`,
      });
    }

    // Only top-level headlines participate in the duplicate check; repeated
    // labels inside card lists are legitimate.
    const normalized = headline.toLowerCase();
    const firstSeenAt = headlines.get(normalized);
    if (firstSeenAt && firstSeenAt !== sectionPath) {
      emit({
        severity: "warning",
        code: "CONTENT_HEADLINE_DUPLICATE",
        path: `${sectionPath}.props.${key}`,
        message: `Headline "${headline}" also appears in ${firstSeenAt}.`,
        ownerMessage: `หัวข้อ "${headline}" ซ้ำกับอีก section หนึ่ง ทำให้หน้าดูวนซ้ำ`,
      });
    } else if (!firstSeenAt) {
      headlines.set(normalized, sectionPath);
    }
    break;
  }
}

function checkEmptyItems(
  sectionType: string,
  props: Record<string, unknown>,
  sectionPath: string,
  emit: QualityEmit,
): void {
  forEachObjectList(props, (items, listPath) => {
    items.forEach((item, index) => {
      if (!isEmptyContentItem(item)) {
        return;
      }

      emit({
        severity: "error",
        code: "CONTENT_EMPTY_ITEM",
        path: `${sectionPath}.props.${listPath}[${index}]`,
        message: `${sectionType} contains an item with no copy and no media.`,
        ownerMessage: `section ${sectionType} มีการ์ดที่ยังว่างเปล่า (ไม่มีทั้งข้อความและรูป) กรุณาใส่เนื้อหาหรือลบออก`,
      });
    });
  });
}

/**
 * A Thai site whose visible copy has no Thai characters is almost always an
 * untranslated template rather than a deliberate choice.
 */
function checkThaiCopy(
  sectionType: string,
  props: Record<string, unknown>,
  sectionPath: string,
  emit: QualityEmit,
): void {
  const copyKeys = [...HEADLINE_KEYS, ...BODY_KEYS];
  const copy = copyKeys
    .map((key) => trimmedString(props[key]))
    .filter((text) => text.length > 0);

  if (copy.length === 0) {
    return;
  }

  const hasThai = copy.some((text) => containsThai(text));
  if (hasThai) {
    return;
  }

  // Short strings are often brand names or English CTAs ("LINE", "Facebook").
  const hasSubstantialCopy = copy.some((text) => text.length > 24);
  if (!hasSubstantialCopy) {
    return;
  }

  emit({
    severity: "warning",
    code: "CONTENT_THAI_COPY_EXPECTED",
    path: `${sectionPath}.props`,
    message: `${sectionType} has substantial copy but no Thai characters on a Thai-locale site.`,
    ownerMessage: `section ${sectionType} ยังเป็นภาษาอังกฤษทั้งหมด เว็บภาษาไทยควรใช้ข้อความไทย`,
  });
}
