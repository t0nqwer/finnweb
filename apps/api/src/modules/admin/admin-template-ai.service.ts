import { Inject, Injectable } from "@nestjs/common";
import type { ImportTemplateDraftDto } from "./dto/import-template-draft.dto";
import { DeepSeekClient } from "../ai/deepseek.client";

@Injectable()
export class AdminTemplateAiService {
  constructor(
    @Inject(DeepSeekClient) private readonly deepSeek: DeepSeekClient,
  ) {}

  isEnabled() {
    return this.deepSeek.isEnabled();
  }

  async enhanceTemplateDraft(
    capture: ImportTemplateDraftDto,
    template: Record<string, unknown>,
  ) {
    const result = await this.deepSeek.completeJson<{
      template?: Record<string, unknown>;
    }>({
      system:
        "You are a senior website-to-template reconstruction designer for FinnWeb. Return only strict JSON. Build editable templates from captured source data using only approved FinnWeb section types and safe motion metadata.",
      user: this.buildPrompt(capture, template),
    });

    if (!result.usedAi || !result.data?.template) {
      return { template, usedAi: false };
    }

    return { template: result.data.template, usedAi: true };
  }

  private buildPrompt(
    capture: ImportTemplateDraftDto,
    template: Record<string, unknown>,
  ) {
    const compactCapture = {
      sourceUrl: capture.sourceUrl,
      name: capture.name,
      language: capture.language,
      industry: capture.industry,
      goals: capture.goals,
      styleKeywords: capture.styleKeywords,
      pages: capture.pages?.slice(0, 5).map((page) => ({
        url: page.url,
        title: page.title,
        headings: page.headings?.slice(0, 24),
        textBlocks: page.textBlocks?.slice(0, 40),
        stats: page.stats?.slice(0, 8),
        cards: page.cards?.slice(0, 18),
        logos: page.logos?.slice(0, 10),
        faqs: page.faqs?.slice(0, 8),
        images: page.images?.slice(0, 20),
        colorSamples: page.colorSamples?.slice(0, 8),
        fontFamilies: page.fontFamilies?.slice(0, 6),
        links: page.links?.slice(0, 24),
        forms: page.forms?.slice(0, 4),
      })),
    };

    return [
      "Improve this FinnWeb template draft with higher visual quality and animation intent while keeping it editable.",
      "Supported section types: NAVBAR, HERO, FEATURE, TESTIMONIAL, FAQ, CONTACT, CTA, FORM, CONTENT, FOOTER, PRICING, GALLERY, ABOUT.",
      "Approved high-design variants:",
      "- NAVBAR: stickyAnimated",
      "- HERO: educationEditorial",
      "- CONTENT: metricStrip, featuredGrid, logoStrip, categoryGrid, insightsGrid, courses",
      "- FEATURE: bentoLearning",
      "- TESTIMONIAL: bentoProof",
      "- FAQ: splitAccordion",
      "- CTA: floatingAvatars",
      "- FOOTER: largeDark",
      "Hard rules:",
      "1) You may add, remove, or reorder sections only with the supported section types above.",
      "2) Keep valid JSON and same top-level schema.",
      "3) Do not add arbitrary JavaScript.",
      "4) Keep Thai-first copy if language is thai.",
      "5) Keep motion metadata safe under props.motion only.",
      "6) Avoid empty placeholder sections. Every visible card needs useful title and description or media.",
      "7) Preserve real source images, colors, and course/article/category labels where captured.",
      "8) For education/course websites, prefer a DevOnMars-like composition: sticky navbar, editorial hero with metrics inside the hero, featured courses, bento features, categories, testimonials, FAQ, CTA/contact, large footer.",
      "9) Do not duplicate the same metrics/stats in both HERO props.stats and a separate CONTENT metricStrip section. Use metricStrip only when the source has a standalone stats band that is not already represented in the hero.",
      "",
      "Return strictly as:",
      '{"template": { ...full_template_json... }}',
      "",
      `Captured source summary: ${JSON.stringify(compactCapture)}`,
      `Current template draft: ${JSON.stringify(template)}`,
    ].join("\n");
  }
}
