import { describe, it } from "node:test";
import assert from "node:assert";
import { validate } from "class-validator";
import { CreatePageDto, PAGE_TYPES } from "../dto/create-page.dto";
import { UpdatePageDto } from "../dto/update-page.dto";

describe("Page DTOs Validation", () => {
  describe("CreatePageDto", () => {
    it("should accept valid page creation", async () => {
      const dto = new CreatePageDto();
      dto.title = "My New Page";
      dto.slug = "my-new-page";
      dto.path = "/my-new-page";
      dto.pageType = "NORMAL";
      dto.isPublished = false;

      const errors = await validate(dto);
      assert.strictEqual(errors.length, 0, "Should have no validation errors");
    });

    it("should require title", async () => {
      const dto = new CreatePageDto();
      dto.slug = "no-title-page";

      const errors = await validate(dto);
      assert.ok(errors.length > 0, "Should require title");
      assert.ok(
        errors.some((e) => e.property === "title"),
        "Should have title error",
      );
    });

    it("should reject empty title", async () => {
      const dto = new CreatePageDto();
      dto.title = "";
      dto.slug = "empty-title";

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "title"),
        "Should reject empty title",
      );
    });

    it("should reject title longer than 150 chars", async () => {
      const dto = new CreatePageDto();
      dto.title = "a".repeat(151);
      dto.slug = "long-title";

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "title"),
        "Should reject long title",
      );
    });

    it("should accept slug with lowercase letters, numbers, and hyphens", async () => {
      const dto = new CreatePageDto();
      dto.title = "Valid Slug Test";
      dto.slug = "valid-slug-123";

      const errors = await validate(dto);
      assert.ok(
        !errors.some((e) => e.property === "slug"),
        "Should accept valid slug pattern",
      );
    });

    it("should reject slug with uppercase letters", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "Invalid-Slug";

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "slug"),
        "Should reject uppercase in slug",
      );
    });

    it("should reject slug with special characters", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "invalid@slug#page";

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "slug"),
        "Should reject special chars in slug",
      );
    });

    it("should accept valid page types", async () => {
      for (const pageType of PAGE_TYPES) {
        const dto = new CreatePageDto();
        dto.title = "Test Page";
        dto.slug = `test-${pageType}`;
        dto.pageType = pageType as any;

        const errors = await validate(dto);
        const pageTypeErrors = errors.filter((e) => e.property === "pageType");
        assert.strictEqual(
          pageTypeErrors.length,
          0,
          `Should accept pageType: ${pageType}`,
        );
      }
    });

    it("should reject invalid pageType", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "test";
      dto.pageType = "INVALID_TYPE" as any;

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "pageType"),
        "Should reject invalid pageType",
      );
    });

    it("should accept boolean isPublished", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "test";
      dto.isPublished = true;

      const errors = await validate(dto);
      assert.ok(
        !errors.some((e) => e.property === "isPublished"),
        "Should accept boolean isPublished",
      );
    });

    it("should accept long path", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "test";
      dto.path = "/about/our-team/contact";

      const errors = await validate(dto);
      assert.ok(
        !errors.some((e) => e.property === "path"),
        "Should accept nested path",
      );
    });

    it("should accept SEO fields", async () => {
      const dto = new CreatePageDto();
      dto.title = "Test";
      dto.slug = "test";
      dto.seoTitle = "SEO Title for Page";
      dto.seoDescription = "This is the page description for search engines";
      dto.seoKeywords = "keyword1, keyword2, keyword3";
      dto.ogImageUrl = "https://example.com/og-image.jpg";

      const errors = await validate(dto);
      const seoErrors = errors.filter((e) =>
        ["seoTitle", "seoDescription", "seoKeywords", "ogImageUrl"].includes(
          e.property,
        ),
      );
      assert.strictEqual(seoErrors.length, 0, "Should accept SEO fields");
    });
  });

  describe("UpdatePageDto", () => {
    it("should allow updating individual fields", async () => {
      const dto = new UpdatePageDto();
      dto.title = "Updated Title";

      const errors = await validate(dto);
      assert.strictEqual(errors.length, 0, "Should allow updating just title");
    });

    it("should allow partial updates", async () => {
      const dto = new UpdatePageDto();
      dto.isPublished = true;
      dto.slug = "new-slug";

      const errors = await validate(dto);
      assert.strictEqual(
        errors.length,
        0,
        "Should allow multiple field updates",
      );
    });

    it("should validate updated slug pattern", async () => {
      const dto = new UpdatePageDto();
      dto.slug = "Invalid-Slug!";

      const errors = await validate(dto);
      assert.ok(
        errors.some((e) => e.property === "slug"),
        "Should validate slug format on update",
      );
    });

    it("should allow empty for optional home page field when changing publish state", async () => {
      const dto = new UpdatePageDto();
      dto.isPublished = true;

      const errors = await validate(dto);
      assert.strictEqual(
        errors.length,
        0,
        "Should allow updating just publish state",
      );
    });
  });

  describe("Slug Generation Edge Cases", () => {
    it("should handle titles with spaces", () => {
      const title = "My Blog Post Title";
      // Simulate slug generation
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      assert.strictEqual(slug, "my-blog-post-title");
    });

    it("should handle titles with special characters", () => {
      const title = "Service & Support (FAQ)";
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      assert.strictEqual(slug, "service--support-faq");
    });

    it("should handle titles with consecutive hyphens", () => {
      const title = "Test---Title";
      const slug = title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-");

      assert.strictEqual(slug, "test-title");
    });

    it("should handle Thai characters", () => {
      const title = "เกี่ยวกับเรา";
      const slug = title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Thai characters get stripped, so slug becomes empty or needs to fallback
      assert.strictEqual(slug, "");
    });
  });
});
