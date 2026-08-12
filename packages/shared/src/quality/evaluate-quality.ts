// ---------------------------------------------------------------------------
// The quality engine — runs every rule and produces one report
// ---------------------------------------------------------------------------

import {
  TEMPLATE_BLOCKING_CODES,
  type QualityContext,
  type QualityIssue,
  type QualityLocale,
  type QualityPage,
  type QualityReport,
  type QualitySiteInput,
  type QualityStage,
} from "./page-quality.types";
import { checkPageContent } from "./rules/content.rules";
import { checkPageMedia } from "./rules/media.rules";
import { checkPageSeo } from "./rules/seo.rules";
import {
  checkPageStructure,
  checkSiteStructure,
} from "./rules/structure.rules";
import { checkPageTheme, checkThemeConfig } from "./rules/theme.rules";

/** Score weights. An error is disqualifying; warnings erode polish. */
const ERROR_PENALTY = 10;
const WARNING_PENALTY = 3;

const TEMPLATE_BLOCKING_CODE_SET = new Set(TEMPLATE_BLOCKING_CODES);

/**
 * A stencil is allowed to be incomplete in the ways create-site later fills in,
 * so outside the blocking set its issues are advisory.
 */
function applyStage(issues: QualityIssue[], stage: QualityStage): QualityIssue[] {
  if (stage !== "template") {
    return issues;
  }

  return issues.map((issue) =>
    issue.severity === "error" && !TEMPLATE_BLOCKING_CODE_SET.has(issue.code)
      ? { ...issue, severity: "warning" as const }
      : issue,
  );
}

function buildReport(issues: QualityIssue[], pages: QualityPage[]): QualityReport {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;

  const sectionCount = pages.reduce(
    (total, page) =>
      total + (Array.isArray(page.sections) ? page.sections.length : 0),
    0,
  );

  const penalty = errorCount * ERROR_PENALTY + warningCount * WARNING_PENALTY;

  return {
    passed: errorCount === 0,
    score: Math.max(0, 100 - penalty),
    summary: {
      errorCount,
      warningCount,
      pageCount: pages.length,
      sectionCount,
    },
    issues,
  };
}

function runPageRules(
  page: QualityPage,
  basePath: string,
  locale: QualityLocale,
  issues: QualityIssue[],
): void {
  const emit = (issue: QualityIssue) => issues.push(issue);

  checkPageStructure(page, basePath, emit);
  checkPageContent(page, basePath, locale, emit);
  checkPageMedia(page, basePath, emit);
  checkPageSeo(page, basePath, emit);
  checkPageTheme(page, basePath, emit);
}

/**
 * Evaluates a whole site (every page plus the shared theme).
 * This is what the publish gate and admin template validation call.
 */
export function evaluateSiteQuality(input: QualitySiteInput): QualityReport {
  const pages = Array.isArray(input.pages) ? input.pages : [];
  const locale = input.locale ?? "th";
  const issues: QualityIssue[] = [];
  const emit = (issue: QualityIssue) => issues.push(issue);

  checkSiteStructure(pages, emit);
  checkThemeConfig(input.themeConfig, locale, emit);

  pages.forEach((page, index) => {
    runPageRules(page, `pages[${index}]`, locale, issues);
  });

  return buildReport(applyStage(issues, input.stage ?? "site"), pages);
}

/**
 * Evaluates a single page in isolation — what the builder shows while editing.
 * Site-wide rules (duplicate slugs, exactly one home page) are skipped because
 * one page cannot answer them.
 */
export function evaluatePageQuality(
  page: QualityPage,
  context: QualityContext = {},
): QualityReport {
  const locale = context.locale ?? "th";
  const issues: QualityIssue[] = [];
  const emit = (issue: QualityIssue) => issues.push(issue);

  checkThemeConfig(context.themeConfig, locale, emit);
  runPageRules(page, "page", locale, issues);

  return buildReport(applyStage(issues, context.stage ?? "site"), [page]);
}

/** Issues that must be resolved before a site can go live. */
export function blockingIssues(report: QualityReport): QualityIssue[] {
  return report.issues.filter((issue) => issue.severity === "error");
}
