import {
  evaluatePageQuality,
  type QualityIssue,
  type QualityPage,
  type QualityReport,
} from "@finnweb/shared";
import type { BuilderSection } from "../registry/section-registry";
import type { SitePage } from "../api/builder.api";

/**
 * Runs the same rules the publish gate runs, in the browser, against the draft
 * the owner is editing right now. Importing the shared engine rather than
 * calling the API keeps the verdict identical and instant.
 */
export function evaluateBuilderPage({
  page,
  sections,
  themeConfig,
}: {
  page: SitePage | null;
  sections: BuilderSection[];
  themeConfig?: Record<string, string> | null;
}): QualityReport {
  const qualityPage: QualityPage = {
    title: page?.title,
    slug: page?.slug,
    path: page?.path,
    pageType: page?.pageType,
    isHomePage: page?.isHomePage,
    // The builder edits what publish will ship, so judge it as published
    // content rather than as a draft that skips the SEO rules.
    isPublished: true,
    sections: sections.map((section, index) => ({
      type: section.type,
      name: section.label,
      sortOrder: section.sortOrder ?? index,
      isVisible: section.isVisible !== false,
      props: section.props ?? null,
    })),
  };

  return evaluatePageQuality(qualityPage, { themeConfig, locale: "th" });
}

/** Extracts the section index an issue points at, if it points at one. */
export function sectionIndexOfIssue(issue: QualityIssue): number | null {
  const match = /sections\[(\d+)\]/.exec(issue.path);
  return match ? Number(match[1]) : null;
}

/** Resolves the section id an issue belongs to, for click-to-select. */
export function sectionIdOfIssue(
  issue: QualityIssue,
  sections: BuilderSection[],
): string | null {
  const index = sectionIndexOfIssue(issue);
  if (index === null) {
    return null;
  }
  return sections[index]?.id ?? null;
}
