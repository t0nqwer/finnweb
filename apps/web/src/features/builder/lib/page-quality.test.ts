import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateBuilderPage, sectionIdOfIssue } from "./page-quality";
import type { BuilderSection } from "../registry/section-registry";
import type { SitePage } from "../api/builder.api";

const page: SitePage = {
  id: "page-1",
  title: "หน้าแรก",
  slug: "home",
  path: "/",
  pageType: "LANDING",
  isHomePage: true,
};

function section(overrides: Partial<BuilderSection>): BuilderSection {
  return {
    id: "section-1",
    type: "HERO",
    label: "Hero",
    summary: "",
    props: {},
    isVisible: true,
    sortOrder: 0,
    ...overrides,
  };
}

describe("evaluateBuilderPage", () => {
  it("passes a page that has a headline and a way to capture a lead", () => {
    const sections = [
      section({ id: "s1", type: "HERO", props: { title: "คลินิกของเรา" } }),
      section({
        id: "s2",
        type: "FORM",
        sortOrder: 1,
        props: { title: "นัดหมายปรึกษาฟรี" },
      }),
    ];

    const report = evaluateBuilderPage({ page, sections });

    assert.equal(report.passed, true);
    assert.equal(report.summary.errorCount, 0);
  });

  it("fails a landing page with no lead-capture section", () => {
    const sections = [
      section({ id: "s1", type: "HERO", props: { title: "คลินิกของเรา" } }),
    ];

    const report = evaluateBuilderPage({ page, sections });

    assert.equal(report.passed, false);
    assert.ok(
      report.issues.some((issue) => issue.code === "PAGE_LEAD_CAPTURE_MISSING"),
    );
  });

  it("judges hidden sections the way the public site sees them", () => {
    const sections = [
      section({ id: "s1", type: "HERO", props: { title: "คลินิกของเรา" } }),
      section({
        id: "s2",
        type: "FORM",
        sortOrder: 1,
        isVisible: false,
        props: { title: "{{unresolved}}" },
      }),
    ];

    const report = evaluateBuilderPage({ page, sections });

    assert.ok(
      !report.issues.some(
        (issue) => issue.code === "CONTENT_PLACEHOLDER_UNRESOLVED",
      ),
      "a hidden section is not published, so its placeholder does not block",
    );
    assert.ok(
      report.issues.some((issue) => issue.code === "PAGE_LEAD_CAPTURE_MISSING"),
      "a hidden form cannot capture leads either",
    );
  });

  it("reports every issue with a Thai owner message", () => {
    const report = evaluateBuilderPage({
      page,
      sections: [section({ props: {} })],
    });

    assert.ok(report.issues.length > 0);
    for (const issue of report.issues) {
      assert.ok(issue.ownerMessage.trim().length > 0, issue.code);
    }
  });

  it("applies the theme's Thai typography rules", () => {
    const sections = [
      section({ id: "s1", type: "HERO", props: { title: "คลินิกของเรา" } }),
      section({
        id: "s2",
        type: "FORM",
        sortOrder: 1,
        props: { title: "นัดหมาย" },
      }),
    ];

    const report = evaluateBuilderPage({
      page,
      sections,
      themeConfig: { "--line-height-base": "1.2" },
    });

    assert.ok(
      report.issues.some(
        (issue) => issue.code === "THEME_THAI_LINE_HEIGHT_TOO_TIGHT",
      ),
    );
  });
});

describe("sectionIdOfIssue", () => {
  it("resolves the section an issue points at", () => {
    const sections = [
      section({ id: "s1", type: "HERO", props: {} }),
      section({ id: "s2", type: "FORM", sortOrder: 1, props: {} }),
    ];

    const report = evaluateBuilderPage({ page, sections });
    const sectionIssue = report.issues.find((issue) =>
      issue.path.includes("sections["),
    );

    assert.ok(sectionIssue);
    assert.ok(["s1", "s2"].includes(sectionIdOfIssue(sectionIssue, sections)!));
  });

  it("returns null for a page-level issue", () => {
    const report = evaluateBuilderPage({
      page,
      sections: [section({ id: "s1", type: "HERO", props: { title: "ก" } })],
    });

    const pageIssue = report.issues.find(
      (issue) => !issue.path.includes("sections["),
    );

    assert.ok(pageIssue);
    assert.equal(sectionIdOfIssue(pageIssue, []), null);
  });
});
