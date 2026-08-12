import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AdminTemplateValidationService } from "./admin-template-validation.service";
import type { CreateTemplateDto } from "../templates/dto/create-template.dto";

const service = new AdminTemplateValidationService();

function templateDto(overrides: Partial<CreateTemplateDto> = {}): CreateTemplateDto {
  return {
    name: "คลินิกความงาม",
    slug: "aesthetic-clinic",
    description: "เทมเพลตคลินิกความงามสำหรับ SME ไทย",
    businessTypes: ["clinic"],
    goals: ["lead"],
    styles: ["premium"],
    languages: ["th"],
    pages: [
      {
        title: "หน้าแรก",
        slug: "home",
        path: "/",
        pageType: "LANDING",
        isHomePage: true,
        isPublished: true,
        sortOrder: 0,
        sections: [
          {
            type: "NAVBAR",
            sortOrder: 0,
            isVisible: true,
            props: { menuItems: [{ label: "หน้าแรก", href: "/" }] },
          },
          {
            type: "HERO",
            sortOrder: 1,
            isVisible: true,
            props: { title: "{{businessName}}", imageUrl: "" },
          },
          {
            type: "FORM",
            sortOrder: 2,
            isVisible: true,
            props: { title: "นัดหมายปรึกษาฟรี" },
          },
        ],
      },
    ],
    ...overrides,
  } as CreateTemplateDto;
}

function codesOf(result: ReturnType<typeof service.validateTemplate>) {
  return result.issues.map((issue) => issue.code);
}

describe("AdminTemplateValidationService", () => {
  it("keeps the response shape the admin dashboard renders", () => {
    const result = service.validateTemplate(templateDto());

    assert.equal(typeof result.valid, "boolean");
    assert.deepEqual(Object.keys(result.summary).sort(), [
      "errorCount",
      "pageCount",
      "sectionCount",
      "warningCount",
    ]);
    assert.equal(result.summary.pageCount, 1);
    assert.equal(result.summary.sectionCount, 3);
    for (const issue of result.issues) {
      assert.ok(issue.code && issue.path && issue.message);
      assert.ok(["error", "warning"].includes(issue.severity));
    }
  });

  it("still saves a stencil that carries placeholders and empty media slots", () => {
    const result = service.validateTemplate(templateDto());

    assert.equal(result.valid, true);
    const placeholder = result.issues.find(
      (issue) => issue.code === "CONTENT_PLACEHOLDER_UNRESOLVED",
    );
    assert.ok(placeholder, "placeholder should still be reported");
    assert.equal(placeholder.severity, "warning");

    const emptyMedia = result.issues.find(
      (issue) => issue.code === "MEDIA_IMAGE_EMPTY",
    );
    assert.ok(emptyMedia);
    assert.equal(emptyMedia.severity, "warning");
  });

  it("still blocks the structural breakage it always blocked", () => {
    const noHome = service.validateTemplate(
      templateDto({
        pages: [
          { ...templateDto().pages![0], isHomePage: false },
          {
            ...templateDto().pages![0],
            slug: "second",
            path: "/second",
            isHomePage: false,
          },
        ],
      }),
    );
    assert.equal(noHome.valid, false);
    assert.ok(codesOf(noHome).includes("SITE_HOME_PAGE_REQUIRED"));

    const badSection = service.validateTemplate(
      templateDto({
        pages: [
          {
            ...templateDto().pages![0],
            // The AI import path feeds unvalidated JSON through `as any`, so an
            // unknown section type is a real runtime case, not a typo.
            sections: [
              { type: "NOT_A_SECTION", sortOrder: 0, isVisible: true, props: {} },
            ] as unknown as NonNullable<
              CreateTemplateDto["pages"]
            >[number]["sections"],
          },
        ],
      }),
    );
    assert.equal(badSection.valid, false);
    assert.ok(codesOf(badSection).includes("SECTION_TYPE_INVALID"));

    const missingTitle = service.validateTemplate(
      templateDto({
        pages: [
          {
            ...templateDto().pages![0],
            sections: [
              { type: "HERO", sortOrder: 0, isVisible: true, props: { subtitle: "ไม่มีหัวข้อ" } },
            ],
          },
        ],
      }),
    );
    assert.equal(missingTitle.valid, false);
    assert.ok(codesOf(missingTitle).includes("SECTION_REQUIRED_FIELD_MISSING"));
  });

  it("keeps template metadata and unsafe CSS rules", () => {
    const missingMetadata = service.validateTemplate(templateDto({ goals: [] }));
    assert.equal(missingMetadata.valid, false);
    assert.ok(codesOf(missingMetadata).includes("TEMPLATE_MATCHING_METADATA_REQUIRED"));

    const unsafeCss = service.validateTemplate(
      templateDto({ customCss: "a { background: url(javascript:alert(1)) }" }),
    );
    assert.equal(unsafeCss.valid, false);
    assert.ok(codesOf(unsafeCss).includes("TEMPLATE_CUSTOM_CSS_UNSAFE_PATTERN"));

    const missingDescription = service.validateTemplate(
      templateDto({ description: "" }),
    );
    assert.ok(codesOf(missingDescription).includes("TEMPLATE_DESCRIPTION_RECOMMENDED"));
  });

  it("gains the new advisory rules without blocking", () => {
    const result = service.validateTemplate(
      templateDto({
        pages: [
          {
            ...templateDto().pages![0],
            seoTitle: undefined,
            sections: [
              {
                type: "NAVBAR",
                sortOrder: 0,
                isVisible: true,
                props: { menuItems: [{ label: "หน้าแรก", href: "/" }] },
              },
              {
                type: "HERO",
                sortOrder: 1,
                isVisible: true,
                props: { title: "คลินิกของเรา" },
              },
            ],
          },
        ],
      }),
    );

    const codes = codesOf(result);
    assert.ok(codes.includes("PAGE_LEAD_CAPTURE_MISSING"));
    assert.ok(codes.includes("SEO_TITLE_MISSING"));
    assert.equal(result.valid, true, "advisory rules must not block a template save");
  });
});
