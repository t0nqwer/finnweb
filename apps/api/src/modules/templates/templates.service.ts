import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import { SitesService } from "../sites/sites.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import {
  ListTemplatesQueryDto,
  type TemplateScope,
} from "./dto/list-templates-query.dto";
import { ApplyTemplateDto } from "./dto/apply-template.dto";

@Injectable()
export class TemplatesService {
  private readonly templateMetadataKeys = [
    "businessTypes",
    "goals",
    "styles",
    "languages",
    "keywords",
  ] as const;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SitesService) private readonly sitesService: SitesService,
  ) {}

  private makeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async ensureUniqueTemplateSlug(baseValue: string, excludeId?: string) {
    const safeBase = this.makeSlug(baseValue) || "template";
    let candidate = safeBase;
    let suffix = 1;

    while (
      await this.prisma.template.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      })
    ) {
      suffix += 1;
      candidate = `${safeBase}-${suffix}`;
    }

    return candidate;
  }

  private scopeToWhere(userId: string, scope: TemplateScope) {
    if (scope === "my") {
      return {
        createdById: userId,
      };
    }

    if (scope === "all") {
      return {
        OR: [
          {
            createdById: userId,
          },
          {
            visibility: "OFFICIAL" as const,
            status: "PUBLISHED" as const,
          },
        ],
      };
    }

    return {
      visibility: "OFFICIAL" as const,
      status: "PUBLISHED" as const,
    };
  }

  private normalizeMetadataArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  private toTagObject(value: unknown): Prisma.InputJsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as Prisma.InputJsonObject;
  }

  private mergeMetadataTags(
    existingTags: unknown,
    dto: Pick<
      CreateTemplateDto,
      "businessTypes" | "goals" | "styles" | "languages" | "keywords"
    >,
  ) {
    const tags = { ...this.toTagObject(existingTags) };
    let hasMetadataUpdate = false;

    for (const key of this.templateMetadataKeys) {
      if (dto[key] === undefined) {
        continue;
      }

      hasMetadataUpdate = true;
      tags[key] = this.normalizeMetadataArray(dto[key]);
    }

    return hasMetadataUpdate ? tags : undefined;
  }

  private toTemplatePayload(template: any) {
    const tags = this.toTagObject(template.tags);

    return {
      id: template.id,
      code: template.code,
      name: template.name,
      slug: template.slug,
      description: template.description,
      thumbnailUrl: template.thumbnailUrl,
      previewUrl: template.previewUrl,
      status: template.status,
      visibility: template.visibility,
      isOfficial: template.visibility === "OFFICIAL",
      isFree: Boolean(template.isFree),
      installCount: template.installCount ?? 0,
      ratingAvg: template.ratingAvg,
      ratingCount: template.ratingCount ?? 0,
      ownerId: template.createdById,
      tags: template.tags ?? null,
      businessTypes: this.normalizeMetadataArray(tags.businessTypes),
      goals: this.normalizeMetadataArray(tags.goals),
      styles: this.normalizeMetadataArray(tags.styles),
      languages: this.normalizeMetadataArray(tags.languages),
      keywords: this.normalizeMetadataArray(tags.keywords),
      category: template.category
        ? {
            id: template.category.id,
            name: template.category.name,
            slug: template.category.slug,
          }
        : null,
      sortOrder: template.sortOrder,
      pages: template.pages.map((page: any) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        path: page.path,
        pageType: page.pageType,
        isHomePage: page.isHomePage,
        isPublished: page.isPublished,
        sortOrder: page.sortOrder,
        sections: page.sections.map((section: any) => ({
          id: section.id,
          type: section.type,
          name: section.name,
          sortOrder: section.sortOrder,
          isVisible: section.isVisible,
          props: section.props,
        })),
      })),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private async upsertTemplatePages(
    tx: any,
    templateId: string,
    pages: CreateTemplateDto["pages"],
  ) {
    await tx.templateSection.deleteMany({
      where: {
        templatePage: {
          templateId,
        },
      },
    });

    await tx.templatePage.deleteMany({
      where: {
        templateId,
      },
    });

    for (const [pageIndex, page] of pages.entries()) {
      const pageSlug = this.makeSlug(page.slug || page.title) || `page-${pageIndex + 1}`;
      const isHomePage = Boolean(page.isHomePage ?? pageIndex === 0);
      const pagePath = isHomePage
        ? "/"
        : page.path?.trim() || `/${pageSlug}`;

      const createdPage = await tx.templatePage.create({
        data: {
          templateId,
          title: page.title.trim(),
          slug: pageSlug,
          pageType: page.pageType ?? (pageIndex === 0 ? "LANDING" : "NORMAL"),
          path: pagePath,
          isHomePage,
          isPublished: Boolean(page.isPublished),
          sortOrder: page.sortOrder ?? pageIndex,
          seoTitle: page.seoTitle?.trim() || null,
          seoDescription: page.seoDescription?.trim() || null,
          seoKeywords: page.seoKeywords?.trim() || null,
          ogImageUrl: page.ogImageUrl?.trim() || null,
        },
      });

      for (const [sectionIndex, section] of page.sections.entries()) {
        await tx.templateSection.create({
          data: {
            templatePageId: createdPage.id,
            type: section.type,
            name: section.name?.trim() || null,
            sortOrder: section.sortOrder ?? sectionIndex,
            isVisible: section.isVisible ?? true,
            props: section.props ?? {},
          },
        });
      }
    }
  }

  private async createTemplateVersion(tx: any, templateId: string) {
    const pages = await tx.templatePage.findMany({
      where: {
        templateId,
      },
      include: {
        sections: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    const latest = await tx.templateVersion.findFirst({
      where: {
        templateId,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        version: true,
      },
    });

    const snapshot = {
      pages: pages.map((page: any) => ({
        title: page.title,
        slug: page.slug,
        pageType: page.pageType,
        path: page.path,
        isHomePage: page.isHomePage,
        isPublished: page.isPublished,
        sortOrder: page.sortOrder,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        seoKeywords: page.seoKeywords,
        ogImageUrl: page.ogImageUrl,
        sections: page.sections.map((section: any) => ({
          type: section.type,
          name: section.name,
          sortOrder: section.sortOrder,
          isVisible: section.isVisible,
          props: section.props,
        })),
      })),
    };

    await tx.templateVersion.updateMany({
      where: {
        templateId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return tx.templateVersion.create({
      data: {
        templateId,
        version: (latest?.version ?? 0) + 1,
        name: `v${(latest?.version ?? 0) + 1}`,
        snapshot,
        isActive: true,
      },
    });
  }

  async list(userId: string, query: ListTemplatesQueryDto) {
    const scope = query.scope ?? "official";

    const templates = await this.prisma.template.findMany({
      where: this.scopeToWhere(userId, scope),
      include: {
        category: true,
        pages: {
          include: {
            sections: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: templates.map((template) => this.toTemplatePayload(template)),
    };
  }

  async findOne(userId: string, templateId: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          {
            createdById: userId,
          },
          {
            visibility: "OFFICIAL",
            status: "PUBLISHED",
          },
        ],
      },
      include: {
        category: true,
        pages: {
          include: {
            sections: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }

    return {
      success: true,
      data: this.toTemplatePayload(template),
    };
  }

  async create(userId: string, dto: CreateTemplateDto) {
    if (!dto.pages.length) {
      throw new BadRequestException("TEMPLATE_PAGES_REQUIRED");
    }

    const slug = await this.ensureUniqueTemplateSlug(dto.slug || dto.name);

    const category = dto.category?.trim()
      ? await this.prisma.templateCategory.upsert({
          where: {
            slug: this.makeSlug(dto.category),
          },
          update: {
            name: dto.category.trim(),
            isActive: true,
          },
          create: {
            name: dto.category.trim(),
            slug: this.makeSlug(dto.category),
            description: "หมวดหมู่เทมเพลต",
            isActive: true,
          },
        })
      : null;

    const createdTemplate = await this.prisma.$transaction(async (tx) => {
      const metadataTags = this.mergeMetadataTags(null, dto);
      const template = await tx.template.create({
        data: {
          code: dto.code?.trim() || `user-${slug}`,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          thumbnailUrl: dto.thumbnailUrl?.trim() || null,
          categoryId: category?.id,
          createdById: userId,
          status: "PUBLISHED",
          visibility: "PRIVATE",
          sortOrder: 999,
          isFree: true,
          tags: metadataTags,
        },
      });

      await this.upsertTemplatePages(tx, template.id, dto.pages);
      await this.createTemplateVersion(tx, template.id);

      return tx.template.findUnique({
        where: { id: template.id },
        include: {
          category: true,
          pages: {
            include: {
              sections: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });
    });

    if (!createdTemplate) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }

    return {
      success: true,
      data: this.toTemplatePayload(createdTemplate),
    };
  }

  async update(userId: string, templateId: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        slug: true,
        visibility: true,
        createdById: true,
        tags: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }

    if (existing.visibility === "OFFICIAL") {
      throw new ForbiddenException("OFFICIAL_TEMPLATE_READONLY");
    }

    if (existing.createdById !== userId) {
      throw new ForbiddenException("TEMPLATE_FORBIDDEN");
    }

    const nextSlug = dto.slug
      ? await this.ensureUniqueTemplateSlug(dto.slug, existing.id)
      : existing.slug;

    const category = dto.category?.trim()
      ? await this.prisma.templateCategory.upsert({
          where: {
            slug: this.makeSlug(dto.category),
          },
          update: {
            name: dto.category.trim(),
            isActive: true,
          },
          create: {
            name: dto.category.trim(),
            slug: this.makeSlug(dto.category),
            description: "หมวดหมู่เทมเพลต",
            isActive: true,
          },
        })
      : null;

    const updatedTemplate = await this.prisma.$transaction(async (tx) => {
      const metadataTags = this.mergeMetadataTags(existing.tags, dto);
      await tx.template.update({
        where: { id: existing.id },
        data: {
          code: dto.code?.trim() || undefined,
          name: dto.name?.trim() || undefined,
          slug: nextSlug,
          description:
            dto.description !== undefined
              ? dto.description?.trim() || null
              : undefined,
          thumbnailUrl:
            dto.thumbnailUrl !== undefined
              ? dto.thumbnailUrl?.trim() || null
              : undefined,
          categoryId: category?.id,
          tags: metadataTags,
        },
      });

      if (dto.pages) {
        if (!dto.pages.length) {
          throw new BadRequestException("TEMPLATE_PAGES_REQUIRED");
        }

        await this.upsertTemplatePages(tx, existing.id, dto.pages);
        await this.createTemplateVersion(tx, existing.id);
      }

      return tx.template.findUnique({
        where: { id: existing.id },
        include: {
          category: true,
          pages: {
            include: {
              sections: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });
    });

    if (!updatedTemplate) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }

    return {
      success: true,
      data: this.toTemplatePayload(updatedTemplate),
    };
  }

  async apply(userId: string, templateId: string, dto: ApplyTemplateDto) {
    const createResult = await this.sitesService.create(userId, {
      name: dto.siteName,
      workspaceId: dto.workspaceId,
      slug: dto.slug,
      templateId,
    });

    return {
      success: true,
      data: createResult,
    };
  }
}
