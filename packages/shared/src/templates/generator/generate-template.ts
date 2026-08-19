import type {
  ContentPack,
  GeneratedTemplate,
  GeneratedTemplatePage,
  GeneratedTemplateSection,
  TemplateBlueprint,
  ThemePack,
} from "../types/template-factory.types";
import { allBlueprints } from "../blueprints/restaurant-landing.blueprint";
import { allThemes } from "../themes/index";
import { allContentPacks } from "../content-packs/index";
import type { GenerateTemplateInput } from "../types/template-factory.types";
import { MEDIA_KEYS } from "../../quality/props";

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

function findBlueprint(id: string): TemplateBlueprint {
  const bp = allBlueprints.find((b) => b.id === id);
  if (!bp) {
    throw new Error(`[template-factory] Blueprint not found: "${id}"`);
  }
  return bp;
}

function findTheme(id: string): ThemePack {
  const theme = allThemes.find((t) => t.id === id);
  if (!theme) {
    throw new Error(`[template-factory] Theme not found: "${id}"`);
  }
  return theme;
}

function findContentPack(id: string): ContentPack {
  const pack = allContentPacks.find((c) => c.id === id);
  if (!pack) {
    throw new Error(`[template-factory] ContentPack not found: "${id}"`);
  }
  return pack;
}

// ---------------------------------------------------------------------------
// Deep merge — content-pack values win over blueprint defaults
// ---------------------------------------------------------------------------

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Generate a stable template ID from inputs
// ---------------------------------------------------------------------------

function buildTemplateId(input: GenerateTemplateInput): string {
  const seed = input.variantSeed ? `-${input.variantSeed}` : "";
  return `generated-${input.blueprintId}--${input.themeId}--${input.contentPackId}${seed}`;
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Generate a template object compatible with `installTemplateIntoSite`.
 *
 * Merge order (low → high priority):
 *   blueprint.defaultProps
 *   → content-pack section props
 *   → theme.sectionOverrides
 *   → input.placeholderOverrides (substituted into string values)
 */
export function generateTemplate(
  input: GenerateTemplateInput,
): GeneratedTemplate {
  const blueprint = findBlueprint(input.blueprintId);
  const theme = findTheme(input.themeId);
  const contentPack = findContentPack(input.contentPackId);

  // Build combined placeholder map: content-pack defaults + caller overrides
  const placeholders: Record<string, string> = {
    ...(contentPack.placeholders ?? {}),
    ...(input.placeholderOverrides ?? {}),
  };

  const pages: GeneratedTemplatePage[] = blueprint.pages.map(
    (blueprintPage, pageIndex) => {
      // Find matching content page by key
      const contentPage = contentPack.pages.find(
        (p) => p.key === blueprintPage.key,
      );

      const sections: GeneratedTemplateSection[] = blueprintPage.sections.map(
        (blueprintSection, sectionIndex) => {
          // 1. Start with blueprint defaults
          let props: Record<string, unknown> = {
            ...blueprintSection.defaultProps,
          };

          // 2. Deep-merge content-pack section props
          const contentSectionProps =
            contentPage?.sections[blueprintSection.key];
          if (contentSectionProps) {
            props = deepMerge(props, contentSectionProps);
          }

          // 3. Deep-merge theme section overrides
          const themeOverride = theme.sectionOverrides?.[blueprintSection.type];
          if (themeOverride) {
            props = deepMerge(props, themeOverride);
          }

          // 4. Replace {{placeholder}} tokens in all string values
          props = replacePlaceholdersDeep(props, placeholders) as Record<
            string,
            unknown
          >;

          // 5. Drop media slots that resolved to nothing. Shipping an empty
          //    imageUrl makes the public renderer paint a blank tile where the
          //    photo belongs; omitting the prop lets the section lay itself out
          //    without one.
          props = stripEmptyMediaProps(props) as Record<string, unknown>;

          return {
            type: blueprintSection.type,
            name: blueprintSection.name ?? null,
            sortOrder:
              typeof blueprintSection.sortOrder === "number"
                ? blueprintSection.sortOrder
                : sectionIndex,
            isVisible: blueprintSection.isVisible,
            props,
          };
        },
      );

      // Page title / SEO — content-pack wins over blueprint placeholder
      const rawTitle = contentPage?.title ?? blueprintPage.title;
      const title =
        replacePlaceholders(rawTitle, placeholders) ?? blueprintPage.title;
      const seoTitle = replacePlaceholders(
        contentPage?.seoTitle ?? null,
        placeholders,
      );
      const seoDescription = replacePlaceholders(
        contentPage?.seoDescription ?? null,
        placeholders,
      );
      const seoKeywords = replacePlaceholders(
        contentPage?.seoKeywords ?? null,
        placeholders,
      );

      return {
        title,
        slug: blueprintPage.slug,
        path: blueprintPage.path,
        pageType: blueprintPage.pageType,
        isHomePage: blueprintPage.isHomePage,
        isPublished: blueprintPage.isPublished,
        sortOrder:
          typeof blueprintPage.sortOrder === "number"
            ? blueprintPage.sortOrder
            : pageIndex,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        seoKeywords: seoKeywords ?? null,
        ogImageUrl: null,
        sections,
      };
    },
  );

  const templateName =
    contentPack.name +
    (input.variantSeed ? ` (${input.variantSeed})` : "") +
    ` — ${theme.name}`;

  return {
    id: buildTemplateId(input),
    name: templateName,
    industry: input.industry,
    blueprintId: input.blueprintId,
    themeId: input.themeId,
    contentPackId: input.contentPackId,
    themeConfig: theme.tokens,
    pages,
  };
}

// ---------------------------------------------------------------------------
// Placeholder resolution utilities
// ---------------------------------------------------------------------------

const MEDIA_PROP_KEYS = new Set<string>(MEDIA_KEYS);

/** Recursively removes media props whose value is an empty string. */
function stripEmptyMediaProps(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripEmptyMediaProps(item));
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, item]) =>
            !(MEDIA_PROP_KEYS.has(key) && typeof item === "string" && !item.trim()),
        )
        .map(([key, item]) => [key, stripEmptyMediaProps(item)]),
    );
  }

  return value;
}

function replacePlaceholders(
  value: string | null | undefined,
  placeholders: Record<string, string>,
): string | null {
  if (typeof value !== "string") {
    return value ?? null;
  }
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return placeholders[key] ?? "";
  });
}

function replacePlaceholdersDeep(
  value: unknown,
  placeholders: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return replacePlaceholders(value, placeholders);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholdersDeep(item, placeholders));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        replacePlaceholdersDeep(v, placeholders),
      ]),
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Registry accessors (useful for UIs / selects)
// ---------------------------------------------------------------------------

export function getAvailableBlueprints() {
  return allBlueprints.map(({ id, name, industry }) => ({
    id,
    name,
    industry,
  }));
}

export function getAvailableThemes() {
  return allThemes.map(({ id, name, tokens }) => ({
    id,
    name,
    previewTokens: tokens,
  }));
}

export function getAvailableContentPacks() {
  return allContentPacks.map(({ id, name, locale, industry }) => ({
    id,
    name,
    locale,
    industry,
  }));
}
