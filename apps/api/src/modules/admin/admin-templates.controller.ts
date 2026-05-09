import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@/generated/prisma/client";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { PrismaService } from "@/prisma/prisma.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { CreateTemplateDto } from "../templates/dto/create-template.dto";
import { AdminTemplateValidationService } from "./admin-template-validation.service";
import { UpdateAdminTemplateStatusDto } from "./dto/update-admin-template-status.dto";

@UseGuards(AccessJwtGuard, PlatformAdminGuard)
@Controller("admin/templates")
export class AdminTemplatesController {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminTemplateValidationService)
    private readonly validator: AdminTemplateValidationService,
  ) {}

  @Get("overview")
  async overview() {
    const [templates, sectionTemplates] = await Promise.all([
      this.prisma.template.findMany({
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
      }),
      (this.prisma as any).sectionTemplate.findMany({
        include: {
          versions: {
            where: {
              isActive: true,
            },
            orderBy: {
              version: "desc",
            },
            take: 1,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return {
      success: true,
      data: {
        templates: templates.map((template) => ({
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
          isFree: template.isFree,
          installCount: template.installCount,
          ratingAvg: template.ratingAvg,
          ratingCount: template.ratingCount,
          ownerId: template.createdById,
          tags: template.tags,
          businessTypes: this.normalizeTagArray(template.tags, "businessTypes"),
          goals: this.normalizeTagArray(template.tags, "goals"),
          styles: this.normalizeTagArray(template.tags, "styles"),
          languages: this.normalizeTagArray(template.tags, "languages"),
          keywords: this.normalizeTagArray(template.tags, "keywords"),
          category: template.category
            ? {
                id: template.category.id,
                name: template.category.name,
                slug: template.category.slug,
              }
            : null,
          sortOrder: template.sortOrder,
          pages: template.pages.map((page) => ({
            id: page.id,
            title: page.title,
            slug: page.slug,
            path: page.path,
            pageType: page.pageType,
            isHomePage: page.isHomePage,
            isPublished: page.isPublished,
            sortOrder: page.sortOrder,
            sections: page.sections.map((section) => ({
              id: section.id,
              type: section.type,
              name: section.name,
              sortOrder: section.sortOrder,
              isVisible: section.isVisible,
            })),
          })),
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        })),
        sectionTemplates: sectionTemplates.map((template: any) => {
          const activeVersion = template.versions?.[0] ?? null;

          return {
            id: template.id,
            code: template.code,
            name: template.name,
            sectionType: template.sectionType,
            thumbnailUrl: template.thumbnailUrl,
            isOfficial: template.isOfficial,
            ownerId: template.ownerId,
            isPublished: template.isPublished,
            sortOrder: template.sortOrder,
            activeVersion: activeVersion
              ? {
                  id: activeVersion.id,
                  version: activeVersion.version,
                  name: activeVersion.name,
                  renderMode: activeVersion.renderMode,
                  htmlTemplate: activeVersion.htmlTemplate,
                  cssTemplate: activeVersion.cssTemplate,
                  createdAt: activeVersion.createdAt,
                }
              : null,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          };
        }),
      },
    };
  }

  @Post("validate")
  async validate(@Body() dto: CreateTemplateDto) {
    return {
      success: true,
      data: this.validator.validateTemplate(dto),
    };
  }

  @Post()
  async createOfficial(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    const validation = this.validator.validateTemplate(dto);

    if (!validation.valid) {
      throw new BadRequestException({
        code: "ADMIN_TEMPLATE_VALIDATION_FAILED",
        validation,
      });
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

    const created = await this.prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: {
          code: dto.code?.trim() || `official-${slug}`,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          thumbnailUrl: dto.thumbnailUrl?.trim() || null,
          categoryId: category?.id,
          createdById: userId,
          status: "PUBLISHED",
          visibility: "OFFICIAL",
          sortOrder: 100,
          isFree: true,
          tags: this.buildMetadataTags(dto),
        },
      });

      await this.upsertTemplatePages(tx, template.id, dto.pages);
      await this.createTemplateVersion(tx, template.id);

      return template;
    });

    return {
      success: true,
      data: {
        id: created.id,
      },
    };
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAdminTemplateStatusDto,
  ) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: {
        pages: {
          include: {
            sections: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new BadRequestException("TEMPLATE_NOT_FOUND");
    }

    if (dto.status === "PUBLISHED") {
      const validation = this.validator.validateTemplate({
        name: template.name,
        slug: template.slug,
        code: template.code ?? undefined,
        description: template.description ?? undefined,
        thumbnailUrl: template.thumbnailUrl ?? undefined,
        category: undefined,
        ...this.extractMetadataTags(template.tags),
        pages: template.pages.map((page) => ({
          title: page.title,
          slug: page.slug,
          path: page.path ?? undefined,
          pageType: page.pageType as any,
          isHomePage: page.isHomePage,
          isPublished: page.isPublished,
          sortOrder: page.sortOrder,
          seoTitle: page.seoTitle ?? undefined,
          seoDescription: page.seoDescription ?? undefined,
          seoKeywords: page.seoKeywords ?? undefined,
          ogImageUrl: page.ogImageUrl ?? undefined,
          sections: page.sections.map((section) => ({
            type: section.type as any,
            name: section.name ?? undefined,
            sortOrder: section.sortOrder,
            isVisible: section.isVisible,
            props: this.asPlainObject(section.props),
          })),
        })),
      });

      if (!validation.valid) {
        throw new BadRequestException({
          code: "ADMIN_TEMPLATE_VALIDATION_FAILED",
          validation,
        });
      }
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        status: dto.status,
        visibility: dto.status === "ARCHIVED" ? "PRIVATE" : "OFFICIAL",
      },
      select: {
        id: true,
        status: true,
        visibility: true,
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  private normalizeTagArray(value: unknown, key: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }

    const rawValue = (value as Record<string, unknown>)[key];

    if (!Array.isArray(rawValue)) {
      return [];
    }

    return rawValue.filter((item): item is string => typeof item === "string");
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

  private buildMetadataTags(dto: CreateTemplateDto): Prisma.InputJsonObject {
    return {
      businessTypes: this.normalizeStringArray(dto.businessTypes),
      goals: this.normalizeStringArray(dto.goals),
      styles: this.normalizeStringArray(dto.styles),
      languages: this.normalizeStringArray(dto.languages),
      keywords: this.normalizeStringArray(dto.keywords),
    };
  }

  private extractMetadataTags(value: unknown) {
    return {
      businessTypes: this.normalizeTagArray(value, "businessTypes"),
      goals: this.normalizeTagArray(value, "goals"),
      styles: this.normalizeTagArray(value, "styles"),
      languages: this.normalizeTagArray(value, "languages"),
      keywords: this.normalizeTagArray(value, "keywords"),
    };
  }

  private normalizeStringArray(value: unknown): string[] {
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

  private asPlainObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
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
      const pagePath = isHomePage ? "/" : page.path?.trim() || `/${pageSlug}`;

      const createdPage = await tx.templatePage.create({
        data: {
          templateId,
          title: page.title.trim(),
          slug: pageSlug,
          pageType: page.pageType ?? (pageIndex === 0 ? "LANDING" : "NORMAL"),
          path: pagePath,
          isHomePage,
          isPublished: page.isPublished ?? true,
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

    await tx.templateVersion.create({
      data: {
        templateId,
        version: (latest?.version ?? 0) + 1,
        name: `v${(latest?.version ?? 0) + 1}`,
        snapshot,
        isActive: true,
      },
    });
  }
}
