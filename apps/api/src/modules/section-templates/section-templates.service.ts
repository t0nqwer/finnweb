import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import {
  ListSectionTemplatesQueryDto,
  type SectionTemplateScope,
} from "./dto/list-section-templates-query.dto";

@Injectable()
export class SectionTemplatesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  private scopeToWhere(userId: string, scope: SectionTemplateScope) {
    if (scope === "my") {
      return { ownerId: userId };
    }

    if (scope === "all") {
      return {
        OR: [
          {
            isOfficial: true,
            isPublished: true,
          },
          {
            ownerId: userId,
          },
        ],
      };
    }

    return {
      isOfficial: true,
      isPublished: true,
    };
  }

  private toPayload(template: any) {
    const activeVersion =
      template.versions?.find((version: any) => version.isActive) ??
      template.versions?.[0] ??
      null;

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
      schemaJson: template.schemaJson,
      layoutJson: template.layoutJson,
      styleTokens: template.styleTokens,
      activeVersion: activeVersion
        ? {
            id: activeVersion.id,
            version: activeVersion.version,
            name: activeVersion.name,
            renderMode: activeVersion.renderMode,
            htmlTemplate: activeVersion.htmlTemplate,
            cssTemplate: activeVersion.cssTemplate,
            snapshot: activeVersion.snapshot,
            createdAt: activeVersion.createdAt,
          }
        : null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  async list(userId: string, query: ListSectionTemplatesQueryDto) {
    const scope = query.scope ?? "official";
    const templates = await (this.prisma as any).sectionTemplate.findMany({
      where: {
        ...this.scopeToWhere(userId, scope),
        ...(query.type ? { sectionType: query.type } : {}),
      },
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
    });

    return {
      success: true,
      data: templates.map((template: any) => this.toPayload(template)),
    };
  }

  async findOne(userId: string, templateId: string) {
    const template = await (this.prisma as any).sectionTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { ownerId: userId },
          {
            isOfficial: true,
            isPublished: true,
          },
        ],
      },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException("SECTION_TEMPLATE_NOT_FOUND");
    }

    return {
      success: true,
      data: this.toPayload(template),
    };
  }
}
