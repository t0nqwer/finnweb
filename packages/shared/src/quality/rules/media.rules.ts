// ---------------------------------------------------------------------------
// Media rules — blank image slots are the most visible kind of "not finished"
// ---------------------------------------------------------------------------

import type { QualityEmit, QualityPage } from "../page-quality.types";
import { MEDIA_KEYS, forEachString, trimmedString } from "../props";

/** Image props a blueprint ships empty for the owner to fill in. */
const MEDIA_KEY_SET = new Set<string>(MEDIA_KEYS);

const PLACEHOLDER_HOSTS = [
  "example.com",
  "placeholder.com",
  "via.placeholder.com",
  "placehold.it",
  "dummyimage.com",
  "lorempixel.com",
];

function isPlaceholderUrl(value: string): boolean {
  const url = value.trim().toLowerCase();
  if (!url) {
    return false;
  }
  return PLACEHOLDER_HOSTS.some((host) => url.includes(host));
}

/** The last path segment of a media key, e.g. items[0].imageUrl -> imageUrl */
function mediaKeyOf(propPath: string): string {
  const lastSegment = propPath.split(".").pop() ?? propPath;
  return lastSegment.replace(/\[\d+\]$/, "");
}

export function checkPageMedia(
  page: QualityPage,
  basePath: string,
  emit: QualityEmit,
): void {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  sections.forEach((section, index) => {
    if (section.isVisible === false || !section.props) {
      return;
    }

    const sectionPath = `${basePath}.sections[${index}]`;

    forEachString(section.props, (value, propPath) => {
      if (!MEDIA_KEY_SET.has(mediaKeyOf(propPath))) {
        return;
      }

      const fullPath = `${sectionPath}.props.${propPath}`;

      if (!trimmedString(value)) {
        emit({
          severity: "error",
          code: "MEDIA_IMAGE_EMPTY",
          path: fullPath,
          message: `${section.type} has an empty media slot at ${propPath}.`,
          ownerMessage: `section ${section.type} มีช่องใส่รูปที่ยังว่างอยู่ กรุณาอัปโหลดรูปหรือลบช่องนั้นออก`,
        });
        return;
      }

      if (isPlaceholderUrl(value)) {
        emit({
          severity: "error",
          code: "MEDIA_IMAGE_PLACEHOLDER",
          path: fullPath,
          message: `${section.type} still points at a placeholder image: ${value.trim()}`,
          ownerMessage: `section ${section.type} ยังใช้รูปตัวอย่างอยู่ กรุณาเปลี่ยนเป็นรูปจริงของธุรกิจ`,
        });
      }
    });

    checkAltText(section.props, sectionPath, section.type, emit);
  });
}

/**
 * Alt text serves screen readers and image search. Checked only next to a real
 * image so empty slots produce one issue, not two.
 */
function checkAltText(
  props: Record<string, unknown>,
  sectionPath: string,
  sectionType: string,
  emit: QualityEmit,
): void {
  const imageUrl = trimmedString(props.imageUrl) || trimmedString(props.image);
  if (!imageUrl) {
    return;
  }

  const alt =
    trimmedString(props.imageAlt) ||
    trimmedString(props.alt) ||
    trimmedString(props.altText);

  if (!alt) {
    emit({
      severity: "warning",
      code: "MEDIA_ALT_TEXT_MISSING",
      path: `${sectionPath}.props.imageAlt`,
      message: `${sectionType} image has no alt text.`,
      ownerMessage: `รูปใน section ${sectionType} ยังไม่มีคำอธิบายภาพ (alt) ทำให้เสียโอกาสใน Google Images และคนใช้โปรแกรมอ่านหน้าจอเข้าไม่ถึง`,
    });
  }
}
