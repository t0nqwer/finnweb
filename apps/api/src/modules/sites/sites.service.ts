import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { PLAN_GATING_ERROR_CODES } from "@/common/constants/plan-gating-errors.constant";
import type * as runtime from "@prisma/client/runtime/client";
import { CreatePageDto } from "./dto/create-page.dto";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdatePageDto } from "./dto/update-page.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { ReorderSectionsDto } from "./dto/reorder-sections.dto";
import { GetSiteLeadsQueryDto } from "./dto/get-site-leads-query.dto";

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  private pickLeadValue(
    data: Record<string, unknown>,
    candidateKeys: string[],
  ): string | null {
    for (const key of candidateKeys) {
      const value = data[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

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
      throw new BadRequestException(
        PLAN_GATING_ERROR_CODES.SITE_LIMIT_REACHED.code,
      );
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
      throw new BadRequestException(
        PLAN_GATING_ERROR_CODES.PAGE_LIMIT_REACHED.code,
      );
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

  // Section Methods

  private async getAccessiblePage(
    userId: string,
    siteId: string,
    pageId: string,
  ) {
    await this.getAccessibleSite(userId, siteId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        siteId,
      },
      include: {
        site: {
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
          },
        },
        _count: {
          select: {
            sections: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException("PAGE_NOT_FOUND");
    }

    return page;
  }

  async createSection(
    userId: string,
    siteId: string,
    pageId: string,
    dto: CreateSectionDto,
  ) {
    const page = await this.getAccessiblePage(userId, siteId, pageId);

    const currentSubscription = page.site.workspace.subscriptions[0];
    const maxSectionsPerPage =
      currentSubscription?.plan?.maxSectionsPerPage ?? 10;

    if (page._count.sections >= maxSectionsPerPage) {
      throw new BadRequestException(
        PLAN_GATING_ERROR_CODES.SECTION_LIMIT_REACHED.code,
      );
    }

    // Validate section props based on type
    const validatedProps = this.validateSectionProps(dto.type, dto.props || {});

    return this.prisma.section.create({
      data: {
        pageId,
        type: dto.type,
        name: dto.name || null,
        sortOrder: dto.sortOrder ?? page._count.sections,
        props: validatedProps,
      },
    });
  }

  async findSections(userId: string, siteId: string, pageId: string) {
    await this.getAccessiblePage(userId, siteId, pageId);

    return this.prisma.section.findMany({
      where: {
        pageId,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });
  }

  async findSection(
    userId: string,
    siteId: string,
    pageId: string,
    sectionId: string,
  ) {
    await this.getAccessiblePage(userId, siteId, pageId);

    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        pageId,
      },
    });

    if (!section) {
      throw new NotFoundException("SECTION_NOT_FOUND");
    }

    return section;
  }

  async updateSection(
    userId: string,
    siteId: string,
    pageId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    const section = await this.findSection(userId, siteId, pageId, sectionId);

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name || null;
    }

    if (dto.sortOrder !== undefined) {
      updateData.sortOrder = dto.sortOrder;
    }

    if (dto.isVisible !== undefined) {
      updateData.isVisible = dto.isVisible;
    }

    if (dto.props !== undefined) {
      const validatedProps = this.validateSectionProps(section.type, dto.props);
      updateData.props = validatedProps;
    }

    return this.prisma.section.update({
      where: {
        id: sectionId,
      },
      data: updateData,
    });
  }

  async deleteSection(
    userId: string,
    siteId: string,
    pageId: string,
    sectionId: string,
  ) {
    await this.findSection(userId, siteId, pageId, sectionId);

    await this.prisma.section.delete({
      where: {
        id: sectionId,
      },
    });

    return {
      id: sectionId,
      deleted: true,
    };
  }

  async reorderSections(
    userId: string,
    siteId: string,
    pageId: string,
    dto: ReorderSectionsDto,
  ) {
    await this.getAccessiblePage(userId, siteId, pageId);

    // Verify all section IDs belong to this page
    const sections = await this.prisma.section.findMany({
      where: {
        pageId,
        id: {
          in: dto.sectionIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (sections.length !== dto.sectionIds.length) {
      throw new BadRequestException("INVALID_SECTION_IDS");
    }

    // Update sortOrder for each section
    return this.prisma.$transaction(
      dto.sectionIds.map((sectionId, index) =>
        this.prisma.section.update({
          where: { id: sectionId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async findLeads(userId: string, siteId: string, query: GetSiteLeadsQueryDto) {
    const site = await this.getAccessibleSite(userId, siteId);

    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException("LEAD_DATE_RANGE_INVALID");
    }

    const leads = await this.prisma.formSubmission.findMany({
      where: {
        form: {
          siteId,
          ...(query.pageId ? { pageId: query.pageId } : {}),
        },
        ...(fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      include: {
        form: {
          select: {
            id: true,
            name: true,
            page: {
              select: {
                id: true,
                title: true,
                slug: true,
                path: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: query.limit ?? 50,
    });

    const items = leads.map((lead) => {
      const data =
        typeof lead.data === "object" && lead.data !== null
          ? (lead.data as Record<string, unknown>)
          : {};

      return {
        id: lead.id,
        createdAt: lead.createdAt.toISOString(),
        form: {
          id: lead.form.id,
          name: lead.form.name,
        },
        page: lead.form.page
          ? {
              id: lead.form.page.id,
              title: lead.form.page.title,
              slug: lead.form.page.slug,
              path: lead.form.page.path,
            }
          : null,
        contact: {
          name: this.pickLeadValue(data, ["name", "fullName", "fullname"]),
          email: this.pickLeadValue(data, ["email", "emailAddress"]),
          phone: this.pickLeadValue(data, ["phone", "phoneNumber", "tel"]),
          message: this.pickLeadValue(data, ["message", "detail", "note"]),
        },
        data,
      };
    });

    return {
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
      },
      filters: {
        pageId: query.pageId ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
        limit: query.limit ?? 50,
      },
      total: items.length,
      items,
    };
  }

  async getPublicPageByDomainAndPath(domain: string, pathOrSlug: string) {
    const normalizedDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .split(":")[0];

    const normalizedInput = pathOrSlug.trim();
    const normalizedPath = this.normalizePath(normalizedInput).toLowerCase();
    const normalizedSlug = normalizedInput
      .replace(/^\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    const page = await this.prisma.page.findFirst({
      where: {
        isPublished: true,
        OR: [{ path: normalizedPath }, { slug: normalizedSlug }],
        site: {
          domains: {
            some: {
              host: normalizedDomain,
            },
          },
        },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            faviconUrl: true,
            defaultSeoTitle: true,
            defaultSeoDescription: true,
            defaultSeoKeywords: true,
            defaultOgImageUrl: true,
            primaryLanguage: true,
            timezone: true,
          },
        },
        sections: {
          where: {
            isVisible: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
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

    if (!page) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    return {
      site: page.site,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        path: page.path,
        pageType: page.pageType,
        isHomePage: page.isHomePage,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoKeywords: page.seoKeywords,
        ogImageUrl: page.ogImageUrl,
      },
      sections: page.sections,
    };
  }

  private validateSectionProps(type: string, props: Record<string, unknown>) {
    // Basic validation - ensure props is an object
    if (typeof props !== "object" || props === null) {
      throw new BadRequestException("SECTION_PROPS_INVALID");
    }

    // Type-specific validation can be added here
    // For MVP, we accept any props structure per section type
    // This can be expanded later with detailed schema validation

    return props as runtime.InputJsonValue;
  }
}
