import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CreatePageDto } from "./dto/create-page.dto";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  private makeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private normalizePath(value: string): string {
    const trimmed = value.trim();

    if (!trimmed || trimmed === "/") {
      return "/";
    }

    const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

    return withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");
  }

  private normalizeOptionalText(value?: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private buildPagePath(
    slug: string,
    requestedPath?: string,
    isHomePage = false,
  ): string {
    if (isHomePage) {
      return "/";
    }

    if (requestedPath && requestedPath.trim()) {
      const normalizedPath = this.normalizePath(requestedPath).toLowerCase();

      if (normalizedPath === "/") {
        throw new BadRequestException("HOME_PAGE_PATH_RESERVED");
      }

      return normalizedPath;
    }

    return this.normalizePath(slug).toLowerCase();
  }

  private async resolveWorkspaceForSiteCreation(
    userId: string,
    workspaceId?: string,
  ) {
    return this.prisma.workspace.findFirst({
      where: {
        ...(workspaceId ? { id: workspaceId } : {}),
        members: {
          some: {
            userId,
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
        },
      },
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
        _count: {
          select: {
            sites: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

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
      throw new ForbiddenException("SITE_NOT_FOUND_OR_FORBIDDEN");
    }

    return site;
  }

  private async ensureUniqueSlug(workspaceId: string, baseSlug: string) {
    const safeBaseSlug = baseSlug || "site";
    let slug = safeBaseSlug;
    let suffix = 1;

    while (
      await this.prisma.site.findFirst({
        where: {
          workspaceId,
          slug,
        },
        select: {
          id: true,
        },
      })
    ) {
      suffix += 1;
      slug = `${safeBaseSlug}-${suffix}`;
    }

    return slug;
  }

  private async ensureUniquePageSlug(
    siteId: string,
    baseSlug: string,
    excludePageId?: string,
  ) {
    const safeBaseSlug = baseSlug || "page";
    let slug = safeBaseSlug;
    let suffix = 1;

    while (
      await this.prisma.page.findFirst({
        where: {
          siteId,
          slug,
          ...(excludePageId ? { id: { not: excludePageId } } : {}),
        },
        select: {
          id: true,
        },
      })
    ) {
      suffix += 1;
      slug = `${safeBaseSlug}-${suffix}`;
    }

    return slug;
  }

  private async assertUniquePagePath(
    siteId: string,
    path: string,
    excludePageId?: string,
  ) {
    const existingPage = await this.prisma.page.findFirst({
      where: {
        siteId,
        path,
        ...(excludePageId ? { id: { not: excludePageId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingPage) {
      throw new BadRequestException("PAGE_PATH_ALREADY_EXISTS");
    }
  }

  async create(userId: string, dto: CreateSiteDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException("SITE_NAME_REQUIRED");
    }

    const baseSlug = dto.slug ? this.makeSlug(dto.slug) : this.makeSlug(name);

    const workspace = await this.resolveWorkspaceForSiteCreation(
      userId,
      dto.workspaceId,
    );

    if (!workspace) {
      throw new ForbiddenException("WORKSPACE_NOT_FOUND_OR_FORBIDDEN");
    }

    const currentSubscription = workspace.subscriptions[0];
    const maxSites = currentSubscription?.plan?.maxSites ?? 1;

    if (workspace._count.sites >= maxSites) {
      throw new BadRequestException("SITE_LIMIT_REACHED");
    }

    const slug = await this.ensureUniqueSlug(workspace.id, baseSlug);

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          workspaceId: workspace.id,
          name,
          slug,
          defaultSeoTitle: name,
          contentEnabled: Boolean(
            currentSubscription?.plan?.allowBlog ||
            currentSubscription?.plan?.allowNews,
          ),
          ecommerceEnabled: Boolean(currentSubscription?.plan?.allowEcommerce),
        },
      });

      await tx.page.create({
        data: {
          siteId: site.id,
          title: "Home",
          slug: "home",
          path: "/",
          pageType: "LANDING",
          isHomePage: true,
          isPublished: false,
          sortOrder: 0,
        },
      });

      return site;
    });
  }

  async findAll(userId: string) {
    return this.prisma.site.findMany({
      where: {
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
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createPage(userId: string, siteId: string, dto: CreatePageDto) {
    const site = await this.getAccessibleSite(userId, siteId);
    const title = dto.title.trim();

    if (!title) {
      throw new BadRequestException("PAGE_TITLE_REQUIRED");
    }

    const currentSubscription = site.workspace.subscriptions[0];
    const maxPagesPerSite = currentSubscription?.plan?.maxPagesPerSite ?? 1;

    if (site._count.pages >= maxPagesPerSite) {
      throw new BadRequestException("PAGE_LIMIT_REACHED");
    }

    const baseSlug = dto.slug ? this.makeSlug(dto.slug) : this.makeSlug(title);
    const slug = await this.ensureUniquePageSlug(site.id, baseSlug || "page");
    const isHomePage = Boolean(dto.isHomePage);
    const path = this.buildPagePath(slug, dto.path, isHomePage);

    await this.assertUniquePagePath(site.id, path);

    return this.prisma.$transaction(async (tx) => {
      if (isHomePage) {
        const currentHomePages = await tx.page.findMany({
          where: {
            siteId: site.id,
            isHomePage: true,
          },
          select: {
            id: true,
            slug: true,
          },
        });

        for (const currentHomePage of currentHomePages) {
          await tx.page.update({
            where: {
              id: currentHomePage.id,
            },
            data: {
              isHomePage: false,
              path: this.buildPagePath(currentHomePage.slug),
            },
          });
        }
      }

      return tx.page.create({
        data: {
          siteId: site.id,
          title,
          slug,
          path,
          pageType: dto.pageType ?? "NORMAL",
          isHomePage,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? site._count.pages,
          seoTitle: this.normalizeOptionalText(dto.seoTitle),
          seoDescription: this.normalizeOptionalText(dto.seoDescription),
          seoKeywords: this.normalizeOptionalText(dto.seoKeywords),
          ogImageUrl: this.normalizeOptionalText(dto.ogImageUrl),
        },
      });
    });
  }

  async findPages(userId: string, siteId: string) {
    await this.getAccessibleSite(userId, siteId);

    return this.prisma.page.findMany({
      where: {
        siteId,
      },
      include: {
        _count: {
          select: {
            sections: true,
            forms: true,
          },
        },
      },
      orderBy: [
        { isHomePage: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findPage(userId: string, siteId: string, pageId: string) {
    await this.getAccessibleSite(userId, siteId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        siteId,
      },
      include: {
        sections: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        forms: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            sections: true,
            forms: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException("PAGE_NOT_FOUND");
    }

    return page;
  }

  async updatePage(
    userId: string,
    siteId: string,
    pageId: string,
    dto: UpdatePageDto,
  ) {
    await this.getAccessibleSite(userId, siteId);

    const existingPage = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        siteId,
      },
    });

    if (!existingPage) {
      throw new NotFoundException("PAGE_NOT_FOUND");
    }

    const title =
      dto.title !== undefined ? dto.title.trim() : existingPage.title;

    if (!title) {
      throw new BadRequestException("PAGE_TITLE_REQUIRED");
    }

    let slug = existingPage.slug;

    if (dto.slug !== undefined) {
      const nextSlug = this.makeSlug(dto.slug);

      if (!nextSlug) {
        throw new BadRequestException("PAGE_SLUG_REQUIRED");
      }

      slug = await this.ensureUniquePageSlug(siteId, nextSlug, pageId);
    }

    const nextIsHomePage = dto.isHomePage ?? existingPage.isHomePage;

    if (existingPage.isHomePage && dto.isHomePage === false) {
      const anotherHomePage = await this.prisma.page.findFirst({
        where: {
          siteId,
          isHomePage: true,
          id: {
            not: pageId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!anotherHomePage) {
        throw new BadRequestException("HOME_PAGE_REQUIRED");
      }
    }

    const path =
      dto.path !== undefined
        ? this.buildPagePath(slug, dto.path, nextIsHomePage)
        : nextIsHomePage
          ? "/"
          : existingPage.isHomePage !== nextIsHomePage || dto.slug !== undefined
            ? this.buildPagePath(slug)
            : (existingPage.path ?? this.buildPagePath(slug));

    await this.assertUniquePagePath(siteId, path, pageId);

    return this.prisma.$transaction(async (tx) => {
      if (nextIsHomePage) {
        const currentHomePages = await tx.page.findMany({
          where: {
            siteId,
            isHomePage: true,
            id: {
              not: pageId,
            },
          },
          select: {
            id: true,
            slug: true,
          },
        });

        for (const currentHomePage of currentHomePages) {
          await tx.page.update({
            where: {
              id: currentHomePage.id,
            },
            data: {
              isHomePage: false,
              path: this.buildPagePath(currentHomePage.slug),
            },
          });
        }
      }

      return tx.page.update({
        where: {
          id: pageId,
        },
        data: {
          title,
          slug,
          path,
          pageType: dto.pageType,
          isHomePage: nextIsHomePage,
          isPublished: dto.isPublished,
          sortOrder: dto.sortOrder,
          seoTitle: this.normalizeOptionalText(dto.seoTitle),
          seoDescription: this.normalizeOptionalText(dto.seoDescription),
          seoKeywords: this.normalizeOptionalText(dto.seoKeywords),
          ogImageUrl: this.normalizeOptionalText(dto.ogImageUrl),
        },
      });
    });
  }

  async removePage(userId: string, siteId: string, pageId: string) {
    await this.getAccessibleSite(userId, siteId);

    const existingPage = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        siteId,
      },
      select: {
        id: true,
        isHomePage: true,
      },
    });

    if (!existingPage) {
      throw new NotFoundException("PAGE_NOT_FOUND");
    }

    if (existingPage.isHomePage) {
      throw new BadRequestException("HOME_PAGE_DELETE_NOT_ALLOWED");
    }

    await this.prisma.page.delete({
      where: {
        id: pageId,
      },
    });

    return {
      id: pageId,
      deleted: true,
    };
  }
}
