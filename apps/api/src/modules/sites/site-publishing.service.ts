import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type * as runtime from "@prisma/client/runtime/client";
import {
  blockingIssues,
  evaluateSiteQuality,
  type QualityIssue,
  type QualityPage,
  type QualityReport,
} from "@finnweb/shared";
import { PrismaService } from "@/prisma/prisma.service";

/** A draft page with the fields publish needs, as loaded from Prisma. */
type PublishablePage = {
  id: string;
  title: string;
  slug: string;
  path: string | null;
  pageType: string;
  isHomePage: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  sections: Array<{
    id: string;
    type: string;
    name: string | null;
    sortOrder: number;
    isVisible: boolean;
    props: unknown;
  }>;
};

@Injectable()
export class SitePublishingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async getAccessibleSite(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        workspace: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        workspace: {
          include: {
            subscriptions: {
              where: {
                isCurrent: true,
              },
              include: {
                plan: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
    });

    if (!site) {
      throw new BadRequestException("SITE_NOT_FOUND_OR_FORBIDDEN");
    }

    return site;
  }

  private buildPublicUrlFromDomainOrSlug(input: {
    host?: string | null;
    slug: string;
  }) {
    const host = input.host?.trim().toLowerCase();
    if (host) {
      return `https://${host}`;
    }

    return `https://${input.slug}.finnweb.co`;
  }

  private toQualityPages(pages: PublishablePage[]): QualityPage[] {
    return pages.map((page) => ({
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      isHomePage: page.isHomePage,
      // Publishing marks every page published, so SEO rules apply as they will
      // apply to the live site rather than to the current draft flags.
      isPublished: true,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoKeywords: page.seoKeywords,
      ogImageUrl: page.ogImageUrl,
      sections: page.sections.map((section) => ({
        type: section.type,
        name: section.name,
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        props: (section.props ?? null) as Record<string, unknown> | null,
      })),
    }));
  }

  private async loadPublishablePages(siteId: string) {
    return this.prisma.page.findMany({
      where: { siteId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        sections: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            type: true,
            name: true,
            sortOrder: true,
            isVisible: true,
            props: true,
          },
        },
      },
    });
  }

  /** Runs the shared page-quality engine over a site's current draft content. */
  private evaluateDraftQuality(
    site: { themeConfig: unknown },
    pages: PublishablePage[],
  ): QualityReport {
    return evaluateSiteQuality({
      pages: this.toQualityPages(pages),
      themeConfig:
        site.themeConfig && typeof site.themeConfig === "object"
          ? (site.themeConfig as Record<string, string>)
          : null,
      locale: "th",
    });
  }

  /**
   * Restates an engine issue in the error string this endpoint has always
   * returned, so existing clients keep working while the full report rides
   * along in the response body.
   */
  private legacyPublishMessage(
    issue: QualityIssue,
    pages: PublishablePage[],
  ): string | null {
    const match = /^pages\[(\d+)\](?:\.sections\[(\d+)\])?/.exec(issue.path);
    if (!match) {
      return null;
    }

    const page = pages[Number(match[1])];
    if (!page) {
      return null;
    }

    const section =
      match[2] === undefined ? undefined : page.sections[Number(match[2])];

    if (issue.code === "CONTENT_PLACEHOLDER_UNRESOLVED") {
      return section
        ? `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_SECTION:${section.id}`
        : `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_PAGE:${page.id}`;
    }

    if (issue.code === "SECTION_REQUIRED_FIELD_MISSING" && section) {
      const field = issue.path.split(".props.").pop() ?? "props";
      return `PUBLISH_REQUIRED_FIELD_MISSING:${section.type}:${field}`;
    }

    return null;
  }

  /**
   * Publish refuses anything the engine rates as an error — a half-finished
   * page going live is the failure mode this gate exists to prevent.
   */
  private assertPublishable(report: QualityReport, pages: PublishablePage[]) {
    if (report.passed) {
      return;
    }

    const errors = blockingIssues(report);

    // Preserve the original precedence: placeholders were reported before
    // missing required fields, so clients keyed on those strings see no change.
    let message: string | null = null;
    for (const code of [
      "CONTENT_PLACEHOLDER_UNRESOLVED",
      "SECTION_REQUIRED_FIELD_MISSING",
    ]) {
      const issue = errors.find((candidate) => candidate.code === code);
      const legacy = issue ? this.legacyPublishMessage(issue, pages) : null;
      if (legacy) {
        message = legacy;
        break;
      }
    }

    throw new BadRequestException({
      code: "PUBLISH_QUALITY_CHECK_FAILED",
      message: message ?? "PUBLISH_QUALITY_CHECK_FAILED",
      quality: report,
    });
  }

  /** On-demand quality report for the builder, without publishing anything. */
  async getSiteQuality(userId: string, siteId: string) {
    const site = await this.getAccessibleSite(userId, siteId);
    const pages = await this.loadPublishablePages(site.id);

    return {
      siteId: site.id,
      // Returned so the builder can run the theme rules locally instead of
      // silently skipping contrast and Thai line-height while editing.
      themeConfig:
        site.themeConfig && typeof site.themeConfig === "object"
          ? (site.themeConfig as Record<string, string>)
          : null,
      ...this.evaluateDraftQuality(site, pages),
    };
  }

  async publishSite(userId: string, siteId: string) {
    const site = await this.getAccessibleSite(userId, siteId);

    const pages = await this.loadPublishablePages(site.id);

    if (pages.length === 0) {
      throw new BadRequestException("PUBLISH_NO_PAGES");
    }

    const homePage = pages.find((page) => page.isHomePage);
    if (!homePage) {
      throw new BadRequestException("PUBLISH_HOME_PAGE_REQUIRED");
    }

    const homeVisibleSections = homePage.sections.filter(
      (section) => section.isVisible,
    );
    if (homeVisibleSections.length === 0) {
      throw new BadRequestException("PUBLISH_HOME_SECTION_REQUIRED");
    }

    this.assertPublishable(this.evaluateDraftQuality(site, pages), pages);

    const pageSnapshots = pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      isHomePage: page.isHomePage,
      isPublished: true,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoKeywords: page.seoKeywords,
      ogImageUrl: page.ogImageUrl,
      sortOrder: page.sortOrder,
      sections: page.sections.map((section) => ({
        id: section.id,
        type: section.type,
        name: section.name,
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        props: section.props,
      })),
    }));

    const latest = await this.prisma.publishLog.findFirst({
      where: { siteId: site.id },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const primaryDomain = await this.prisma.domain.findFirst({
      where: {
        siteId: site.id,
        isPrimary: true,
      },
      select: { host: true },
      orderBy: { createdAt: "asc" },
    });

    const publishedAt = new Date();
    const snapshot = {
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        logoUrl: site.logoUrl,
        faviconUrl: site.faviconUrl,
        defaultSeoTitle: site.defaultSeoTitle,
        defaultSeoDescription: site.defaultSeoDescription,
        defaultSeoKeywords: site.defaultSeoKeywords,
        defaultOgImageUrl: site.defaultOgImageUrl,
        primaryLanguage: site.primaryLanguage,
        timezone: site.timezone,
        themeConfig: site.themeConfig,
      },
      pages: pageSnapshots,
      publishedAt: publishedAt.toISOString(),
      version: nextVersion,
    } as runtime.InputJsonValue;

    await this.prisma.$transaction([
      this.prisma.publishLog.create({
        data: {
          siteId: site.id,
          version: nextVersion,
          action: "PUBLISH",
          snapshot,
          publishedById: userId,
        },
      }),
      this.prisma.site.update({
        where: { id: site.id },
        data: {
          status: "PUBLISHED",
          publishedVersion: nextVersion,
          publishedAt,
        },
      }),
    ]);

    return {
      siteId: site.id,
      version: nextVersion,
      status: "PUBLISHED",
      publicUrl: this.buildPublicUrlFromDomainOrSlug({
        host: primaryDomain?.host ?? null,
        slug: site.slug,
      }),
      publishedAt: publishedAt.toISOString(),
    };
  }
}
