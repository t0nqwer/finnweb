// ---------------------------------------------------------------------------
// Traversal helpers shared by quality rules
// ---------------------------------------------------------------------------

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Visits every string leaf, reporting a dotted path relative to the root. */
export function forEachString(
  value: unknown,
  visit: (text: string, path: string) => void,
  basePath = "",
): void {
  if (typeof value === "string") {
    visit(value, basePath);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      forEachString(item, visit, `${basePath}[${index}]`),
    );
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      forEachString(item, visit, basePath ? `${basePath}.${key}` : key);
    }
  }
}

/** Visits every array-of-objects leaf — the "cards"/"items" shape sections use. */
export function forEachObjectList(
  value: unknown,
  visit: (items: Record<string, unknown>[], path: string) => void,
  basePath = "",
): void {
  if (Array.isArray(value)) {
    const objectItems = value.filter(isPlainObject);
    if (objectItems.length > 0 && objectItems.length === value.length) {
      visit(objectItems, basePath);
    }
    value.forEach((item, index) =>
      forEachObjectList(item, visit, `${basePath}[${index}]`),
    );
    return;
  }

  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      forEachObjectList(item, visit, basePath ? `${basePath}.${key}` : key);
    }
  }
}

/** Thai Unicode block U+0E00–U+0E7F. */
const THAI_PATTERN = /[฀-๿]/;

export function containsThai(value: string): boolean {
  return THAI_PATTERN.test(value);
}

const PLACEHOLDER_PATTERN = /\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/;

export function containsPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value);
}

const FILLER_PATTERNS = [
  /lorem\s+ipsum/i,
  /dolor\s+sit\s+amet/i,
  /ข้อความตัวอย่าง/,
  /ใส่ข้อความที่นี่/,
  /your\s+(?:text|headline|title)\s+here/i,
  /^(?:tbd|todo|xxx+)$/i,
];

export function isFillerText(value: string): boolean {
  const text = value.trim();
  if (!text) {
    return false;
  }
  return FILLER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Prop keys that hold a headline. Used for duplicate/length checks and to tell
 * "this section says something" from "this section is an empty shell".
 */
export const HEADLINE_KEYS = [
  "title",
  "heading",
  "headline",
  "name",
  "question",
  "label",
] as const;

/** Prop keys that hold supporting copy. */
export const BODY_KEYS = [
  "description",
  "subtitle",
  "subheading",
  "body",
  "text",
  "answer",
  "content",
  "excerpt",
] as const;

/** Prop keys that hold media. */
export const MEDIA_KEYS = [
  "imageUrl",
  "image",
  "backgroundImage",
  "backgroundImageUrl",
  "videoUrl",
  "iconUrl",
  "logoUrl",
  "avatarUrl",
] as const;

/** True when an object carries no usable copy and no media. */
export function isEmptyContentItem(item: Record<string, unknown>): boolean {
  const hasCopy = [...HEADLINE_KEYS, ...BODY_KEYS].some(
    (key) => trimmedString(item[key]).length > 0,
  );
  if (hasCopy) {
    return false;
  }

  const hasMedia = [...MEDIA_KEYS].some(
    (key) => trimmedString(item[key]).length > 0,
  );
  if (hasMedia) {
    return false;
  }

  // An item may use unconventional keys; treat any non-trivial string as copy
  // so the rule stays conservative and does not flag valid custom shapes.
  return !Object.entries(item).some(
    ([key, value]) => key !== "id" && trimmedString(value).length > 1,
  );
}
