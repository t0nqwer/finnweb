type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyIfPresent(source: JsonObject, target: JsonObject, key: string) {
  if (source[key] !== undefined) {
    target[key] = source[key];
  }
}

export function mergeSectionPropsByCanonicalSlots(
  sectionType: string,
  previousProps: unknown,
  templateDefaultProps: unknown,
): {
  nextProps: JsonObject;
  unmappedLegacy: JsonObject;
} {
  const prev = isPlainObject(previousProps) ? previousProps : {};
  const defaults = isPlainObject(templateDefaultProps) ? templateDefaultProps : {};

  const next: JsonObject = { ...defaults };
  const usedKeys = new Set<string>();

  const preserve = (key: string) => {
    if (prev[key] !== undefined) {
      next[key] = prev[key];
      usedKeys.add(key);
    }
  };

  // Common slots across almost all section types
  preserve("title");
  preserve("subtitle");
  preserve("description");
  preserve("body");
  preserve("buttonText");
  preserve("imageUrl");
  preserve("altText");
  preserve("styleMode");
  preserve("themePresetId");
  preserve("theme");
  preserve("fontFamily");
  preserve("accentColor");
  preserve("textColor");
  preserve("customFontFamily");
  preserve("customAccentColor");
  preserve("customTextColor");

  switch (sectionType) {
    case "NAVBAR": {
      preserve("brandName");
      preserve("logo");
      preserve("menuItems");
      preserve("cta");
      break;
    }

    case "FOOTER": {
      preserve("logo");
      preserve("brandName");
      preserve("menuItems");
      preserve("cta");
      preserve("description");
      break;
    }

    case "SIDEBAR": {
      preserve("links");
      preserve("promos");
      break;
    }

    case "BOOKING": {
      preserve("submitLabel");
      preserve("calendarMode");
      preserve("fields");
      break;
    }

    case "COMPARISON": {
      preserve("plans");
      preserve("items");
      break;
    }

    case "NEWS_LIST":
    case "PRODUCT_GRID":
    case "BLOG_LIST": {
      preserve("sourceMode");
      preserve("itemLimit");
      preserve("items");
      break;
    }

    case "CTA": {
      preserve("ctaTemplate");
      preserve("templateVariant");
      preserve("primaryCta");
      preserve("secondaryCta");
      break;
    }

    default:
      break;
  }

  // Explicit compatibility copies
  if (next.title === undefined && typeof prev.headline === "string") {
    next.title = prev.headline;
    usedKeys.add("headline");
  }
  if (next.subtitle === undefined && typeof prev.description === "string") {
    next.subtitle = prev.description;
    usedKeys.add("description");
  }
  if (next.imageUrl === undefined && typeof prev.src === "string") {
    next.imageUrl = prev.src;
    usedKeys.add("src");
  }
  if (next.buttonText === undefined && typeof prev.label === "string") {
    next.buttonText = prev.label;
    usedKeys.add("label");
  }

  const unmappedLegacy: JsonObject = {};
  for (const [key, value] of Object.entries(prev)) {
    if (usedKeys.has(key)) {
      continue;
    }
    if (next[key] !== undefined) {
      continue;
    }
    copyIfPresent(prev, unmappedLegacy, key);
    unmappedLegacy[key] = value;
  }

  return { nextProps: next, unmappedLegacy };
}

