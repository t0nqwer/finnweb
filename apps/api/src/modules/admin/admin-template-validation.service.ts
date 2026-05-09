import { Injectable } from "@nestjs/common";
import { PAGE_TYPES } from "../sites/dto/create-page.dto";
import { SECTION_TYPES } from "../sites/dto/create-section.dto";
import { CreateTemplateDto } from "../templates/dto/create-template.dto";

type TemplateValidationIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

@Injectable()
export class AdminTemplateValidationService {
  validateTemplate(dto: CreateTemplateDto) {
    const issues: TemplateValidationIssue[] = [];

    this.validateMetadata(dto, issues);
    this.validatePages(dto, issues);

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.filter(
      (issue) => issue.severity === "warning",
    ).length;

    return {
      valid: errorCount === 0,
      summary: {
        errorCount,
        warningCount,
        pageCount: Array.isArray(dto.pages) ? dto.pages.length : 0,
        sectionCount: Array.isArray(dto.pages)
          ? dto.pages.reduce(
              (total, page) =>
                total + (Array.isArray(page.sections) ? page.sections.length : 0),
              0,
            )
          : 0,
      },
      issues,
    };
  }

  private validateMetadata(
    dto: CreateTemplateDto,
    issues: TemplateValidationIssue[],
  ) {
    if (!dto.description?.trim()) {
      issues.push({
        severity: "warning",
        code: "TEMPLATE_DESCRIPTION_RECOMMENDED",
        path: "description",
        message: "Add a short description so admins understand when to use it.",
      });
    }

    for (const key of ["businessTypes", "goals", "styles", "languages"] as const) {
      if (!Array.isArray(dto[key]) || dto[key]?.length === 0) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_MATCHING_METADATA_REQUIRED",
          path: key,
          message: `${key} must include at least one value for create-site matching.`,
        });
      }
    }
  }

  private validatePages(dto: CreateTemplateDto, issues: TemplateValidationIssue[]) {
    if (!Array.isArray(dto.pages) || dto.pages.length === 0) {
      issues.push({
        severity: "error",
        code: "TEMPLATE_PAGES_REQUIRED",
        path: "pages",
        message: "Template must include at least one page.",
      });
      return;
    }

    const homePages = dto.pages.filter((page, index) =>
      Boolean(page.isHomePage ?? index === 0),
    );

    if (homePages.length !== 1) {
      issues.push({
        severity: "error",
        code: "TEMPLATE_HOME_PAGE_REQUIRED",
        path: "pages",
        message: "Template must have exactly one home page.",
      });
    }

    const seenSlugs = new Set<string>();
    const seenPaths = new Set<string>();

    dto.pages.forEach((page, pageIndex) => {
      const pagePath = `pages[${pageIndex}]`;
      const slug = page.slug?.trim() || this.makeSlug(page.title);
      const path = page.isHomePage ? "/" : page.path?.trim() || `/${slug}`;

      if (page.pageType && !PAGE_TYPES.includes(page.pageType as any)) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_PAGE_TYPE_INVALID",
          path: `${pagePath}.pageType`,
          message: `${page.pageType} is not a supported page type.`,
        });
      }

      if (seenSlugs.has(slug)) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_PAGE_SLUG_DUPLICATE",
          path: `${pagePath}.slug`,
          message: `Duplicate page slug: ${slug}`,
        });
      }
      seenSlugs.add(slug);

      if (seenPaths.has(path)) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_PAGE_PATH_DUPLICATE",
          path: `${pagePath}.path`,
          message: `Duplicate page path: ${path}`,
        });
      }
      seenPaths.add(path);

      if (!Array.isArray(page.sections) || page.sections.length === 0) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_PAGE_SECTIONS_REQUIRED",
          path: `${pagePath}.sections`,
          message: "Every page must include at least one section.",
        });
        return;
      }

      const visibleSections = page.sections.filter(
        (section) => section.isVisible !== false,
      );
      if (visibleSections.length === 0) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_VISIBLE_SECTION_REQUIRED",
          path: `${pagePath}.sections`,
          message: "Every page must include at least one visible section.",
        });
      }

      page.sections.forEach((section, sectionIndex) => {
        const sectionPath = `${pagePath}.sections[${sectionIndex}]`;

        if (!SECTION_TYPES.includes(section.type as any)) {
          issues.push({
            severity: "error",
            code: "TEMPLATE_SECTION_TYPE_INVALID",
            path: `${sectionPath}.type`,
            message: `${section.type} is not a supported section type.`,
          });
        }

        const missingField = this.getRequiredFieldMissingForUse(
          section.type,
          section.props,
        );
        if (section.isVisible !== false && missingField) {
          issues.push({
            severity: "error",
            code: "TEMPLATE_SECTION_REQUIRED_FIELD_MISSING",
            path: `${sectionPath}.props.${missingField}`,
            message: `${section.type} section is missing ${missingField}.`,
          });
        }

        if (this.hasUnresolvedPlaceholders(section.props)) {
          issues.push({
            severity: "warning",
            code: "TEMPLATE_PLACEHOLDER_PRESENT",
            path: `${sectionPath}.props`,
            message:
              "Template contains placeholders. This is allowed if create-site answers replace them.",
          });
        }
      });
    });
  }

  private makeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private hasUnresolvedPlaceholders(value: unknown): boolean {
    if (typeof value === "string") {
      return /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(value);
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.hasUnresolvedPlaceholders(item));
    }

    if (this.isPlainObject(value)) {
      return Object.values(value).some((item) =>
        this.hasUnresolvedPlaceholders(item),
      );
    }

    return false;
  }

  private getRequiredFieldMissingForUse(
    sectionType: string,
    props: unknown,
  ): string | null {
    if (!this.isPlainObject(props)) {
      return "props";
    }

    const getTrimmed = (key: string) => {
      const value = props[key];
      return typeof value === "string" ? value.trim() : "";
    };

    switch (sectionType) {
      case "HERO":
      case "CTA":
      case "FORM":
      case "CONTACT":
      case "BOOKING":
        return getTrimmed("title") ? null : "title";
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
}
