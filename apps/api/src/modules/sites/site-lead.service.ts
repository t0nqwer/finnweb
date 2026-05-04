import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type * as runtime from "@prisma/client/runtime/client";
import { PrismaService } from "@/prisma/prisma.service";
import { GetSiteLeadsQueryDto } from "./dto/get-site-leads-query.dto";
import { SubmitPublicLeadDto } from "./dto/submit-public-lead.dto";
import { extractPublishedPagesFromSnapshot } from "./site-render-helpers";

@Injectable()
export class SiteLeadService {
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

  private extractUtmFromReferrer(referrer?: string) {
    if (!referrer) {
      return {
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
      };
    }

    try {
      const parsed = new URL(referrer);
      const params = parsed.searchParams;

      return {
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
      };
    } catch {
      return {
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
      };
    }
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

  async submitPublicLead(
    siteId: string,
    dto: SubmitPublicLeadDto,
    meta?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    },
  ) {
    const normalizedName = dto.name?.trim() ?? "";
    const normalizedEmail = dto.email?.trim().toLowerCase() || null;
    const normalizedPhone = dto.phone?.trim() || null;

    if (!normalizedName) {
      throw new BadRequestException("PUBLIC_LEAD_INVALID_NAME");
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException("PUBLIC_LEAD_INVALID_EMAIL");
    }

    if (normalizedPhone && !/^[0-9+()\-\s]{7,20}$/.test(normalizedPhone)) {
      throw new BadRequestException("PUBLIC_LEAD_INVALID_PHONE");
    }

    const site = await this.prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new NotFoundException("PUBLIC_SITE_NOT_FOUND");
    }

    const normalizedPageId = dto.pageId?.trim() || null;
    const normalizedSectionId = dto.sectionId?.trim() || null;

    if (normalizedPageId) {
      const latestPublish = await this.prisma.publishLog.findFirst({
        where: {
          siteId,
          action: "PUBLISH",
        },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        select: { snapshot: true },
      });

      const pages = latestPublish
        ? extractPublishedPagesFromSnapshot(latestPublish.snapshot)
        : [];
      const hasPage = pages.some(
        (page) => page.id === normalizedPageId && page.isPublished !== false,
      );

      if (!hasPage) {
        throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
      }
    }

    const slugSource = normalizedSectionId || normalizedPageId || "site";
    const formSlug = `public-${slugSource}`;

    const form = await this.prisma.form.upsert({
      where: {
        siteId_slug: {
          siteId,
          slug: formSlug,
        },
      },
      update: {
        pageId: normalizedPageId,
        status: "ACTIVE",
      },
      create: {
        siteId,
        pageId: normalizedPageId,
        slug: formSlug,
        name: normalizedPageId
          ? `Public lead form (${normalizedPageId.slice(-6)})`
          : "Public lead form",
        status: "ACTIVE",
        submitButtonText: "ส่งข้อมูล",
        successMessage: "ส่งข้อมูลเรียบร้อยแล้ว",
      },
      select: {
        id: true,
      },
    });

    const normalizedData = {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      message: dto.message?.trim() || null,
      pageId: normalizedPageId,
      sectionId: normalizedSectionId,
      siteId,
    };

    const utm = this.extractUtmFromReferrer(meta?.referrer);

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: normalizedData as runtime.InputJsonValue,
        referrer: meta?.referrer ?? null,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return {
      submissionId: submission.id,
      createdAt: submission.createdAt.toISOString(),
      siteId,
      pageId: normalizedPageId,
      formId: form.id,
    };
  }
}
