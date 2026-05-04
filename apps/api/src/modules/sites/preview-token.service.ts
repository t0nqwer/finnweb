import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "@/prisma/prisma.service";
import {
  PREVIEW_TOKEN_EXPIRY_DAYS,
  PreviewTokenPolicyDto,
} from "./dto/preview-token.dto";
import {
  mapPublicPage,
  mapVisibleSections,
  selectPageFromSnapshot,
} from "./site-render-helpers";

@Injectable()
export class PreviewTokenService {
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
      throw new ForbiddenException("SITE_NOT_FOUND_OR_FORBIDDEN");
    }

    return site;
  }

  private resolvePreviewTokenExpiryDays(input?: number) {
    if (input && PREVIEW_TOKEN_EXPIRY_DAYS.includes(input as 1 | 3 | 7 | 14)) {
      return input;
    }

    return 7;
  }

  private buildPreviewTokenResponse(token: {
    id: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  }) {
    return {
      id: token.id,
      token: token.token,
      previewUrl: `/preview/${token.token}`,
      apiPreviewUrl: `/api/public/sites/preview/${token.token}`,
      expiresAt: token.expiresAt.toISOString(),
      createdAt: token.createdAt.toISOString(),
    };
  }

  async createPreviewToken(
    userId: string,
    siteId: string,
    dto?: PreviewTokenPolicyDto,
  ) {
    const site = await this.getAccessibleSite(userId, siteId);
    const expiryDays = this.resolvePreviewTokenExpiryDays(dto?.expiresInDays);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    const token = randomBytes(24).toString("hex");

    const created = await this.prisma.previewToken.create({
      data: {
        siteId: site.id,
        token,
        expiresAt,
        createdById: userId,
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...this.buildPreviewTokenResponse(created),
      expiryDays,
    };
  }

  async findPreviewTokens(userId: string, siteId: string) {
    const site = await this.getAccessibleSite(userId, siteId);
    const now = new Date();

    const tokens = await this.prisma.previewToken.findMany({
      where: {
        siteId: site.id,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
      take: 20,
    });

    return {
      items: tokens.map((item) => this.buildPreviewTokenResponse(item)),
    };
  }

  async revokePreviewToken(
    userId: string,
    siteId: string,
    previewTokenId: string,
  ) {
    const site = await this.getAccessibleSite(userId, siteId);

    const existing = await this.prisma.previewToken.findFirst({
      where: {
        id: previewTokenId,
        siteId: site.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("PREVIEW_TOKEN_NOT_FOUND");
    }

    await this.prisma.previewToken.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      id: existing.id,
      revoked: true,
    };
  }

  async refreshPreviewToken(
    userId: string,
    siteId: string,
    previewTokenId: string,
    dto?: PreviewTokenPolicyDto,
  ) {
    const site = await this.getAccessibleSite(userId, siteId);

    const existing = await this.prisma.previewToken.findFirst({
      where: {
        id: previewTokenId,
        siteId: site.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("PREVIEW_TOKEN_NOT_FOUND");
    }

    await this.prisma.previewToken.delete({
      where: {
        id: existing.id,
      },
    });

    return this.createPreviewToken(userId, site.id, dto);
  }

  // Preview tokens are the only public-read path allowed to render live draft rows.
  async getPreviewPageByToken(token: string, pathOrSlug?: string) {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new NotFoundException("PREVIEW_TOKEN_INVALID");
    }

    const previewToken = await this.prisma.previewToken.findUnique({
      where: {
        token: normalizedToken,
      },
      select: {
        siteId: true,
        expiresAt: true,
      },
    });

    if (!previewToken) {
      throw new NotFoundException("PREVIEW_TOKEN_INVALID");
    }

    if (previewToken.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException("PREVIEW_TOKEN_EXPIRED");
    }

    const site = await this.prisma.site.findUnique({
      where: {
        id: previewToken.siteId,
      },
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
    });

    if (!site) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const pages = await this.prisma.page.findMany({
      where: {
        siteId: previewToken.siteId,
      },
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
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const page = selectPageFromSnapshot(
      pages as unknown as Array<Record<string, unknown>>,
      pathOrSlug,
      { requirePublished: false },
    );
    if (!page) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    return {
      site,
      page: mapPublicPage(page),
      sections: mapVisibleSections(page),
      preview: {
        token: normalizedToken,
        expiresAt: previewToken.expiresAt.toISOString(),
      },
    };
  }
}
