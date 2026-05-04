import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { PLAN_GATING_ERROR_CODES } from "@/common/constants/plan-gating-errors.constant";
import type * as runtime from "@prisma/client/runtime/client";
import { CreatePageDto } from "./dto/create-page.dto";
import { CreateSiteDto } from "./dto/create-site.dto";
import { ApplyTemplateDto } from "./dto/apply-site-template.dto";
import { UpdatePageDto } from "./dto/update-page.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { ReorderSectionsDto } from "./dto/reorder-sections.dto";
import { GetSiteLeadsQueryDto } from "./dto/get-site-leads-query.dto";
import { SubmitPublicLeadDto } from "./dto/submit-public-lead.dto";
import { SwitchSectionTemplateDto } from "./dto/switch-section-template.dto";
import { mergeSectionPropsByCanonicalSlots } from "../section-templates/section-template-mapper";
import {
  PREVIEW_TOKEN_EXPIRY_DAYS,
  PreviewTokenPolicyDto,
} from "./dto/preview-token.dto";
import { SitePublishingService } from "./site-publishing.service";
import { PublicSiteRenderService } from "./public-site-render.service";
import { SiteLeadService } from "./site-lead.service";
import { PreviewTokenService } from "./preview-token.service";

type TemplatePlaceholderValues = Record<string, string>;
type TemplateAnswersInput = {
  brandName?: string;
  businessName?: string;
  businessType?: string;
  goal?: string;
  style?: string;
  language?: string;
  phone?: string;
  lineId?: string;
  logoUrl?: string;
};

@Injectable()
export class SitesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SitePublishingService)
    private readonly sitePublishingService: SitePublishingService,
    @Inject(PublicSiteRenderService)
    private readonly publicSiteRenderService: PublicSiteRenderService,
    @Inject(SiteLeadService)
    private readonly siteLeadService: SiteLeadService,
    @Inject(PreviewTokenService)
    private readonly previewTokenService: PreviewTokenService,
  ) {}
  private readonly sectionTemplateSummarySelect = {
    id: true,
    code: true,
    name: true,
    sectionType: true,
    thumbnailUrl: true,
    isOfficial: true,
    isPublished: true,
    sortOrder: true,
  } as const;

  private ensureString(
    value: unknown,
    errorCode: string,
    maxLength = 200,
  ): string {
    if (typeof value !== "string") {
      throw new BadRequestException(errorCode);
    }

    const trimmed = value.trim();

    if (!trimmed || trimmed.length > maxLength) {
      throw new BadRequestException(errorCode);
    }

    return trimmed;
  }

  private normalizeIntegerProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
    min: number,
    max: number,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];
    if (raw === null || raw === undefined || raw === "") {
      props[key] = min;
      return;
    }

    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(errorCode);
    }

    props[key] = parsed;
  }

  private normalizeEnumStringProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
    allowed: string[],
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (typeof raw !== "string") {
      throw new BadRequestException(errorCode);
    }

    const trimmed = raw.trim();

    if (!allowed.includes(trimmed)) {
      throw new BadRequestException(errorCode);
    }

    props[key] = trimmed;
  }

  private normalizeMenuItemsProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (!Array.isArray(raw) || raw.length > 20) {
      throw new BadRequestException(errorCode);
    }

    props[key] = raw.map((item) => {
      if (!this.isPlainObject(item)) {
        throw new BadRequestException(errorCode);
      }

      return {
        label: this.ensureString(item.label, errorCode, 120),
        href: this.ensureString(item.href, errorCode, 300),
      };
    });
  }

  private normalizePromosProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (!Array.isArray(raw) || raw.length > 10) {
      throw new BadRequestException(errorCode);
    }

    props[key] = raw.map((item) => {
      if (!this.isPlainObject(item)) {
        throw new BadRequestException(errorCode);
      }

      return {
        title: this.ensureString(item.title, errorCode, 120),
        body: this.ensureString(item.body, errorCode, 500),
      };
    });
  }

  private normalizeBookingFieldsProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (!Array.isArray(raw) || raw.length > 20) {
      throw new BadRequestException(errorCode);
    }

    props[key] = raw.map((item) => {
      if (!this.isPlainObject(item)) {
        throw new BadRequestException(errorCode);
      }

      return {
        label: this.ensureString(item.label, errorCode, 120),
        name: this.ensureString(item.name, errorCode, 80),
        type: this.ensureString(item.type, errorCode, 40),
      };
    });
  }

  private normalizeCtaProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (!this.isPlainObject(raw)) {
      throw new BadRequestException(errorCode);
    }

    props[key] = {
      label: this.ensureString(raw.label, errorCode, 120),
      href: this.ensureString(raw.href, errorCode, 300),
    };
  }

  private normalizeOptionalBooleanProp(
    value: unknown,
    errorCode: string,
  ): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "boolean") {
      throw new BadRequestException(errorCode);
    }

    return value;
  }

  private normalizeOptionalSectionId(
    value: unknown,
    errorCode: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(errorCode);
    }

    const normalized = value.trim().replace(/^#/, "");
    if (!normalized || normalized.length > 120) {
      throw new BadRequestException(errorCode);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
      throw new BadRequestException(errorCode);
    }

    return normalized;
  }

  private normalizeOptionalPagePath(
    value: unknown,
    errorCode: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(errorCode);
    }

    const normalized = this.normalizePath(value.trim());
    if (!normalized || normalized.length > 300) {
      throw new BadRequestException(errorCode);
    }

    return normalized;
  }

  private normalizeOptionalPageId(
    value: unknown,
    errorCode: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(errorCode);
    }

    const normalized = value.trim();
    if (!normalized || normalized.length > 120) {
      throw new BadRequestException(errorCode);
    }

    if (!/^[a-zA-Z0-9]+$/.test(normalized)) {
      throw new BadRequestException(errorCode);
    }

    return normalized;
  }

  private normalizeOptionalExternalUrl(
    value: unknown,
    errorCode: string,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new BadRequestException(errorCode);
    }

    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed) || trimmed.length > 1000) {
      throw new BadRequestException(errorCode);
    }

    return trimmed;
  }

  private inferNavbarLinkFromHref(href: string, errorCode: string) {
    const trimmed = href.trim();

    if (!trimmed) {
      throw new BadRequestException(errorCode);
    }

    if (trimmed.startsWith("#")) {
      const sectionId = this.normalizeOptionalSectionId(trimmed, errorCode);
      if (!sectionId) {
        throw new BadRequestException(errorCode);
      }

      return {
        linkType: "section" as const,
        sectionId,
        href: `#${sectionId}`,
      };
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const url = this.normalizeOptionalExternalUrl(trimmed, errorCode);
      if (!url) {
        throw new BadRequestException(errorCode);
      }

      return {
        linkType: "external" as const,
        url,
        href: url,
      };
    }

    const pagePath = this.normalizeOptionalPagePath(trimmed, errorCode);
    if (!pagePath) {
      throw new BadRequestException(errorCode);
    }

    return {
      linkType: "page" as const,
      pagePath,
      href: pagePath,
    };
  }

  private normalizeNavbarLinkItem(
    item: unknown,
    errorCode: string,
    allowStyle = false,
  ) {
    if (!this.isPlainObject(item)) {
      throw new BadRequestException(errorCode);
    }

    const label = this.ensureString(item.label, errorCode, 120);
    const hrefFromLegacy =
      typeof item.href === "string" ? item.href.trim() : undefined;
    const linkTypeRaw =
      typeof item.linkType === "string" ? item.linkType.trim() : undefined;

    let link:
      | { linkType: "section"; sectionId: string; href: string }
      | { linkType: "page"; pagePath: string; href: string }
      | { linkType: "external"; url: string; href: string };

    if (linkTypeRaw) {
      if (!["section", "page", "external"].includes(linkTypeRaw)) {
        throw new BadRequestException(errorCode);
      }

      if (linkTypeRaw === "section") {
        const sectionId = this.normalizeOptionalSectionId(
          item.sectionId,
          errorCode,
        );
        if (!sectionId) {
          throw new BadRequestException(errorCode);
        }
        link = { linkType: "section", sectionId, href: `#${sectionId}` };
      } else if (linkTypeRaw === "page") {
        const pagePath = this.normalizeOptionalPagePath(
          item.pagePath ?? hrefFromLegacy,
          errorCode,
        );
        if (!pagePath) {
          throw new BadRequestException(errorCode);
        }
        const pageId = this.normalizeOptionalPageId(item.pageId, errorCode);
        link = {
          linkType: "page",
          pagePath,
          href: pagePath,
          ...(pageId ? { pageId } : {}),
        };
      } else {
        const url = this.normalizeOptionalExternalUrl(
          item.url ?? hrefFromLegacy,
          errorCode,
        );
        if (!url) {
          throw new BadRequestException(errorCode);
        }
        link = { linkType: "external", url, href: url };
      }
    } else if (hrefFromLegacy) {
      link = this.inferNavbarLinkFromHref(hrefFromLegacy, errorCode);
    } else {
      throw new BadRequestException(errorCode);
    }

    const normalized: Record<string, unknown> = {
      label,
      ...link,
    };

    const openInNewTab = this.normalizeOptionalBooleanProp(
      item.openInNewTab,
      errorCode,
    );
    if (openInNewTab !== undefined) {
      normalized.openInNewTab = openInNewTab;
    }

    const noFollow = this.normalizeOptionalBooleanProp(
      item.noFollow,
      errorCode,
    );
    if (noFollow !== undefined) {
      normalized.noFollow = noFollow;
    }

    if (allowStyle && item.style !== undefined) {
      if (typeof item.style !== "string") {
        throw new BadRequestException(errorCode);
      }

      const style = item.style.trim();
      if (!["solid", "outline"].includes(style)) {
        throw new BadRequestException(errorCode);
      }
      normalized.style = style;
    }

    return normalized;
  }

  private normalizeNavbarMenuItemsProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];
    if (!Array.isArray(raw) || raw.length > 20) {
      throw new BadRequestException(errorCode);
    }

    props[key] = raw.map((item) =>
      this.normalizeNavbarLinkItem(item, errorCode),
    );
  }

  private normalizeNavbarCtaProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];
    props[key] = this.normalizeNavbarLinkItem(raw, errorCode, true);
  }

  private normalizeNavbarLogoProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (typeof raw === "string") {
      const value = raw.trim();
      if (!value) {
        props[key] = {
          mode: "theme",
          themeKey: "brand",
        };
        return;
      }

      const isAbsoluteHttp = /^https?:\/\//i.test(value);
      const isRootRelative = value.startsWith("/");
      if (!isAbsoluteHttp && !isRootRelative) {
        throw new BadRequestException(errorCode);
      }

      props[key] = {
        mode: "custom",
        url: value,
      };
      return;
    }

    if (!this.isPlainObject(raw)) {
      throw new BadRequestException(errorCode);
    }

    const mode =
      typeof raw.mode === "string" && ["theme", "custom"].includes(raw.mode)
        ? raw.mode
        : typeof raw.url === "string" && raw.url.trim()
          ? "custom"
          : "theme";

    const nextLogo: Record<string, unknown> = { mode };

    if (mode === "theme") {
      const themeKeyRaw =
        typeof raw.themeKey === "string" ? raw.themeKey.trim() : "brand";
      if (!["brand", "light", "dark", "mono"].includes(themeKeyRaw)) {
        throw new BadRequestException(errorCode);
      }
      nextLogo.themeKey = themeKeyRaw;
    } else {
      const url = this.normalizeOptionalExternalUrl(raw.url, errorCode);
      const rootRelativeUrl =
        typeof raw.url === "string" && raw.url.trim().startsWith("/")
          ? raw.url.trim()
          : null;

      if (!url && !rootRelativeUrl) {
        throw new BadRequestException(errorCode);
      }

      nextLogo.url = url ?? rootRelativeUrl;
    }

    if (raw.alt !== undefined) {
      nextLogo.alt = this.ensureString(raw.alt, errorCode, 200);
    }

    if (raw.width !== undefined) {
      const width = Number(raw.width);
      if (!Number.isInteger(width) || width < 40 || width > 420) {
        throw new BadRequestException(errorCode);
      }
      nextLogo.width = width;
    }

    props[key] = nextLogo;
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

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private normalizeSectionStringProp(
    props: Record<string, unknown>,
    key: string,
    maxLength: number,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (raw === null) {
      props[key] = "";
      return;
    }

    if (typeof raw !== "string") {
      throw new BadRequestException(errorCode);
    }

    const trimmed = raw.trim();

    if (trimmed.length > maxLength) {
      throw new BadRequestException(errorCode);
    }

    props[key] = trimmed;
  }

  private normalizeImageUrlProp(
    props: Record<string, unknown>,
    key: string,
    errorCode: string,
  ) {
    if (!(key in props)) {
      return;
    }

    const raw = props[key];

    if (raw === null) {
      props[key] = "";
      return;
    }

    if (typeof raw !== "string") {
      throw new BadRequestException(errorCode);
    }

    const trimmed = raw.trim();

    if (!trimmed) {
      props[key] = "";
      return;
    }

    const isAbsoluteHttp = /^https?:\/\//i.test(trimmed);
    const isRootRelative = trimmed.startsWith("/");

    if (!isAbsoluteHttp && !isRootRelative) {
      throw new BadRequestException(errorCode);
    }

    props[key] = trimmed;
  }

  private validateDefaultSectionPropsSchema(
    value: unknown,
    depth: number,
    parentKey: string,
  ) {
    if (depth > 6) {
      throw new BadRequestException(`SECTION_PROPS_INVALID_${parentKey}_DEPTH`);
    }

    if (value === null) {
      return;
    }

    const valueType = typeof value;

    if (valueType === "string") {
      if ((value as string).length > 5000) {
        throw new BadRequestException(
          `SECTION_PROPS_INVALID_${parentKey}_LENGTH`,
        );
      }
      return;
    }

    if (valueType === "number") {
      if (!Number.isFinite(value as number)) {
        throw new BadRequestException(`SECTION_PROPS_INVALID_${parentKey}`);
      }
      return;
    }

    if (valueType === "boolean") {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 200) {
        throw new BadRequestException(
          `SECTION_PROPS_INVALID_${parentKey}_SIZE`,
        );
      }

      for (const item of value) {
        this.validateDefaultSectionPropsSchema(item, depth + 1, parentKey);
      }
      return;
    }

    if (this.isPlainObject(value)) {
      const entries = Object.entries(value);
      if (entries.length > 100) {
        throw new BadRequestException(
          `SECTION_PROPS_INVALID_${parentKey}_SIZE`,
        );
      }

      for (const [key, item] of entries) {
        const normalizedKey = key
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .toUpperCase();

        this.validateDefaultSectionPropsSchema(
          item,
          depth + 1,
          normalizedKey || parentKey,
        );
      }
      return;
    }

    throw new BadRequestException(`SECTION_PROPS_INVALID_${parentKey}`);
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

  private async getEditableSite(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        workspace: {
          members: {
            some: {
              userId,
              role: {
                in: ["OWNER", "ADMIN", "EDITOR", "MARKETER"],
              },
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

  private async resolveTemplateForSiteCreation(
    userId: string,
    templateId?: string,
  ) {
    if (!templateId) {
      return null;
    }

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
    });

    if (!template) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }

    return template;
  }

  private normalizeTemplateSnapshot(snapshot: unknown) {
    if (!this.isPlainObject(snapshot)) {
      return [];
    }

    const pages = Array.isArray(snapshot.pages) ? snapshot.pages : [];

    return pages
      .filter((item) => this.isPlainObject(item))
      .map((page, pageIndex) => {
        const pageTitle =
          typeof page.title === "string" && page.title.trim()
            ? page.title.trim()
            : `Page ${pageIndex + 1}`;
        const pageSlug =
          typeof page.slug === "string" && page.slug.trim()
            ? this.makeSlug(page.slug)
            : this.makeSlug(pageTitle);
        const pagePath =
          typeof page.path === "string" && page.path.trim()
            ? page.path
            : pageIndex === 0
              ? "/"
              : `/${pageSlug}`;
        const sections = Array.isArray(page.sections) ? page.sections : [];

        return {
          title: pageTitle,
          slug: pageSlug || `page-${pageIndex + 1}`,
          pageType:
            typeof page.pageType === "string" && page.pageType.trim()
              ? page.pageType
              : pageIndex === 0
                ? "LANDING"
                : "NORMAL",
          path: pagePath,
          isHomePage: Boolean(page.isHomePage ?? pageIndex === 0),
          isPublished: Boolean(page.isPublished),
          sortOrder:
            typeof page.sortOrder === "number" ? page.sortOrder : pageIndex,
          seoTitle: typeof page.seoTitle === "string" ? page.seoTitle : null,
          seoDescription:
            typeof page.seoDescription === "string"
              ? page.seoDescription
              : null,
          seoKeywords:
            typeof page.seoKeywords === "string" ? page.seoKeywords : null,
          ogImageUrl:
            typeof page.ogImageUrl === "string" ? page.ogImageUrl : null,
          sections: sections
            .filter((section) => this.isPlainObject(section))
            .map((section, sectionIndex) => ({
              type:
                typeof section.type === "string" && section.type.trim()
                  ? section.type
                  : "RICH_TEXT",
              name: typeof section.name === "string" ? section.name : null,
              sortOrder:
                typeof section.sortOrder === "number"
                  ? section.sortOrder
                  : sectionIndex,
              isVisible:
                section.isVisible === undefined
                  ? true
                  : Boolean(section.isVisible),
              props: this.isPlainObject(section.props)
                ? (section.props as Record<string, unknown>)
                : {},
            })),
        };
      });
  }

  private buildLineUrl(lineId: string) {
    const normalizedLineId = lineId.trim();

    if (!normalizedLineId) {
      return "";
    }

    return `https://line.me/R/ti/p/${normalizedLineId}`;
  }

  private buildTemplatePlaceholderValues(
    name: string,
    answers: TemplateAnswersInput,
  ): TemplatePlaceholderValues {
    const brandName =
      answers.businessName?.trim() || answers.brandName?.trim() || name;
    const phone = answers.phone?.trim() || "";
    const lineId = answers.lineId?.trim() || "";
    const logoUrl = answers.logoUrl?.trim() || "";
    const businessType = answers.businessType?.trim() || "";
    const goal = answers.goal?.trim() || "";
    const style = answers.style?.trim() || "";
    const language = answers.language?.trim() || "";

    return {
      businessName: brandName,
      brandName,
      siteName: name,
      businessType,
      goal,
      mainGoal: goal,
      style,
      language,
      phone,
      lineId,
      lineUrl: this.buildLineUrl(lineId),
      logoUrl,
    };
  }

  private replaceTemplatePlaceholdersInString(
    value: string,
    placeholders: TemplatePlaceholderValues,
  ) {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
      return placeholders[key] ?? "";
    });
  }

  private replaceOptionalTemplatePlaceholders(
    value: string | null | undefined,
    placeholders: TemplatePlaceholderValues,
  ) {
    if (typeof value !== "string") {
      return value ?? null;
    }

    return this.replaceTemplatePlaceholdersInString(value, placeholders);
  }

  private replaceTemplatePlaceholders(
    value: unknown,
    placeholders: TemplatePlaceholderValues,
  ): unknown {
    if (typeof value === "string") {
      return this.replaceTemplatePlaceholdersInString(value, placeholders);
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.replaceTemplatePlaceholders(item, placeholders),
      );
    }

    if (this.isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          this.replaceTemplatePlaceholders(nestedValue, placeholders),
        ]),
      );
    }

    return value;
  }

  private async installTemplateIntoSite(
    tx: any,
    siteId: string,
    template: NonNullable<
      Awaited<ReturnType<typeof this.resolveTemplateForSiteCreation>>
    >,
    installedById: string,
    placeholders: TemplatePlaceholderValues,
    options?: {
      replaceDraftPages?: boolean;
      forceDraftPages?: boolean;
    },
  ) {
    let replacedDraftPagesCount = 0;
    let createdPagesCount = 0;
    let createdSectionsCount = 0;

    if (options?.replaceDraftPages) {
      const draftPages = await tx.page.findMany({
        where: {
          siteId,
          isPublished: false,
        },
        select: {
          id: true,
        },
      });

      if (draftPages.length > 0) {
        replacedDraftPagesCount = draftPages.length;
        await tx.page.deleteMany({
          where: {
            id: {
              in: draftPages.map((page: { id: string }) => page.id),
            },
          },
        });
      }
    }

    const templatePages =
      template.pages.length > 0
        ? template.pages.map((page) => ({
            title: this.replaceTemplatePlaceholdersInString(
              page.title,
              placeholders,
            ),
            slug: page.slug,
            pageType: page.pageType,
            path: page.path,
            isHomePage: page.isHomePage,
            isPublished: page.isPublished,
            sortOrder: page.sortOrder,
            seoTitle: this.replaceOptionalTemplatePlaceholders(
              page.seoTitle,
              placeholders,
            ),
            seoDescription: this.replaceOptionalTemplatePlaceholders(
              page.seoDescription,
              placeholders,
            ),
            seoKeywords: this.replaceOptionalTemplatePlaceholders(
              page.seoKeywords,
              placeholders,
            ),
            ogImageUrl: this.replaceOptionalTemplatePlaceholders(
              page.ogImageUrl,
              placeholders,
            ),
            sections: page.sections.map((section) => ({
              type: section.type,
              name: this.replaceOptionalTemplatePlaceholders(
                section.name,
                placeholders,
              ),
              sortOrder: section.sortOrder,
              isVisible: section.isVisible,
              props:
                this.isPlainObject(section.props) ||
                Array.isArray(section.props)
                  ? this.replaceTemplatePlaceholders(
                      section.props,
                      placeholders,
                    )
                  : {},
            })),
          }))
        : this.normalizeTemplateSnapshot(template.versions[0]?.snapshot).map(
            (page) => ({
              ...page,
              title: this.replaceTemplatePlaceholdersInString(
                page.title,
                placeholders,
              ),
              seoTitle: this.replaceOptionalTemplatePlaceholders(
                page.seoTitle,
                placeholders,
              ),
              seoDescription: this.replaceOptionalTemplatePlaceholders(
                page.seoDescription,
                placeholders,
              ),
              seoKeywords: this.replaceOptionalTemplatePlaceholders(
                page.seoKeywords,
                placeholders,
              ),
              ogImageUrl: this.replaceOptionalTemplatePlaceholders(
                page.ogImageUrl,
                placeholders,
              ),
              sections: page.sections.map((section) => ({
                ...section,
                name: this.replaceOptionalTemplatePlaceholders(
                  section.name,
                  placeholders,
                ),
                props: this.replaceTemplatePlaceholders(
                  section.props,
                  placeholders,
                ),
              })),
            }),
          );

    if (templatePages.length === 0) {
      await tx.page.create({
        data: {
          siteId,
          title: "Home",
          slug: "home",
          path: "/",
          pageType: "LANDING",
          isHomePage: true,
          isPublished: false,
          sortOrder: 0,
        },
      });
      createdPagesCount += 1;
    } else {
      for (const [pageIndex, templatePage] of templatePages.entries()) {
        const slug = this.makeSlug(templatePage.slug || templatePage.title);
        const finalSlug = slug || `page-${pageIndex + 1}`;
        const isHomePage = Boolean(templatePage.isHomePage || pageIndex === 0);
        const path = this.buildPagePath(
          finalSlug,
          templatePage.path ?? undefined,
          isHomePage,
        );

        const createdPage = await tx.page.create({
          data: {
            siteId,
            title: templatePage.title,
            slug: finalSlug,
            pageType: templatePage.pageType,
            path,
            isHomePage,
            isPublished: options?.forceDraftPages
              ? false
              : Boolean(templatePage.isPublished),
            sortOrder: pageIndex,
            seoTitle: templatePage.seoTitle,
            seoDescription: templatePage.seoDescription,
            seoKeywords: templatePage.seoKeywords,
            ogImageUrl: templatePage.ogImageUrl,
          },
        });
        createdPagesCount += 1;

        for (const [
          sectionIndex,
          templateSection,
        ] of templatePage.sections.entries()) {
          await tx.section.create({
            data: {
              pageId: createdPage.id,
              type: templateSection.type,
              name: templateSection.name,
              sortOrder:
                typeof templateSection.sortOrder === "number"
                  ? templateSection.sortOrder
                  : sectionIndex,
              isVisible:
                templateSection.isVisible === undefined
                  ? true
                  : Boolean(templateSection.isVisible),
              props: this.validateSectionProps(
                templateSection.type,
                this.isPlainObject(templateSection.props)
                  ? templateSection.props
                  : {},
              ),
            },
          });
          createdSectionsCount += 1;
        }
      }
    }

    await tx.templateInstall.create({
      data: {
        templateId: template.id,
        siteId,
        versionId: template.versions[0]?.id ?? null,
        installedById,
      },
    });

    await tx.template.update({
      where: { id: template.id },
      data: {
        installCount: {
          increment: 1,
        },
      },
    });

    return {
      createdPagesCount,
      createdSectionsCount,
      replacedDraftPagesCount,
    };
  }

  private extractTemplateThemeConfig(template: {
    tags: unknown;
  }): runtime.InputJsonValue | undefined {
    if (!this.isPlainObject(template.tags)) {
      return undefined;
    }

    const theme = (template.tags as Record<string, unknown>).theme;

    if (!this.isPlainObject(theme)) {
      return undefined;
    }

    return theme as runtime.InputJsonValue;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

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
    const template = await this.resolveTemplateForSiteCreation(
      userId,
      dto.templateId,
    );

    const templateThemeConfig = template
      ? this.extractTemplateThemeConfig(template)
      : undefined;
    const templatePlaceholders = this.buildTemplatePlaceholderValues(name, dto);

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          workspaceId: workspace.id,
          name,
          slug,
          defaultSeoTitle: name,
          themeConfig: templateThemeConfig,
          contentEnabled: Boolean(
            currentSubscription?.plan?.allowBlog ||
            currentSubscription?.plan?.allowNews,
          ),
          ecommerceEnabled: Boolean(currentSubscription?.plan?.allowEcommerce),
        },
      });

      if (template) {
        await this.installTemplateIntoSite(
          tx,
          site.id,
          template,
          userId,
          templatePlaceholders,
        );
      } else {
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
      }

      return site;
    });
  }

  // ─── Templates ────────────────────────────────────────────────────────────────

  async applyTemplate(userId: string, siteId: string, dto: ApplyTemplateDto) {
    const site = await this.getEditableSite(userId, siteId);
    const template = await this.resolveTemplateForSiteCreation(
      userId,
      dto.templateId,
    );
    if (!template) {
      throw new NotFoundException("TEMPLATE_NOT_FOUND");
    }
    const templateThemeConfig = this.extractTemplateThemeConfig(template);
    const templatePlaceholders = this.buildTemplatePlaceholderValues(
      site.name,
      {
        businessName: dto.businessName,
        businessType: dto.businessType,
        goal: dto.goal,
        style: dto.style,
        language: dto.language,
        phone: dto.phone,
        lineId: dto.lineId,
        logoUrl: dto.logoUrl,
      },
    );

    return this.prisma.$transaction(async (tx) => {
      const installResult = await this.installTemplateIntoSite(
        tx,
        site.id,
        template,
        userId,
        templatePlaceholders,
        {
          replaceDraftPages: true,
          forceDraftPages: true,
        },
      );

      if (templateThemeConfig !== undefined) {
        await tx.site.update({
          where: { id: site.id },
          data: {
            themeConfig: templateThemeConfig,
          },
        });
      }

      const updatedSite = await tx.site.findUnique({
        where: {
          id: site.id,
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
      });

      if (!updatedSite) {
        throw new NotFoundException("SITE_NOT_FOUND_OR_FORBIDDEN");
      }

      return {
        site: updatedSite,
        pagesCount: installResult.createdPagesCount,
        sectionsCount: installResult.createdSectionsCount,
      };
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

  async removeSite(userId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        workspace: {
          members: {
            some: {
              userId,
              role: {
                in: ["OWNER", "ADMIN"],
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      throw new ForbiddenException("SITE_NOT_FOUND_OR_FORBIDDEN");
    }

    await this.prisma.site.delete({
      where: {
        id: siteId,
      },
    });

    return {
      id: siteId,
      deleted: true,
    };
  }

  // ─── Pages ────────────────────────────────────────────────────────────────────

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

    const page = await (this.prisma.page as any).findFirst({
      where: {
        id: pageId,
        siteId,
      },
      include: {
        sections: {
          include: {
            sectionTemplate: {
              select: this.sectionTemplateSummarySelect,
            },
          },
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

    const hydratedSections = await Promise.all(
      ((page as any).sections ?? []).map((section: any) =>
        this.ensureSectionTemplateAttached(section),
      ),
    );

    return {
      ...page,
      sections: hydratedSections,
    };
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

  // ─── Sections ──────────────────────────────────────────────────────────────

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

  private extractSectionTemplateDefaultProps(template: {
    layoutJson: unknown;
    versions: Array<{ snapshot: unknown }>;
  }) {
    const fromLayout = this.isPlainObject(template.layoutJson)
      ? ((template.layoutJson as Record<string, unknown>).defaultProps ?? null)
      : null;

    if (this.isPlainObject(fromLayout)) {
      return fromLayout as Record<string, unknown>;
    }

    const snapshot = template.versions[0]?.snapshot;
    if (!this.isPlainObject(snapshot)) {
      return {};
    }

    const props = (snapshot as Record<string, unknown>).props;
    if (!this.isPlainObject(props)) {
      return {};
    }

    return props as Record<string, unknown>;
  }

  private async getAccessibleSectionTemplate(
    userId: string,
    templateId: string,
  ) {
    const template = await (this.prisma as any).sectionTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          {
            isOfficial: true,
            isPublished: true,
          },
          {
            ownerId: userId,
          },
        ],
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
    });

    if (!template) {
      throw new NotFoundException("SECTION_TEMPLATE_NOT_FOUND");
    }

    return template;
  }

  private async getDefaultSectionTemplateByType(type: string) {
    return (this.prisma as any).sectionTemplate.findFirst({
      where: {
        sectionType: type as any,
        isOfficial: true,
        isPublished: true,
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
  }

  private async ensureSectionTemplateAttached(section: {
    id: string;
    type: string;
    props: unknown;
    sectionTemplateId: string | null;
    sectionTemplate?: unknown;
  }) {
    if (section.sectionTemplateId && section.sectionTemplate) {
      return section;
    }

    if (section.sectionTemplateId && !section.sectionTemplate) {
      const reloaded = await (this.prisma.section as any).findUnique({
        where: { id: section.id },
        include: {
          sectionTemplate: {
            select: this.sectionTemplateSummarySelect,
          },
        },
      });
      return reloaded ?? section;
    }

    const defaultTemplate = await this.getDefaultSectionTemplateByType(
      section.type,
    );
    if (!defaultTemplate) {
      return section;
    }

    const { nextProps, unmappedLegacy } = mergeSectionPropsByCanonicalSlots(
      section.type,
      this.isPlainObject(section.props)
        ? (section.props as Record<string, unknown>)
        : {},
      this.extractSectionTemplateDefaultProps(defaultTemplate),
    );

    const validatedProps = this.validateSectionProps(section.type, nextProps);

    const updated = await (this.prisma.section as any).update({
      where: { id: section.id },
      data: {
        sectionTemplateId: defaultTemplate.id,
        templateVersion: defaultTemplate.versions[0]?.version ?? 1,
        templateMeta: {
          mappingStrategy: "canonical-slots-v1",
          migratedAt: new Date().toISOString(),
          source: "auto-default-by-type",
        } as runtime.InputJsonValue,
        customData:
          Object.keys(unmappedLegacy).length > 0
            ? (unmappedLegacy as runtime.InputJsonValue)
            : null,
        props: validatedProps,
      },
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
    });

    return updated;
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

    const selectedTemplate = dto.sectionTemplateId
      ? await this.getAccessibleSectionTemplate(userId, dto.sectionTemplateId)
      : null;

    const sectionType = selectedTemplate?.sectionType ?? dto.type;
    if (!sectionType) {
      throw new BadRequestException("SECTION_TEMPLATE_OR_TYPE_REQUIRED");
    }

    const merged = selectedTemplate
      ? mergeSectionPropsByCanonicalSlots(
          sectionType,
          dto.props || {},
          this.extractSectionTemplateDefaultProps(selectedTemplate),
        )
      : {
          nextProps: (dto.props || {}) as Record<string, unknown>,
          unmappedLegacy: {},
        };
    const validatedProps = this.validateSectionProps(
      sectionType,
      merged.nextProps,
    );

    return (this.prisma.section as any).create({
      data: {
        pageId,
        sectionTemplateId: selectedTemplate?.id ?? null,
        type: sectionType as any,
        name: dto.name || null,
        sortOrder: dto.sortOrder ?? page._count.sections,
        templateVersion: selectedTemplate?.versions[0]?.version ?? null,
        templateMeta: selectedTemplate
          ? ({
              mappingStrategy: "canonical-slots-v1",
              source: "create",
            } as runtime.InputJsonValue)
          : null,
        customData:
          Object.keys(merged.unmappedLegacy).length > 0
            ? (merged.unmappedLegacy as runtime.InputJsonValue)
            : null,
        props: validatedProps,
      },
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
    });
  }

  async findSections(userId: string, siteId: string, pageId: string) {
    await this.getAccessiblePage(userId, siteId, pageId);

    const sections = await (this.prisma.section as any).findMany({
      where: {
        pageId,
      },
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return Promise.all(
      sections.map((section: any) =>
        this.ensureSectionTemplateAttached(section),
      ),
    );
  }

  async findSection(
    userId: string,
    siteId: string,
    pageId: string,
    sectionId: string,
  ) {
    await this.getAccessiblePage(userId, siteId, pageId);

    const section = await (this.prisma.section as any).findFirst({
      where: {
        id: sectionId,
        pageId,
      },
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
    });

    if (!section) {
      throw new NotFoundException("SECTION_NOT_FOUND");
    }

    return this.ensureSectionTemplateAttached(section);
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

    return (this.prisma.section as any).update({
      where: {
        id: sectionId,
      },
      data: updateData,
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
    });
  }

  async switchSectionTemplate(
    userId: string,
    siteId: string,
    pageId: string,
    sectionId: string,
    dto: SwitchSectionTemplateDto,
  ) {
    const section = await this.findSection(userId, siteId, pageId, sectionId);
    const nextTemplate = await this.getAccessibleSectionTemplate(
      userId,
      dto.sectionTemplateId,
    );

    if (nextTemplate.sectionType !== section.type) {
      throw new BadRequestException("SECTION_TEMPLATE_TYPE_MISMATCH");
    }

    const merged = mergeSectionPropsByCanonicalSlots(
      section.type,
      this.isPlainObject(section.props)
        ? (section.props as Record<string, unknown>)
        : {},
      this.extractSectionTemplateDefaultProps(nextTemplate),
    );

    const validatedProps = this.validateSectionProps(
      section.type,
      merged.nextProps,
    );

    return (this.prisma.section as any).update({
      where: {
        id: sectionId,
      },
      data: {
        sectionTemplateId: nextTemplate.id,
        templateVersion: nextTemplate.versions[0]?.version ?? 1,
        templateMeta: {
          mappingStrategy: "canonical-slots-v1",
          source: "switch-template",
          switchedAt: new Date().toISOString(),
        } as runtime.InputJsonValue,
        customData:
          Object.keys(merged.unmappedLegacy).length > 0
            ? (merged.unmappedLegacy as runtime.InputJsonValue)
            : null,
        props: validatedProps,
      },
      include: {
        sectionTemplate: {
          select: this.sectionTemplateSummarySelect,
        },
      },
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

  // ─── Leads (facade → SiteLeadService) ────────────────────────────────────────

  async findLeads(userId: string, siteId: string, query: GetSiteLeadsQueryDto) {
    return this.siteLeadService.findLeads(userId, siteId, query);
  }

  private extractPublishedPagesFromSnapshot(snapshot: unknown) {
    if (!this.isPlainObject(snapshot)) {
      return [] as Array<Record<string, unknown>>;
    }

    const pagesRaw = Array.isArray(snapshot.pages) ? snapshot.pages : [];
    return pagesRaw.filter((page) => this.isPlainObject(page)) as Array<
      Record<string, unknown>
    >;
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

  private selectPageFromSnapshot(
    pages: Array<Record<string, unknown>>,
    pathOrSlug?: string,
    options?: {
      requirePublished?: boolean;
    },
  ) {
    const requirePublished = options?.requirePublished ?? true;

    if (pages.length === 0) {
      return null;
    }

    if (!pathOrSlug || !pathOrSlug.trim()) {
      return (
        pages.find(
          (page) =>
            page.isHomePage === true &&
            (!requirePublished || page.isPublished !== false),
        ) ??
        pages.find((page) =>
          requirePublished ? page.isPublished !== false : true,
        ) ??
        null
      );
    }

    const normalizedInput = pathOrSlug.trim();
    const normalizedPath = this.normalizePath(normalizedInput).toLowerCase();
    const normalizedSlug = normalizedInput
      .replace(/^\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    return (
      pages.find((page) => {
        const path =
          typeof page.path === "string" ? page.path.toLowerCase() : "";
        const slug =
          typeof page.slug === "string" ? page.slug.toLowerCase() : "";
        const isPublished = page.isPublished !== false;
        return (
          (!requirePublished || isPublished) &&
          (path === normalizedPath || slug === normalizedSlug)
        );
      }) ?? null
    );
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

  // ─── Publishing (facade → SitePublishingService) ──────────────────────────────

  async publishSite(userId: string, siteId: string) {
    return this.sitePublishingService.publishSite(userId, siteId);
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

  // ─── Preview Tokens (facade → PreviewTokenService) ───────────────────────────

  async createPreviewToken(
    userId: string,
    siteId: string,
    dto?: PreviewTokenPolicyDto,
  ) {
    return this.previewTokenService.createPreviewToken(userId, siteId, dto);
  }

  async findPreviewTokens(userId: string, siteId: string) {
    return this.previewTokenService.findPreviewTokens(userId, siteId);
  }

  async revokePreviewToken(
    userId: string,
    siteId: string,
    previewTokenId: string,
  ) {
    return this.previewTokenService.revokePreviewToken(
      userId,
      siteId,
      previewTokenId,
    );
  }

  async refreshPreviewToken(
    userId: string,
    siteId: string,
    previewTokenId: string,
    dto?: PreviewTokenPolicyDto,
  ) {
    return this.previewTokenService.refreshPreviewToken(
      userId,
      siteId,
      previewTokenId,
      dto,
    );
  }

  async getPreviewPageByToken(token: string, pathOrSlug?: string) {
    return this.previewTokenService.getPreviewPageByToken(token, pathOrSlug);
  }

  // ─── Public Site Render (facade → PublicSiteRenderService) ───────────────────

  async getPublicPageByDomainAndPath(domain: string, pathOrSlug: string) {
    return this.publicSiteRenderService.getPublicPageByDomainAndPath(
      domain,
      pathOrSlug,
    );
  }

  async getPublicPageBySlugAndPath(siteSlug: string, pageSlug?: string | null) {
    return this.publicSiteRenderService.getPublicPageBySlugAndPath(
      siteSlug,
      pageSlug,
    );
  }

  // submitPublicLead — also delegates to SiteLeadService (see Leads section above)
  async submitPublicLead(
    siteId: string,
    dto: SubmitPublicLeadDto,
    meta?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    },
  ) {
    return this.siteLeadService.submitPublicLead(siteId, dto, meta);
  }

  private validateSectionProps(type: string, props: Record<string, unknown>) {
    if (!this.isPlainObject(props)) {
      throw new BadRequestException("SECTION_PROPS_INVALID");
    }

    const nextProps: Record<string, unknown> = { ...props };

    switch (type) {
      case "HERO":
      case "CTA": {
        this.normalizeSectionStringProp(
          nextProps,
          "title",
          200,
          "SECTION_PROPS_INVALID_TITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "subtitle",
          1000,
          "SECTION_PROPS_INVALID_SUBTITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "buttonText",
          100,
          "SECTION_PROPS_INVALID_BUTTON_TEXT",
        );
        break;
      }

      case "IMAGE": {
        this.normalizeImageUrlProp(
          nextProps,
          "imageUrl",
          "SECTION_PROPS_INVALID_IMAGE_URL",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "altText",
          200,
          "SECTION_PROPS_INVALID_ALT_TEXT",
        );
        break;
      }

      case "FORM":
      case "CONTACT": {
        this.normalizeSectionStringProp(
          nextProps,
          "title",
          200,
          "SECTION_PROPS_INVALID_TITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "subtitle",
          1000,
          "SECTION_PROPS_INVALID_SUBTITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "buttonText",
          100,
          "SECTION_PROPS_INVALID_BUTTON_TEXT",
        );
        break;
      }

      case "NAVBAR": {
        this.normalizeSectionStringProp(
          nextProps,
          "brandName",
          120,
          "SECTION_PROPS_INVALID_BRAND_NAME",
        );
        this.normalizeNavbarLogoProp(
          nextProps,
          "logo",
          "SECTION_PROPS_INVALID_LOGO",
        );
        this.normalizeNavbarMenuItemsProp(
          nextProps,
          "menuItems",
          "SECTION_PROPS_INVALID_MENU_ITEMS",
        );
        this.normalizeNavbarCtaProp(
          nextProps,
          "cta",
          "SECTION_PROPS_INVALID_CTA",
        );
        break;
      }

      case "FOOTER": {
        this.normalizeImageUrlProp(
          nextProps,
          "logo",
          "SECTION_PROPS_INVALID_LOGO",
        );
        this.normalizeMenuItemsProp(
          nextProps,
          "menuItems",
          "SECTION_PROPS_INVALID_MENU_ITEMS",
        );
        this.normalizeCtaProp(nextProps, "cta", "SECTION_PROPS_INVALID_CTA");
        break;
      }

      case "SIDEBAR": {
        this.normalizeSectionStringProp(
          nextProps,
          "title",
          200,
          "SECTION_PROPS_INVALID_TITLE",
        );
        this.normalizeMenuItemsProp(
          nextProps,
          "links",
          "SECTION_PROPS_INVALID_LINKS",
        );
        this.normalizePromosProp(
          nextProps,
          "promos",
          "SECTION_PROPS_INVALID_PROMOS",
        );
        break;
      }

      case "BOOKING": {
        this.normalizeSectionStringProp(
          nextProps,
          "title",
          200,
          "SECTION_PROPS_INVALID_TITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "submitLabel",
          100,
          "SECTION_PROPS_INVALID_SUBMIT_LABEL",
        );
        this.normalizeEnumStringProp(
          nextProps,
          "calendarMode",
          "SECTION_PROPS_INVALID_CALENDAR_MODE",
          ["embedded", "external", "manual"],
        );
        this.normalizeBookingFieldsProp(
          nextProps,
          "fields",
          "SECTION_PROPS_INVALID_FIELDS",
        );
        break;
      }

      case "COMPARISON": {
        this.normalizePromosProp(
          nextProps,
          "plans",
          "SECTION_PROPS_INVALID_PLANS",
        );
        this.normalizePromosProp(
          nextProps,
          "items",
          "SECTION_PROPS_INVALID_ITEMS",
        );
        break;
      }

      case "NEWS_LIST":
      case "PRODUCT_GRID": {
        this.normalizeEnumStringProp(
          nextProps,
          "sourceMode",
          "SECTION_PROPS_INVALID_SOURCE_MODE",
          ["manual", "dynamic"],
        );
        this.normalizeIntegerProp(
          nextProps,
          "itemLimit",
          "SECTION_PROPS_INVALID_ITEM_LIMIT",
          1,
          100,
        );
        break;
      }

      case "RICH_TEXT":
      case "ABOUT":
      case "FEATURE":
      case "FAQ": {
        this.normalizeSectionStringProp(
          nextProps,
          "title",
          200,
          "SECTION_PROPS_INVALID_TITLE",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "body",
          5000,
          "SECTION_PROPS_INVALID_BODY",
        );
        this.normalizeSectionStringProp(
          nextProps,
          "description",
          5000,
          "SECTION_PROPS_INVALID_DESCRIPTION",
        );
        break;
      }

      default: {
        this.validateDefaultSectionPropsSchema(nextProps, 0, "PROPS");
        break;
      }
    }

    return nextProps as runtime.InputJsonValue;
  }
}
