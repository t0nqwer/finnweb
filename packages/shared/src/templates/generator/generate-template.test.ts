import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateTemplate } from "./generate-template";
import {
  getAvailableBlueprints,
  getAvailableThemes,
  getAvailableContentPacks,
} from "./generate-template";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_INPUT = {
  industry: "restaurant",
  blueprintId: "restaurant-landing-v1",
  themeId: "modern-orange",
  contentPackId: "mala-restaurant-th",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateTemplate", () => {
  it("returns a GeneratedTemplate with correct metadata", () => {
    const result = generateTemplate(BASE_INPUT);

    assert.equal(result.blueprintId, BASE_INPUT.blueprintId);
    assert.equal(result.themeId, BASE_INPUT.themeId);
    assert.equal(result.contentPackId, BASE_INPUT.contentPackId);
    assert.equal(result.industry, BASE_INPUT.industry);
    assert.ok(result.id.startsWith("generated-"));
    assert.ok(result.name.length > 0);
  });

  it("includes themeConfig tokens", () => {
    const result = generateTemplate(BASE_INPUT);

    assert.ok(typeof result.themeConfig === "object");
    assert.ok("--color-primary" in result.themeConfig);
  });

  it("generates at least one page", () => {
    const result = generateTemplate(BASE_INPUT);

    assert.ok(result.pages.length > 0);
  });

  it("first page is home page with correct path", () => {
    const result = generateTemplate(BASE_INPUT);
    const home = result.pages[0];

    assert.ok(home !== undefined, "should have home page");
    assert.equal(home.isHomePage, true);
    assert.equal(home.path, "/");
  });

  it("pages contain sections matching the blueprint", () => {
    const result = generateTemplate(BASE_INPUT);
    const home = result.pages[0];

    assert.ok(home !== undefined);
    assert.ok(home.sections.length > 0);

    const types = home.sections.map((s) => s.type);
    assert.ok(types.includes("NAVBAR"), "should have NAVBAR");
    assert.ok(types.includes("HERO"), "should have HERO");
    assert.ok(types.includes("FOOTER"), "should have FOOTER");
  });

  it("resolves {{placeholder}} tokens in section props", () => {
    const result = generateTemplate(BASE_INPUT);
    const home = result.pages[0];
    const contact = home?.sections.find((s) => s.type === "CONTACT");

    assert.ok(contact !== undefined, "should have CONTACT section");
    assert.equal(contact.props["phone"], "081-234-5678");
    assert.equal(contact.props["lineId"], "@malahouse");
  });

  it("does NOT leave unresolved {{placeholder}} tokens", () => {
    const result = generateTemplate(BASE_INPUT);
    const json = JSON.stringify(result);
    const unresolved = json.match(/\{\{[^}]+\}\}/g);

    assert.equal(
      unresolved,
      null,
      `Unresolved placeholders found: ${JSON.stringify(unresolved)}`,
    );
  });

  it("applies theme section overrides to HERO props", () => {
    const result = generateTemplate(BASE_INPUT);
    const home = result.pages[0];
    const hero = home?.sections.find((s) => s.type === "HERO");

    assert.ok(hero !== undefined, "should have HERO section");
    assert.equal(hero.props["accentColor"], "#FF8C00");
  });

  it("generates luxury-dark variant with correct primary color", () => {
    const result = generateTemplate({
      ...BASE_INPUT,
      themeId: "luxury-dark",
    });

    assert.equal(result.themeConfig["--color-primary"], "#D4AF37");
  });

  it("generates cafe-th content-pack variant", () => {
    const result = generateTemplate({
      ...BASE_INPUT,
      contentPackId: "cafe-th",
    });

    const contact = result.pages[0]?.sections.find((s) => s.type === "CONTACT");

    assert.ok(contact !== undefined);
    assert.equal(contact.props["phone"], "091-876-5432");
  });

  it("generates premium aesthetic clinic showcase with complete motion sections", () => {
    const result = generateTemplate({
      industry: "clinic",
      blueprintId: "aesthetic-clinic-landing-v1",
      themeId: "deep-space-premium",
      contentPackId: "aesthetic-clinic-th",
    });

    const home = result.pages[0];
    assert.ok(home !== undefined);
    assert.equal(result.themeConfig["--fw-bg"], "#1A1C23");
    assert.equal(home.sections.length, 9);

    const types = home.sections.map((section) => section.type);
    for (const type of [
      "NAVBAR",
      "HERO",
      "FEATURE",
      "GALLERY",
      "TESTIMONIAL",
      "FAQ",
      "CONTACT",
      "FOOTER",
    ]) {
      assert.ok(types.includes(type), `should include ${type}`);
    }

    const hero = home.sections.find((section) => section.type === "HERO");
    const gallery = home.sections.find((section) => section.type === "GALLERY");
    const contact = home.sections.find((section) => section.type === "CONTACT");

    assert.ok(Array.isArray(hero?.props["motion"]));
    assert.ok(Array.isArray(gallery?.props["items"]));
    assert.ok((gallery?.props["items"] as unknown[]).length >= 3);
    assert.equal(contact?.props["href"], "https://line.me/R/ti/p/@lunara.clinic");
    assert.equal(JSON.stringify(result).match(/\{\{[^}]+\}\}/g), null);
  });

  it("supports 4 combinations without throwing", () => {
    const combos = [
      { themeId: "modern-orange", contentPackId: "mala-restaurant-th" },
      { themeId: "modern-orange", contentPackId: "cafe-th" },
      { themeId: "luxury-dark", contentPackId: "mala-restaurant-th" },
      { themeId: "luxury-dark", contentPackId: "cafe-th" },
    ];

    for (const combo of combos) {
      assert.doesNotThrow(() => generateTemplate({ ...BASE_INPUT, ...combo }));
    }
  });

  it("generates unique IDs for different combos", () => {
    const combos = [
      { themeId: "modern-orange", contentPackId: "mala-restaurant-th" },
      { themeId: "modern-orange", contentPackId: "cafe-th" },
      { themeId: "luxury-dark", contentPackId: "mala-restaurant-th" },
      { themeId: "luxury-dark", contentPackId: "cafe-th" },
    ];

    const ids = combos.map((c) => generateTemplate({ ...BASE_INPUT, ...c }).id);

    assert.equal(ids.length, new Set(ids).size, "IDs should be unique");
  });

  it("throws when blueprint ID is unknown", () => {
    assert.throws(
      () =>
        generateTemplate({ ...BASE_INPUT, blueprintId: "unknown-blueprint" }),
      /Blueprint not found/,
    );
  });

  it("throws when theme ID is unknown", () => {
    assert.throws(
      () => generateTemplate({ ...BASE_INPUT, themeId: "unknown-theme" }),
      /Theme not found/,
    );
  });

  it("throws when content-pack ID is unknown", () => {
    assert.throws(
      () => generateTemplate({ ...BASE_INPUT, contentPackId: "unknown-pack" }),
      /ContentPack not found/,
    );
  });

  it("variantSeed is included in the generated ID", () => {
    const result = generateTemplate({ ...BASE_INPUT, variantSeed: "v2" });
    assert.ok(result.id.includes("v2"));
  });

  it("placeholderOverrides take precedence over content-pack defaults", () => {
    const result = generateTemplate({
      ...BASE_INPUT,
      placeholderOverrides: { phone: "099-999-9999" },
    });

    const contact = result.pages[0]?.sections.find((s) => s.type === "CONTACT");
    assert.equal(contact?.props["phone"], "099-999-9999");
  });
});

describe("registry accessors", () => {
  it("getAvailableBlueprints returns at least one entry", () => {
    const list = getAvailableBlueprints();
    assert.ok(list.length > 0);
    assert.ok(list.every((b) => b.id && b.name && b.industry));
  });

  it("getAvailableThemes returns both themes", () => {
    const list = getAvailableThemes();
    assert.ok(list.length >= 2);
    const ids = list.map((t) => t.id);
    assert.ok(ids.includes("modern-orange"));
    assert.ok(ids.includes("luxury-dark"));
    assert.ok(ids.includes("deep-space-premium"));
  });

  it("getAvailableContentPacks returns both packs", () => {
    const list = getAvailableContentPacks();
    assert.ok(list.length >= 2);
    const ids = list.map((c) => c.id);
    assert.ok(ids.includes("mala-restaurant-th"));
    assert.ok(ids.includes("cafe-th"));
    assert.ok(ids.includes("aesthetic-clinic-th"));
  });
});
