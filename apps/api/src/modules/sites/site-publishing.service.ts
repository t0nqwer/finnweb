import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type * as runtime from "@prisma/client/runtime/client";
import { PrismaService } from "@/prisma/prisma.service";

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

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private hasUnresolvedPlaceholders(value: unknown): boolean {
    if (typeof value === "string") {
      return /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(value);
    }

    if (Array.isArray(value)) {
      return value.some((item) => this.hasUnresolvedPlaceholders(item));
    }

    if (this.isPlainObject(value)) {
      return Object.values(value).some((item) =>
        this.hasUnresolvedPlaceholders(item),
      );
    }

    return false;
  }

  private getRequiredFieldMissingForPublish(
    sectionType: string,
    props: unknown,
  ): string | null {
    if (!this.isPlainObject(props)) {
      return "props";
    }

    const getTrimmed = (key: string) => {
      const value = props[key];
      return typeof value === "string" ? value.trim() : "";
    };

    switch (sectionType) {
      case "HERO":
      case "CTA":
      case "FORM":
      case "CONTACT": {
        return getTrimmed("title") ? null : "title";
      }
      case "NAVBAR": {
        const menuItems = props.menuItems;
        if (!Array.isArray(menuItems) || menuItems.length === 0) {
          return "menuItems";
        }
        return null;
      }
      case "BOOKING": {
        return getTrimmed("title") ? null : "title";
      }
      case "COMPARISON": {
        const plans = props.plans;
        if (!Array.isArray(plans) || plans.length === 0) {
          return "plans";
        }
        return null;
      }
      default:
        return null;
    }
  }

  private validatePublishContent(
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string | null;
      ogImageUrl: string | null;
      sections: Array<{
        id: string;
        type: string;
        name: string | null;
        isVisible: boolean;
        props: unknown;
      }>;
    }>,
  ) {
    for (const page of pages) {
      if (
        this.hasUnresolvedPlaceholders(page.title) ||
        this.hasUnresolvedPlaceholders(page.slug) ||
        this.hasUnresolvedPlaceholders(page.seoTitle) ||
        this.hasUnresolvedPlaceholders(page.seoDescription) ||
        this.hasUnresolvedPlaceholders(page.seoKeywords) ||
        this.hasUnresolvedPlaceholders(page.ogImageUrl)
      ) {
        throw new BadRequestException(
          `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_PAGE:${page.id}`,
        );
      }

      for (const section of page.sections) {
        if (
          this.hasUnresolvedPlaceholders(section.name) ||
          this.hasUnresolvedPlaceholders(section.props)
        ) {
          throw new BadRequestException(
            `PUBLISH_UNRESOLVED_PLACEHOLDERS_IN_SECTION:${section.id}`,
          );
        }

        if (!section.isVisible) {
          continue;
        }

        const missingField = this.getRequiredFieldMissingForPublish(
          section.type,
          section.props,
        );
        if (missingField) {
          throw new BadRequestException(
            `PUBLISH_REQUIRED_FIELD_MISSING:${section.type}:${missingField}`,
          );
        }
      }
    }
  }

  async publishSite(userId: string, siteId: string) {
    const site = await this.getAccessibleSite(userId, siteId);

    const pages = await this.prisma.page.findMany({
      where: { siteId: site.id },
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

    this.validatePublishContent(
      pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoKeywords: page.seoKeywords,
        ogImageUrl: page.ogImageUrl,
        sections: page.sections.map((section) => ({
          id: section.id,
          type: section.type,
          name: section.name,
          isVisible: section.isVisible,
          props: section.props,
        })),
      })),
    );

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
