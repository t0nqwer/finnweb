import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  evaluatePageQuality,
  type QualityPage,
  type QualityReport,
} from "@finnweb/shared";
import { PrismaService } from "@/prisma/prisma.service";
import { DeepSeekClient } from "../ai/deepseek.client";
import {
  applyCopyProposals,
  collectCopySlots,
  isProposalAcceptable,
  sanitizeProposals,
  type CopyProposal,
  type CopySlot,
  type SectionLike,
} from "./site-content-ai.logic";

export type BusinessProfileInput = {
  /** Falls back to Site.name when omitted. */
  businessName?: string;
  businessType?: string;
  audience?: string;
  tone?: string;
  highlights?: string[];
};

export type ContentFillProposal = {
  pageId: string;
  usedAi: boolean;
  /** Why the page was left as-is, when nothing was applied. */
  fallbackReason?: "ai_disabled" | "ai_unavailable" | "no_usable_copy" | "not_better";
  attempts: number;
  quality: QualityReport;
  sections: Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    changedKeys: string[];
  }>;
};

/** How many times the model gets to answer before we keep the original copy. */
const MAX_ATTEMPTS = 2;

@Injectable()
export class SiteContentAiService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(DeepSeekClient) private readonly deepSeek: DeepSeekClient,
  ) {}

  /**
   * Rewrites a page's copy in Thai and returns it as a proposal.
   *
   * Nothing is written to the database: the caller applies the result through
   * the normal section-update path, so AI-written copy goes through exactly the
   * same validation as copy typed by hand.
   */
  async proposePageContent({
    userId,
    siteId,
    pageId,
    profile,
  }: {
    userId: string;
    siteId: string;
    pageId: string;
    profile: BusinessProfileInput;
  }): Promise<ContentFillProposal> {
    const page = await this.loadAccessiblePage(userId, siteId, pageId);
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { themeConfig: true, name: true },
    });

    const themeConfig =
      site?.themeConfig && typeof site.themeConfig === "object"
        ? (site.themeConfig as Record<string, string>)
        : null;

    const sections: Array<SectionLike & { id: string }> = page.sections.map(
      (section) => ({
        id: section.id,
        type: section.type,
        isVisible: section.isVisible,
        props: (section.props ?? {}) as Record<string, unknown>,
      }),
    );

    const baseline = this.evaluate(page, sections, themeConfig);
    const slots = collectCopySlots(sections);

    if (slots.length === 0) {
      return this.unchanged(page.id, baseline, sections, "no_usable_copy");
    }

    if (!this.deepSeek.isEnabled()) {
      return this.unchanged(page.id, baseline, sections, "ai_disabled");
    }

    let attempts = 0;
    let lastIssueFeedback: string | null = null;

    while (attempts < MAX_ATTEMPTS) {
      attempts += 1;

      const result = await this.deepSeek.completeJson<{
        proposals?: CopyProposal[];
      }>({
        system:
          "You are a Thai SME copywriter for FinnWeb. Write natural, concrete Thai marketing copy. Return only strict JSON.",
        user: this.buildPrompt(
          { ...profile, businessName: profile.businessName || site?.name || "" },
          slots,
          lastIssueFeedback,
        ),
        temperature: 0.4,
      });

      if (!result.usedAi || !result.data) {
        return this.unchanged(page.id, baseline, sections, "ai_unavailable");
      }

      const proposals = sanitizeProposals(
        Array.isArray(result.data.proposals) ? result.data.proposals : [],
        slots,
      );

      if (proposals.length === 0) {
        lastIssueFeedback =
          "คำตอบก่อนหน้าไม่มีข้อความไทยที่ใช้ได้เลย กรุณาตอบเป็นภาษาไทยล้วนและห้ามใส่ {{ }}";
        continue;
      }

      const candidateSections = applyCopyProposals(sections, proposals);
      const candidate = this.evaluate(page, candidateSections, themeConfig);

      if (isProposalAcceptable(baseline, candidate)) {
        return {
          pageId: page.id,
          usedAi: true,
          attempts,
          quality: candidate,
          sections: candidateSections.map((section, index) => ({
            id: section.id,
            type: section.type,
            props: (section.props ?? {}) as Record<string, unknown>,
            changedKeys: proposals
              .filter((proposal) => proposal.sectionIndex === index)
              .map((proposal) => proposal.key),
          })),
        };
      }

      // Hand the model the exact rules it broke and let it try once more.
      lastIssueFeedback = candidate.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => `${issue.path}: ${issue.ownerMessage}`)
        .join("\n");
    }

    return this.unchanged(page.id, baseline, sections, "not_better");
  }

  private evaluate(
    page: { title: string; slug: string; path: string | null; pageType: string; isHomePage: boolean },
    sections: SectionLike[],
    themeConfig: Record<string, string> | null,
  ): QualityReport {
    const qualityPage: QualityPage = {
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      isHomePage: page.isHomePage,
      isPublished: true,
      sections: sections.map((section, index) => ({
        type: section.type,
        sortOrder: index,
        isVisible: section.isVisible !== false,
        props: (section.props ?? null) as Record<string, unknown> | null,
      })),
    };

    return evaluatePageQuality(qualityPage, { themeConfig, locale: "th" });
  }

  private unchanged(
    pageId: string,
    quality: QualityReport,
    sections: Array<SectionLike & { id: string }>,
    fallbackReason: ContentFillProposal["fallbackReason"],
  ): ContentFillProposal {
    return {
      pageId,
      usedAi: false,
      fallbackReason,
      attempts: 0,
      quality,
      sections: sections.map((section) => ({
        id: section.id,
        type: section.type,
        props: (section.props ?? {}) as Record<string, unknown>,
        changedKeys: [],
      })),
    };
  }

  private buildPrompt(
    profile: BusinessProfileInput,
    slots: CopySlot[],
    issueFeedback: string | null,
  ) {
    return [
      "เขียนข้อความการตลาดภาษาไทยสำหรับเว็บไซต์ธุรกิจ SME ตามข้อมูลด้านล่าง",
      profile.businessName ? `ชื่อธุรกิจ: ${profile.businessName}` : "",
      profile.businessType ? `ประเภทธุรกิจ: ${profile.businessType}` : "",
      profile.audience ? `กลุ่มลูกค้า: ${profile.audience}` : "",
      profile.tone ? `โทนการสื่อสาร: ${profile.tone}` : "",
      profile.highlights?.length
        ? `จุดเด่น: ${profile.highlights.join(", ")}`
        : "",
      "",
      "กติกา:",
      "1) ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ {{ }} และห้ามใส่ข้อความตัวอย่างอย่าง lorem ipsum",
      "2) หัวข้อ (title/heading) ต้องสั้นกว่า 70 ตัวอักษร",
      "3) ห้ามเขียนหัวข้อซ้ำกันระหว่าง section",
      "4) เขียนให้เป็นรูปธรรม อ้างอิงธุรกิจจริง ไม่ใช่คำโฆษณาลอย ๆ",
      "5) แก้เฉพาะช่องที่ให้มา ห้ามเพิ่มหรือลบช่อง",
      issueFeedback
        ? `\nคำตอบก่อนหน้ายังมีปัญหาเหล่านี้ กรุณาแก้:\n${issueFeedback}`
        : "",
      "",
      "ช่องข้อความที่ต้องเขียน (JSON):",
      JSON.stringify(
        slots.map((slot) => ({
          sectionIndex: slot.sectionIndex,
          sectionType: slot.sectionType,
          key: slot.key,
          current: slot.current,
        })),
      ),
      "",
      "ตอบกลับในรูปแบบนี้เท่านั้น:",
      '{"proposals":[{"sectionIndex":0,"key":"title","value":"..."}]}',
    ]
      .filter(Boolean)
      .join("\n");
  }

  private async loadAccessiblePage(
    userId: string,
    siteId: string,
    pageId: string,
  ) {
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        siteId,
        site: {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
      include: {
        sections: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            type: true,
            isVisible: true,
            props: true,
          },
        },
      },
    });

    if (!page) {
      throw new BadRequestException("PAGE_NOT_FOUND_OR_FORBIDDEN");
    }

    return page;
  }
}
