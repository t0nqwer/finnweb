import { Injectable, Logger } from "@nestjs/common";
import type { ImportTemplateDraftDto } from "./dto/import-template-draft.dto";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekChoice = {
  message?: {
    content?: string;
  };
};

type DeepSeekResponse = {
  choices?: DeepSeekChoice[];
};

@Injectable()
export class AdminTemplateAiService {
  private readonly logger = new Logger(AdminTemplateAiService.name);

  isEnabled() {
    return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  }

  async enhanceTemplateDraft(
    capture: ImportTemplateDraftDto,
    template: Record<string, unknown>,
  ) {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return {
        template,
        usedAi: false,
      };
    }

    const prompt = this.buildPrompt(capture, template);
    const messages: DeepSeekMessage[] = [
      {
        role: "system",
        content:
          "You are a senior website-to-template reconstruction designer for FinnWeb. Return only strict JSON. Build editable templates from captured source data using only approved FinnWeb section types and safe motion metadata.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await fetch(
      process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`DeepSeek API failed: ${response.status} ${body.slice(0, 400)}`);
      return {
        template,
        usedAi: false,
      };
    }

    const payload = (await response.json()) as DeepSeekResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return {
        template,
        usedAi: false,
      };
    }

    try {
      const parsed = JSON.parse(content) as { template?: Record<string, unknown> };
      if (!parsed?.template || typeof parsed.template !== "object") {
        return { template, usedAi: false };
      }

      return {
        template: parsed.template,
        usedAi: true,
      };
    } catch {
      return {
        template,
        usedAi: false,
      };
    }
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
