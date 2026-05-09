import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { PrismaService } from "@/prisma/prisma.service";

@UseGuards(AccessJwtGuard, PlatformAdminGuard)
@Controller("admin/templates")
export class AdminTemplatesController {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
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
}
