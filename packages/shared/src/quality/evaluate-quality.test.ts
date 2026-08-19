import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blockingIssues,
  evaluatePageQuality,
  evaluateSiteQuality,
} from "./evaluate-quality";
import { contrastRatio, isFlameColor, parseHexColor } from "./color";
import type {
  QualityIssue,
  QualityPage,
  QualitySection,
} from "./page-quality.types";

// ---------------------------------------------------------------------------
// Fixtures — a page that should score a clean 100, plus focused mutations
// ---------------------------------------------------------------------------

const GOOD_THEME: Record<string, string> = {
  "--color-primary": "#FF8C00",
  "--color-background": "#FFFFFF",
  "--color-surface": "#F9FAFB",
  "--color-text-base": "#1A1C23",
  "--color-text-muted": "#64748B",
  "--font-heading": "'Kanit', sans-serif",
  "--font-body": "'Kanit', sans-serif",
  "--line-height-base": "1.75",
};

function navbar(): QualitySection {
  return {
    type: "NAVBAR",
    sortOrder: 0,
    isVisible: true,
    props: {
      menuItems: [
        { label: "หน้าแรก", href: "/" },
        { label: "ติดต่อเรา", href: "#contact" },
      ],
    },
  };
}

function hero(): QualitySection {
  return {
    type: "HERO",
    sortOrder: 1,
    isVisible: true,
    props: {
      title: "คลินิกความงามใจกลางเมือง",
      description: "ดูแลผิวโดยแพทย์เฉพาะทาง พร้อมให้คำปรึกษาฟรี",
      imageUrl: "https://cdn.finnweb.site/clinic/hero.jpg",
      imageAlt: "บรรยากาศภายในคลินิก",
    },
  };
}

function leadForm(): QualitySection {
  return {
    type: "FORM",
    sortOrder: 2,
    isVisible: true,
    props: {
      title: "นัดหมายปรึกษาฟรี",
      description: "กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับทาง LINE",
    },
  };
}

function footer(): QualitySection {
  return {
    type: "FOOTER",
    sortOrder: 3,
    isVisible: true,
    props: { text: "© 2026 คลินิกตัวอย่าง สงวนลิขสิทธิ์" },
  };
}

function goodPage(overrides: Partial<QualityPage> = {}): QualityPage {
  return {
    title: "หน้าแรก",
    slug: "home",
    path: "/",
    pageType: "LANDING",
    isHomePage: true,
    isPublished: true,
    seoTitle: "คลินิกความงามใจกลางเมือง | ปรึกษาฟรี",
    seoDescription:
      "คลินิกความงามโดยแพทย์เฉพาะทาง ดูแลผิวหน้าครบวงจร นัดหมายปรึกษาฟรีผ่าน LINE ได้ทุกวัน",
    ogImageUrl: "https://cdn.finnweb.site/clinic/og.jpg",
    sections: [navbar(), hero(), leadForm(), footer()],
    ...overrides,
  };
}

function goodSite(page: QualityPage = goodPage()) {
  return { pages: [page], themeConfig: GOOD_THEME, locale: "th" as const };
}

function codesOf(issues: QualityIssue[]): string[] {
  return issues.map((issue) => issue.code);
}

function withSections(sections: QualitySection[]): QualityPage {
  return goodPage({ sections });
}

// ---------------------------------------------------------------------------

describe("evaluateSiteQuality — the perfect bar", () => {
  it("gives a complete Thai landing page a clean report", () => {
    const report = evaluateSiteQuality(goodSite());

    assert.deepEqual(report.issues, []);
    assert.equal(report.passed, true);
    assert.equal(report.score, 100);
    assert.equal(report.summary.pageCount, 1);
    assert.equal(report.summary.sectionCount, 4);
  });

  it("reports section and page counts even when issues exist", () => {
    const report = evaluateSiteQuality(goodSite(goodPage({ seoTitle: "" })));

    assert.equal(report.summary.pageCount, 1);
    assert.equal(report.summary.sectionCount, 4);
  });

  it("scores errors harder than warnings and floors at zero", () => {
    const empty = evaluateSiteQuality({ pages: [], themeConfig: GOOD_THEME });
    assert.equal(empty.passed, false);
    assert.equal(empty.score, 90);

    const warned = evaluateSiteQuality(
      goodSite(goodPage({ ogImageUrl: "" })),
    );
    assert.equal(warned.passed, true);
    assert.equal(warned.score, 97);
  });

  it("blockingIssues returns only errors", () => {
    const report = evaluateSiteQuality(
      goodSite(goodPage({ seoTitle: "", ogImageUrl: "" })),
    );

    assert.ok(report.issues.some((issue) => issue.severity === "warning"));
    assert.ok(
      blockingIssues(report).every((issue) => issue.severity === "error"),
    );
  });

  it("attaches a Thai owner message to every issue", () => {
    const report = evaluateSiteQuality(
      goodSite(goodPage({ sections: [navbar(), hero(), footer()] })),
    );

    assert.ok(report.issues.length > 0);
    for (const issue of report.issues) {
      assert.ok(issue.ownerMessage.length > 0, `${issue.code} has no ownerMessage`);
      assert.ok(issue.message.length > 0, `${issue.code} has no message`);
      assert.ok(issue.path.length > 0, `${issue.code} has no path`);
    }
  });
});

describe("structure rules", () => {
  it("requires at least one page", () => {
    const report = evaluateSiteQuality({ pages: [] });
    assert.deepEqual(codesOf(report.issues), ["SITE_PAGES_REQUIRED"]);
  });

  it("requires exactly one home page", () => {
    const report = evaluateSiteQuality({
      pages: [goodPage(), goodPage({ slug: "second", path: "/second" })],
      themeConfig: GOOD_THEME,
    });

    assert.ok(codesOf(report.issues).includes("SITE_HOME_PAGE_REQUIRED"));
  });

  it("flags duplicate slugs and paths", () => {
    const report = evaluateSiteQuality({
      pages: [
        goodPage(),
        goodPage({ isHomePage: false, pageType: "NORMAL" }),
      ],
      themeConfig: GOOD_THEME,
    });

    const codes = codesOf(report.issues);
    assert.ok(codes.includes("PAGE_SLUG_DUPLICATE"));
    assert.ok(codes.includes("PAGE_PATH_DUPLICATE"));
  });

  it("requires a visible section", () => {
    const hidden = withSections([
      { ...navbar(), isVisible: false },
      { ...hero(), isVisible: false },
      { ...leadForm(), isVisible: false },
    ]);

    const codes = codesOf(evaluateSiteQuality(goodSite(hidden)).issues);
    assert.ok(codes.includes("PAGE_VISIBLE_SECTION_REQUIRED"));
  });

  it("rejects unknown section types", () => {
    const page = withSections([
      navbar(),
      { type: "MYSTERY_BOX", sortOrder: 1, isVisible: true, props: {} },
      leadForm(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "SECTION_TYPE_INVALID",
      ),
    );
  });

  it("requires the fields a section cannot render without", () => {
    const page = withSections([
      navbar(),
      { ...hero(), props: { description: "ไม่มีหัวข้อ" } },
      leadForm(),
    ]);

    const issue = evaluateSiteQuality(goodSite(page)).issues.find(
      (candidate) => candidate.code === "SECTION_REQUIRED_FIELD_MISSING",
    );

    assert.ok(issue);
    assert.match(issue.path, /sections\[1\]\.props\.title$/);
  });

  it("treats a home page with no lead capture as an error", () => {
    const page = withSections([navbar(), hero(), footer()]);
    const report = evaluateSiteQuality(goodSite(page));

    assert.equal(report.passed, false);
    assert.ok(codesOf(report.issues).includes("PAGE_LEAD_CAPTURE_MISSING"));
  });

  it("accepts CTA or BOOKING as the lead-capture path", () => {
    for (const type of ["CTA", "BOOKING", "CONTACT"]) {
      const page = withSections([
        navbar(),
        hero(),
        { type, sortOrder: 2, isVisible: true, props: { title: "ติดต่อเรา" } },
        footer(),
      ]);

      assert.ok(
        !codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
          "PAGE_LEAD_CAPTURE_MISSING",
        ),
        `${type} should satisfy the lead-capture rule`,
      );
    }
  });

  it("does not demand lead capture on an inner content page", () => {
    const inner = goodPage({
      isHomePage: false,
      pageType: "NORMAL",
      slug: "about",
      path: "/about",
      sections: [navbar(), { type: "ABOUT", sortOrder: 1, isVisible: true, props: { title: "เกี่ยวกับเรา" } }],
    });

    assert.ok(
      !codesOf(evaluatePageQuality(inner, { themeConfig: GOOD_THEME }).issues).includes(
        "PAGE_LEAD_CAPTURE_MISSING",
      ),
    );
  });

  it("warns when the navbar is not first or the footer is not last", () => {
    const page = withSections([
      { ...hero(), sortOrder: 0 },
      { ...navbar(), sortOrder: 1 },
      { ...footer(), sortOrder: 2 },
      { ...leadForm(), sortOrder: 3 },
    ]);

    const codes = codesOf(evaluateSiteQuality(goodSite(page)).issues);
    assert.ok(codes.includes("SECTION_NAVBAR_NOT_FIRST"));
    assert.ok(codes.includes("SECTION_FOOTER_NOT_LAST"));
  });

  it("suggests a hero on the home page", () => {
    const page = withSections([navbar(), leadForm(), footer()]);
    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "PAGE_HERO_RECOMMENDED",
      ),
    );
  });
});

describe("content rules", () => {
  it("blocks unresolved placeholders", () => {
    const page = withSections([
      navbar(),
      { ...hero(), props: { ...hero().props, title: "ยินดีต้อนรับสู่ {{businessName}}" } },
      leadForm(),
    ]);

    const report = evaluateSiteQuality(goodSite(page));
    assert.equal(report.passed, false);
    assert.ok(codesOf(report.issues).includes("CONTENT_PLACEHOLDER_UNRESOLVED"));
  });

  it("blocks placeholders left in page-level fields", () => {
    const report = evaluateSiteQuality(
      goodSite(goodPage({ seoTitle: "{{businessName}} | ปรึกษาฟรี" })),
    );

    const issue = report.issues.find(
      (candidate) => candidate.code === "CONTENT_PLACEHOLDER_UNRESOLVED",
    );

    assert.ok(issue);
    assert.match(issue.path, /seoTitle$/);
    assert.equal(report.passed, false);
  });

  it("blocks filler copy in any language", () => {
    for (const filler of ["Lorem ipsum dolor sit amet", "ข้อความตัวอย่าง"]) {
      const page = withSections([
        navbar(),
        { ...hero(), props: { ...hero().props, description: filler } },
        leadForm(),
      ]);

      assert.ok(
        codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
          "CONTENT_FILLER_TEXT",
        ),
        `${filler} should be flagged`,
      );
    }
  });

  it("blocks cards that carry neither copy nor media", () => {
    const page = withSections([
      navbar(),
      hero(),
      {
        type: "FEATURE",
        sortOrder: 2,
        isVisible: true,
        props: {
          title: "บริการของเรา",
          items: [
            { title: "ดูแลผิวหน้า", description: "โดยแพทย์เฉพาะทาง" },
            { title: "", description: "", imageUrl: "" },
          ],
        },
      },
      leadForm(),
    ]);

    const issue = evaluateSiteQuality(goodSite(page)).issues.find(
      (candidate) => candidate.code === "CONTENT_EMPTY_ITEM",
    );

    assert.ok(issue);
    assert.match(issue.path, /items\[1\]$/);
  });

  it("warns on duplicated headlines across sections", () => {
    const page = withSections([
      navbar(),
      hero(),
      { ...leadForm(), props: { title: "คลินิกความงามใจกลางเมือง" } },
      footer(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "CONTENT_HEADLINE_DUPLICATE",
      ),
    );
  });

  it("warns on headlines too long for mobile", () => {
    const page = withSections([
      navbar(),
      {
        ...hero(),
        props: { ...hero().props, title: "ก".repeat(80) },
      },
      leadForm(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "CONTENT_HEADLINE_TOO_LONG",
      ),
    );
  });

  it("warns when a Thai site still carries English-only copy", () => {
    const page = withSections([
      navbar(),
      {
        ...hero(),
        props: {
          ...hero().props,
          title: "Welcome to our beauty clinic in the city",
          description: "We provide full skin care by specialist doctors every day",
        },
      },
      leadForm(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "CONTENT_THAI_COPY_EXPECTED",
      ),
    );
  });

  it("leaves English copy alone on an English site", () => {
    const page = withSections([
      navbar(),
      {
        ...hero(),
        props: {
          ...hero().props,
          title: "Welcome to our beauty clinic in the city",
          description: "We provide full skin care by specialist doctors every day",
        },
      },
      leadForm(),
    ]);

    const report = evaluateSiteQuality({
      pages: [page],
      themeConfig: GOOD_THEME,
      locale: "en",
    });

    assert.ok(!codesOf(report.issues).includes("CONTENT_THAI_COPY_EXPECTED"));
  });

  it("ignores hidden sections", () => {
    const page = withSections([
      navbar(),
      hero(),
      leadForm(),
      {
        type: "CONTENT",
        sortOrder: 4,
        isVisible: false,
        props: { title: "ยังไม่เสร็จ {{draftToken}}" },
      },
      footer(),
    ]);

    assert.ok(
      !codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "CONTENT_PLACEHOLDER_UNRESOLVED",
      ),
    );
  });
});

describe("media rules", () => {
  it("blocks empty image slots", () => {
    const page = withSections([
      navbar(),
      { ...hero(), props: { ...hero().props, imageUrl: "" } },
      leadForm(),
    ]);

    const report = evaluateSiteQuality(goodSite(page));
    assert.equal(report.passed, false);
    assert.ok(codesOf(report.issues).includes("MEDIA_IMAGE_EMPTY"));
  });

  it("blocks placeholder image hosts", () => {
    const page = withSections([
      navbar(),
      {
        ...hero(),
        props: { ...hero().props, imageUrl: "https://via.placeholder.com/1200x600" },
      },
      leadForm(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "MEDIA_IMAGE_PLACEHOLDER",
      ),
    );
  });

  it("warns when a real image has no alt text", () => {
    const heroWithoutAlt = hero();
    delete (heroWithoutAlt.props as Record<string, unknown>).imageAlt;

    const page = withSections([navbar(), heroWithoutAlt, leadForm()]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "MEDIA_ALT_TEXT_MISSING",
      ),
    );
  });

  it("does not ask for alt text when there is no image", () => {
    const page = withSections([navbar(), leadForm(), footer()]);

    assert.ok(
      !codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "MEDIA_ALT_TEXT_MISSING",
      ),
    );
  });
});

describe("theme rules", () => {
  it("blocks unreadable body text contrast", () => {
    const report = evaluateSiteQuality({
      pages: [goodPage()],
      themeConfig: {
        ...GOOD_THEME,
        "--color-text-base": "#CCCCCC",
        "--color-background": "#FFFFFF",
      },
    });

    assert.equal(report.passed, false);
    assert.ok(codesOf(report.issues).includes("THEME_CONTRAST_INSUFFICIENT"));
  });

  it("blocks Thai line heights below 1.7", () => {
    const report = evaluateSiteQuality({
      pages: [goodPage()],
      themeConfig: { ...GOOD_THEME, "--line-height-base": "1.4" },
    });

    assert.ok(
      codesOf(report.issues).includes("THEME_THAI_LINE_HEIGHT_TOO_TIGHT"),
    );
  });

  it("warns when a Thai theme defines no line height at all", () => {
    const themeConfig = { ...GOOD_THEME };
    delete themeConfig["--line-height-base"];

    assert.ok(
      codesOf(
        evaluateSiteQuality({ pages: [goodPage()], themeConfig }).issues,
      ).includes("THEME_THAI_LINE_HEIGHT_UNDEFINED"),
    );
  });

  it("warns about fonts without Thai coverage", () => {
    const report = evaluateSiteQuality({
      pages: [goodPage()],
      themeConfig: { ...GOOD_THEME, "--font-heading": "'Playfair Display', serif" },
    });

    assert.ok(codesOf(report.issues).includes("THEME_THAI_FONT_UNSUPPORTED"));
  });

  it("skips Thai typography rules on an English site", () => {
    const themeConfig: Record<string, string> = {
      ...GOOD_THEME,
      "--font-heading": "'Playfair Display', serif",
    };
    delete themeConfig["--line-height-base"];

    const codes = codesOf(
      evaluateSiteQuality({ pages: [goodPage()], themeConfig, locale: "en" }).issues,
    );

    assert.ok(!codes.includes("THEME_THAI_FONT_UNSUPPORTED"));
    assert.ok(!codes.includes("THEME_THAI_LINE_HEIGHT_UNDEFINED"));
  });

  it("blocks unreadable per-section color overrides", () => {
    const page = withSections([
      navbar(),
      {
        ...hero(),
        props: { ...hero().props, textColor: "#FFD700", backgroundColor: "#FFFFFF" },
      },
      leadForm(),
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "SECTION_CONTRAST_INSUFFICIENT",
      ),
    );
  });

  it("warns when the primary flame color is spread across the page", () => {
    const flame = (sortOrder: number, type: string): QualitySection => ({
      type,
      sortOrder,
      isVisible: true,
      props: { title: `หัวข้อ ${sortOrder}`, accentColor: "#FF8C00" },
    });

    const page = withSections([
      navbar(),
      flame(1, "HERO"),
      flame(2, "FEATURE"),
      flame(3, "TESTIMONIAL"),
      { ...leadForm(), sortOrder: 4 },
    ]);

    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(page)).issues).includes(
        "THEME_PRIMARY_COLOR_OVERUSED",
      ),
    );
  });
});

describe("seo rules", () => {
  it("reports a missing SEO title without blocking publish", () => {
    const report = evaluateSiteQuality(goodSite(goodPage({ seoTitle: "" })));
    const issue = report.issues.find((candidate) => candidate.code === "SEO_TITLE_MISSING");

    assert.ok(issue);
    assert.equal(issue.severity, "warning");
    assert.equal(report.passed, true, "the renderer falls back to the page title");
    assert.ok(report.score < 100, "it should still cost score");
  });

  it("reports a missing SEO title on an inner page too", () => {
    const inner = goodPage({
      isHomePage: false,
      pageType: "NORMAL",
      slug: "services",
      path: "/services",
      seoTitle: "",
    });

    const issue = evaluatePageQuality(inner, { themeConfig: GOOD_THEME }).issues.find(
      (candidate) => candidate.code === "SEO_TITLE_MISSING",
    );

    assert.ok(issue);
    assert.equal(issue.severity, "warning");
  });

  it("warns on SEO text outside the useful length range", () => {
    const codes = codesOf(
      evaluateSiteQuality(
        goodSite(goodPage({ seoTitle: "ก".repeat(70), seoDescription: "สั้นไป" })),
      ).issues,
    );

    assert.ok(codes.includes("SEO_TITLE_TOO_LONG"));
    assert.ok(codes.includes("SEO_DESCRIPTION_LENGTH"));
  });

  it("warns when the home page has no share image", () => {
    assert.ok(
      codesOf(evaluateSiteQuality(goodSite(goodPage({ ogImageUrl: "" }))).issues).includes(
        "SEO_OG_IMAGE_MISSING",
      ),
    );
  });

  it("skips SEO checks for unpublished drafts", () => {
    const draft = goodPage({
      isPublished: false,
      seoTitle: "",
      seoDescription: "",
      ogImageUrl: "",
    });

    const codes = codesOf(evaluateSiteQuality(goodSite(draft)).issues);
    assert.ok(!codes.some((code) => code.startsWith("SEO_")));
  });
});

describe("evaluatePageQuality", () => {
  it("skips site-level rules that a single page cannot answer", () => {
    const codes = codesOf(
      evaluatePageQuality(goodPage(), { themeConfig: GOOD_THEME }).issues,
    );

    assert.ok(!codes.includes("SITE_HOME_PAGE_REQUIRED"));
    assert.ok(!codes.includes("PAGE_SLUG_DUPLICATE"));
  });

  it("still applies page rules and defaults to Thai", () => {
    const page = goodPage({
      sections: [navbar(), { ...hero(), props: { ...hero().props, imageUrl: "" } }, leadForm()],
    });

    const report = evaluatePageQuality(page);
    assert.equal(report.passed, false);
    assert.ok(codesOf(report.issues).includes("MEDIA_IMAGE_EMPTY"));
  });
});

describe("color utilities", () => {
  it("computes known WCAG ratios", () => {
    assert.equal(contrastRatio("#FFFFFF", "#000000"), 21);
    assert.equal(contrastRatio("#FFFFFF", "#FFFFFF"), 1);
  });

  it("parses shorthand hex and rejects non-hex values", () => {
    assert.deepEqual(parseHexColor("#fff"), { r: 255, g: 255, b: 255 });
    assert.equal(parseHexColor("var(--color-primary)"), null);
    assert.equal(contrastRatio("linear-gradient(#fff, #000)", "#000000"), null);
  });

  it("recognises the brand flame hues", () => {
    assert.equal(isFlameColor("#FF8C00"), true);
    assert.equal(isFlameColor("#ff4500"), true);
    assert.equal(isFlameColor("#1A1C23"), false);
  });
});
