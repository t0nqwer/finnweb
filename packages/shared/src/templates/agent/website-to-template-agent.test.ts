import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTemplateDraftFromWebsiteProfile,
  createWebsiteProfileFromCapture,
} from "./website-to-template-agent";
import type { WebsiteProfile } from "./website-to-template-agent.types";

const PROFILE: WebsiteProfile = {
  sourceUrl: "https://example-agency.test",
  name: "Example Agency",
  description: "High-conversion creative agency website.",
  language: "thai-english",
  industry: "agency",
  goals: ["leads"],
  styleKeywords: ["bold", "animated"],
  designTokens: {
    colors: {
      background: "#111318",
      text: "#f7f5ef",
      primary: "#ff8c00",
      accent: "#61dafb",
    },
    fonts: {
      heading: "Kanit",
      body: "Kanit",
    },
    radius: "16px",
  },
  assets: [
    {
      role: "logo",
      url: "https://example-agency.test/logo.png",
      alt: "Example Agency logo",
    },
    {
      role: "hero",
      url: "https://example-agency.test/hero.jpg",
      alt: "Team in studio",
    },
  ],
  animations: [
    {
      name: "hero-reveal",
      trigger: "load",
      target: "hero-main",
      intensity: "medium",
    },
  ],
  pages: [
    {
      title: "Home",
      path: "/",
      description: "Creative agency home page.",
      keywords: ["agency", "landing page"],
      sections: [
        {
          id: "top-nav",
          kind: "navbar",
          links: [
            { label: "Work", href: "#work" },
            { label: "Contact", href: "#contact" },
          ],
        },
        {
          id: "hero-main",
          kind: "hero",
          heading: "Creative Agency ที่ขับเคลื่อนด้วยผลลัพธ์",
          body: "ออกแบบเว็บไซต์ แคมเปญ และประสบการณ์ดิจิทัลที่พร้อมปิดลีด",
          ctaLabel: "ดูผลงาน",
          ctaHref: "#work",
          imageUrl: "https://example-agency.test/hero.jpg",
        },
        {
          id: "service-grid",
          kind: "features",
          heading: "บริการครบวงจร",
          items: [
            { title: "Website", body: "ออกแบบและพัฒนาเว็บ" },
            { title: "Campaign", body: "หน้า Landing สำหรับยิง Ads" },
          ],
          motion: [
            {
              name: "card-rise",
              trigger: "scroll",
              intensity: "subtle",
            },
          ],
        },
        {
          id: "lead-form",
          kind: "form",
          heading: "คุยกับทีมเรา",
          ctaLabel: "ส่งข้อมูล",
        },
      ],
    },
  ],
};

describe("createTemplateDraftFromWebsiteProfile", () => {
  it("creates a reviewable FinnWeb template draft", () => {
    const result = createTemplateDraftFromWebsiteProfile(PROFILE);

    assert.equal(result.template.name, "Example Agency");
    assert.equal(result.template.slug, "example-agency");
    assert.equal(result.template.category, "agency");
    assert.deepEqual(result.template.businessTypes, ["agency", "service"]);
    assert.ok(result.template.goals.includes("leads"));
    assert.ok(result.template.styles.includes("animated"));
    assert.ok(result.template.languages.includes("thai-english"));
    assert.equal(result.template.pages.length, 1);
  });

  it("maps website sections to supported FinnWeb section types", () => {
    const result = createTemplateDraftFromWebsiteProfile(PROFILE);
    const home = result.template.pages[0];
    const types = home?.sections.map((section) => section.type);

    assert.ok(types?.includes("NAVBAR"));
    assert.ok(types?.includes("HERO"));
    assert.ok(types?.includes("FEATURE"));
    assert.ok(types?.includes("FORM"));
    assert.ok(types?.includes("FOOTER"));
  });

  it("keeps animation signals as section motion props", () => {
    const result = createTemplateDraftFromWebsiteProfile(PROFILE);
    const hero = result.template.pages[0]?.sections.find(
      (section) => section.type === "HERO",
    );
    const feature = result.template.pages[0]?.sections.find(
      (section) => section.type === "FEATURE",
    );

    assert.deepEqual(hero?.props?.["motion"], [
      {
        name: "hero-reveal",
        trigger: "load",
        target: "hero-main",
        intensity: "medium",
      },
    ]);
    assert.deepEqual(feature?.props?.["motion"], [
      {
        name: "card-rise",
        trigger: "scroll",
        intensity: "subtle",
      },
    ]);
  });

  it("adds safe fallbacks when required template sections are missing", () => {
    const result = createTemplateDraftFromWebsiteProfile({
      sourceUrl: "https://minimal.test",
      pages: [
        {
          title: "Minimal",
          sections: [{ kind: "content", heading: "Only content" }],
        },
      ],
    });

    const types = result.template.pages[0]?.sections.map((section) => section.type);
    assert.ok(types?.includes("NAVBAR"));
    assert.ok(types?.includes("HERO"));
    assert.ok(types?.includes("FOOTER"));
    assert.ok(result.warnings.some((warning) => warning.includes("hero")));
  });
});

describe("createWebsiteProfileFromCapture", () => {
  it("normalizes captured website data into an editable profile", () => {
    const profile = createWebsiteProfileFromCapture({
      sourceUrl: "https://studio.test",
      name: "Studio Test",
      industry: "agency",
      pages: [
        {
          url: "https://studio.test/",
          title: "Studio Test",
          metaDescription: "Strategy and websites for growing brands.",
          headings: ["Launch faster", "Strategy", "Website systems"],
          textBlocks: [
            "We help teams launch high-converting websites with clear messaging.",
            "Analytics",
          ],
          links: [
            { label: "Work", href: "#work" },
            { label: "Contact", href: "#contact" },
            { label: "Contact", href: "#contact" },
          ],
          images: [
            {
              url: "https://studio.test/logo.svg",
              alt: "Studio Test logo",
              width: 120,
              height: 40,
            },
            {
              url: "https://studio.test/hero.jpg",
              alt: "Team workshop",
              width: 1600,
              height: 900,
            },
          ],
          forms: [
            {
              id: "lead",
              title: "Start a project",
              action: "#contact",
              fields: ["name", "email", "phone"],
            },
          ],
          colorSamples: ["#1A1C23", "#2D2F39", "#FF8C00"],
          fontFamilies: ["Kanit", "sans-serif"],
        },
      ],
    });

    assert.equal(profile.name, "Studio Test");
    assert.deepEqual(profile.goals, ["leads"]);
    assert.ok(profile.styleKeywords?.includes("dark"));
    assert.equal(profile.designTokens?.colors?.background, "#1A1C23");
    assert.equal(profile.designTokens?.fonts?.heading, "Kanit");
    assert.equal(profile.assets?.[0]?.role, "logo");
    assert.equal(profile.assets?.[1]?.role, "hero");
    assert.equal(profile.pages[0]?.sections[0]?.kind, "navbar");
    assert.equal(profile.pages[0]?.sections[1]?.kind, "hero");
    assert.equal(profile.pages[0]?.sections[2]?.kind, "features");
    assert.equal(profile.pages[0]?.sections[3]?.kind, "form");
  });

  it("feeds captured data through template draft creation", () => {
    const profile = createWebsiteProfileFromCapture({
      sourceUrl: "https://booking.test",
      language: "thai",
      pages: [
        {
          url: "https://booking.test/",
          title: "Booking Test",
          headings: ["Book your consultation"],
          links: [{ label: "Book now", href: "/booking" }],
          images: [{ url: "https://booking.test/cover.jpg", width: 1200, height: 800 }],
        },
      ],
    });
    const result = createTemplateDraftFromWebsiteProfile(profile);
    const home = result.template.pages[0];

    assert.equal(result.template.name, "Booking Test");
    assert.ok(result.template.goals.includes("booking"));
    assert.equal(home?.path, "/");
    assert.ok(home?.sections.some((section) => section.type === "HERO"));
    assert.ok(home?.sections.some((section) => section.type === "FOOTER"));
  });
});
