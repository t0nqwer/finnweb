// ---------------------------------------------------------------------------
// Theme rules — brand tokens, Thai typography, and readable contrast
//
// Encodes brand-book.md and DESIGN.md so the same constraints apply whether a
// theme came from a template, an AI fill, or a hand edit in the builder.
// ---------------------------------------------------------------------------

import {
  MIN_LARGE_TEXT_CONTRAST_RATIO,
  MIN_TEXT_CONTRAST_RATIO,
  MIN_THAI_LINE_HEIGHT,
  type QualityEmit,
  type QualityLocale,
  type QualityPage,
} from "../page-quality.types";
import { contrastRatio, isFlameColor } from "../color";
import { trimmedString } from "../props";

/** Token pairs that must stay readable, as (foreground, background, label). */
const THEME_CONTRAST_PAIRS: Array<{
  foreground: string;
  background: string;
  label: string;
  minRatio: number;
}> = [
  {
    foreground: "--color-text-base",
    background: "--color-background",
    label: "body text on the page background",
    minRatio: MIN_TEXT_CONTRAST_RATIO,
  },
  {
    foreground: "--color-text-base",
    background: "--color-surface",
    label: "body text on cards",
    minRatio: MIN_TEXT_CONTRAST_RATIO,
  },
  {
    foreground: "--color-text-muted",
    background: "--color-background",
    label: "secondary text on the page background",
    minRatio: MIN_LARGE_TEXT_CONTRAST_RATIO,
  },
];

const LINE_HEIGHT_TOKEN_KEYS = ["--line-height-base", "--line-height-body"];

/** Primary-action props — the only place Ignite Orange belongs. */
const PRIMARY_ACTION_COLOR_KEYS = new Set([
  "accentColor",
  "buttonColor",
  "primaryColor",
  "ctaColor",
]);

export function checkThemeConfig(
  themeConfig: Record<string, string> | null | undefined,
  locale: QualityLocale,
  emit: QualityEmit,
): void {
  if (!themeConfig) {
    return;
  }

  for (const pair of THEME_CONTRAST_PAIRS) {
    const foreground = trimmedString(themeConfig[pair.foreground]);
    const background = trimmedString(themeConfig[pair.background]);
    if (!foreground || !background) {
      continue;
    }

    const ratio = contrastRatio(foreground, background);
    if (ratio === null || ratio >= pair.minRatio) {
      continue;
    }

    emit({
      severity: "error",
      code: "THEME_CONTRAST_INSUFFICIENT",
      path: `themeConfig.${pair.foreground}`,
      message: `Contrast for ${pair.label} is ${ratio}:1, below the ${pair.minRatio}:1 minimum (${foreground} on ${background}).`,
      ownerMessage: `สีตัวอักษรกับพื้นหลังตัดกันน้อยเกินไป (${ratio}:1 ต้องได้อย่างน้อย ${pair.minRatio}:1) ผู้เข้าชมจะอ่านไม่ออก`,
    });
  }

  if (locale === "th") {
    checkThaiTypography(themeConfig, emit);
  }
}

function checkThaiTypography(
  themeConfig: Record<string, string>,
  emit: QualityEmit,
): void {
  const lineHeightKey = LINE_HEIGHT_TOKEN_KEYS.find((key) =>
    trimmedString(themeConfig[key]),
  );

  if (!lineHeightKey) {
    emit({
      severity: "warning",
      code: "THEME_THAI_LINE_HEIGHT_UNDEFINED",
      path: "themeConfig",
      message: `Theme defines no line-height token; Thai text needs at least ${MIN_THAI_LINE_HEIGHT} to avoid vowel clipping.`,
      ownerMessage: `ธีมยังไม่ได้กำหนดความสูงบรรทัด ข้อความไทยต้องใช้อย่างน้อย ${MIN_THAI_LINE_HEIGHT} ไม่งั้นสระบนสระล่างจะโดนตัด`,
    });
  } else {
    const lineHeight = Number.parseFloat(themeConfig[lineHeightKey]);
    if (Number.isFinite(lineHeight) && lineHeight < MIN_THAI_LINE_HEIGHT) {
      emit({
        severity: "error",
        code: "THEME_THAI_LINE_HEIGHT_TOO_TIGHT",
        path: `themeConfig.${lineHeightKey}`,
        message: `Line height ${lineHeight} is below the Thai minimum of ${MIN_THAI_LINE_HEIGHT}.`,
        ownerMessage: `ความสูงบรรทัด ${lineHeight} ต่ำกว่าค่าต่ำสุดสำหรับภาษาไทย (${MIN_THAI_LINE_HEIGHT}) สระจะโดนตัด`,
      });
    }
  }

  for (const key of ["--font-heading", "--font-body"]) {
    const font = trimmedString(themeConfig[key]);
    if (!font) {
      continue;
    }
    if (!/kanit|noto sans thai|sarabun|ibm plex sans thai/i.test(font)) {
      emit({
        severity: "warning",
        code: "THEME_THAI_FONT_UNSUPPORTED",
        path: `themeConfig.${key}`,
        message: `${font} may not cover Thai glyphs; prefer Kanit or another Thai-capable family.`,
        ownerMessage: `ฟอนต์ ${font} อาจไม่รองรับภาษาไทย แนะนำให้ใช้ Kanit`,
      });
    }
  }
}

/** Per-section color overrides set in the builder bypass the theme tokens. */
export function checkPageTheme(
  page: QualityPage,
  basePath: string,
  emit: QualityEmit,
): void {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  let flameSectionCount = 0;

  sections.forEach((section, index) => {
    if (section.isVisible === false || !section.props) {
      return;
    }

    const sectionPath = `${basePath}.sections[${index}]`;
    const props = section.props;

    const textColor = trimmedString(props.textColor);
    const backgroundColor = trimmedString(props.backgroundColor);

    if (textColor && backgroundColor) {
      const ratio = contrastRatio(textColor, backgroundColor);
      if (ratio !== null && ratio < MIN_TEXT_CONTRAST_RATIO) {
        emit({
          severity: "error",
          code: "SECTION_CONTRAST_INSUFFICIENT",
          path: `${sectionPath}.props.textColor`,
          message: `${section.type} text contrast is ${ratio}:1, below the ${MIN_TEXT_CONTRAST_RATIO}:1 minimum.`,
          ownerMessage: `สีข้อความกับพื้นหลังของ section ${section.type} ตัดกันน้อยเกินไป (${ratio}:1) ผู้เข้าชมจะอ่านไม่ออก`,
        });
      }
    }

    const usesFlame = Object.entries(props).some(
      ([key, value]) =>
        PRIMARY_ACTION_COLOR_KEYS.has(key) &&
        typeof value === "string" &&
        isFlameColor(value),
    );
    if (usesFlame) {
      flameSectionCount += 1;
    }
  });

  // "The Controlled Flame Rule" (DESIGN.md): orange marks the one primary
  // action. Spread across many sections it stops reading as a call to action.
  if (flameSectionCount > 2) {
    emit({
      severity: "warning",
      code: "THEME_PRIMARY_COLOR_OVERUSED",
      path: `${basePath}.sections`,
      message: `Ignite Orange is used as an accent in ${flameSectionCount} sections; reserve it for the primary action.`,
      ownerMessage: `ใช้สีส้มหลักเป็นสีเน้นถึง ${flameSectionCount} section ควรเก็บไว้ใช้กับปุ่มหลักเท่านั้น เพื่อให้ปุ่มที่อยากให้กดเด่นจริง`,
    });
  }
}
