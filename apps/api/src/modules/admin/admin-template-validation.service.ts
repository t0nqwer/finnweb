import { Injectable } from "@nestjs/common";
import {
  evaluateSiteQuality,
  type QualityIssue,
  type QualityPage,
} from "@finnweb/shared";
import { CreateTemplateDto } from "../templates/dto/create-template.dto";

type TemplateValidationIssue = QualityIssue;

/**
 * Template validation = shared page-quality rules (structure, content, media,
 * SEO, brand) + the metadata rules that only exist for templates.
 *
 * Runs at stage "template", so placeholders and empty media slots — which
 * create-site fills in later — report as warnings instead of blocking a save.
 */
@Injectable()
export class AdminTemplateValidationService {
  validateTemplate(dto: CreateTemplateDto) {
    const issues: TemplateValidationIssue[] = [];

    this.validateMetadata(dto, issues);

    const quality = evaluateSiteQuality({
      pages: this.toQualityPages(dto),
      stage: "template",
      locale: this.resolveLocale(dto),
    });

    issues.push(...quality.issues);

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;

    return {
      valid: errorCount === 0,
      summary: {
        errorCount,
        warningCount,
        pageCount: quality.summary.pageCount,
        sectionCount: quality.summary.sectionCount,
      },
      issues,
    };
  }

  private resolveLocale(dto: CreateTemplateDto) {
    const languages = Array.isArray(dto.languages) ? dto.languages : [];
    const isThai = languages.some((language) =>
      ["th", "thai", "th-th"].includes(String(language).toLowerCase()),
    );
    return isThai || languages.length === 0 ? ("th" as const) : ("en" as const);
  }

  private toQualityPages(dto: CreateTemplateDto): QualityPage[] {
    if (!Array.isArray(dto.pages)) {
      return [];
    }

    return dto.pages.map((page, index) => ({
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      isHomePage: page.isHomePage ?? index === 0,
      isPublished: page.isPublished,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoKeywords: page.seoKeywords,
      ogImageUrl: page.ogImageUrl,
      sections: Array.isArray(page.sections)
        ? page.sections.map((section) => ({
            type: section.type,
            name: section.name,
            sortOrder: section.sortOrder,
            isVisible: section.isVisible,
            props: (section.props ?? null) as Record<string, unknown> | null,
          }))
        : [],
    }));
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
        ownerMessage: "ควรใส่คำอธิบายสั้น ๆ ให้แอดมินรู้ว่าเทมเพลตนี้ใช้กับธุรกิจแบบไหน",
      });
    }

    for (const key of ["businessTypes", "goals", "styles", "languages"] as const) {
      if (!Array.isArray(dto[key]) || dto[key]?.length === 0) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_MATCHING_METADATA_REQUIRED",
          path: key,
          message: `${key} must include at least one value for create-site matching.`,
          ownerMessage: `ต้องระบุ ${key} อย่างน้อย 1 ค่า เพื่อให้ระบบจับคู่เทมเพลตตอนสร้างเว็บได้`,
        });
      }
    }

    if (dto.customCss?.trim()) {
      const css = dto.customCss;
      if (/@import\s+/i.test(css)) {
        issues.push({
          severity: "warning",
          code: "TEMPLATE_CUSTOM_CSS_IMPORT_FOUND",
          path: "customCss",
          message:
            "customCss contains @import. Prefer bundling CSS directly for stable rendering.",
          ownerMessage:
            "customCss มี @import ซึ่งอาจทำให้หน้าเว็บโหลดไม่เสถียร ควรรวม CSS มาโดยตรง",
        });
      }

      if (/<\/?script|expression\s*\(|javascript:/i.test(css)) {
        issues.push({
          severity: "error",
          code: "TEMPLATE_CUSTOM_CSS_UNSAFE_PATTERN",
          path: "customCss",
          message: "customCss contains unsafe patterns.",
          ownerMessage: "customCss มีรูปแบบที่ไม่ปลอดภัย กรุณาลบสคริปต์ออก",
        });
      }
    }
  }
}
