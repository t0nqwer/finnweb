import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  extractPublishedPagesFromSnapshot,
  isPlainObject,
  mapPublicPage,
  mapVisibleSections,
  requireSnapshotObject,
  selectPageFromSnapshot,
} from "./site-render-helpers";

@Injectable()
export class PublicSiteRenderService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Public rendering is snapshot-only and never reads draft page/section rows.
  async getPublicPageByDomainAndPath(domain: string, pathOrSlug: string) {
    const normalizedDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split(":")[0];

    const site = await this.prisma.site.findFirst({
      where: {
        status: "PUBLISHED",
        domains: {
          some: {
            host: normalizedDomain,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const latestPublish = await this.prisma.publishLog.findFirst({
      where: {
        siteId: site.id,
        action: "PUBLISH",
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: {
        snapshot: true,
        version: true,
      },
    });

    if (!latestPublish) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const snapshot = requireSnapshotObject(latestPublish.snapshot);
    const pages = extractPublishedPagesFromSnapshot(snapshot);
    const page = selectPageFromSnapshot(pages, pathOrSlug, {
      requirePublished: false,
    });

    if (!page) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const siteSnapshot = isPlainObject(snapshot.site)
      ? (snapshot.site as Record<string, unknown>)
      : {};

    return {
      site: { ...siteSnapshot, version: latestPublish.version },
      page: mapPublicPage(page),
      sections: mapVisibleSections(page),
    };
  }

  // Slug-based public routes follow the same published snapshot contract.
  async getPublicPageBySlugAndPath(siteSlug: string, pageSlug?: string | null) {
    const site = await this.prisma.site.findFirst({
      where: {
        slug: siteSlug,
        status: "PUBLISHED",
      },
      select: { id: true },
    });

    if (!site) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const latestPublish = await this.prisma.publishLog.findFirst({
      where: {
        siteId: site.id,
        action: "PUBLISH",
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { snapshot: true, version: true },
    });

    if (!latestPublish) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const snapshot = requireSnapshotObject(latestPublish.snapshot);
    const pages = extractPublishedPagesFromSnapshot(snapshot);
    const page = selectPageFromSnapshot(pages, pageSlug ?? undefined, {
      requirePublished: false,
    });

    if (!page) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const siteSnapshot = isPlainObject(snapshot.site)
      ? (snapshot.site as Record<string, unknown>)
      : {};

    return {
      site: { ...siteSnapshot, version: latestPublish.version },
      page: mapPublicPage(page),
      sections: mapVisibleSections(page),
    };
  }
}
