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
import AdmZip from "adm-zip";
import {
  createTemplateDraftFromWebsiteProfile,
  createWebsiteProfileFromCapture,
} from "@finnweb/shared/templates";
import { Prisma } from "@/generated/prisma/client";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { PrismaService } from "@/prisma/prisma.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { CreateTemplateDto } from "../templates/dto/create-template.dto";
import { AdminTemplateValidationService } from "./admin-template-validation.service";
import { ImportTemplateDraftDto } from "./dto/import-template-draft.dto";
import { ImportTemplateFromZipDto } from "./dto/import-template-zip.dto";
import { ImportTemplateFromUrlDto } from "./dto/import-template-url.dto";
import { UpdateAdminTemplateStatusDto } from "./dto/update-admin-template-status.dto";
import { AdminTemplateAiService } from "./admin-template-ai.service";

@UseGuards(AccessJwtGuard, PlatformAdminGuard)
@Controller("admin/templates")
export class AdminTemplatesController {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AdminTemplateValidationService)
    private readonly validator: AdminTemplateValidationService,
    @Inject(AdminTemplateAiService)
    private readonly templateAi: AdminTemplateAiService,
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
            seoTitle: page.seoTitle,
            seoDescription: page.seoDescription,
            seoKeywords: page.seoKeywords,
            ogImageUrl: page.ogImageUrl,
            sections: page.sections.map((section) => ({
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

  @Post("import-draft")
  async importDraft(@Body() dto: ImportTemplateDraftDto) {
    const profile = createWebsiteProfileFromCapture(dto);
    const draftResult = createTemplateDraftFromWebsiteProfile(profile);
    const enhanced = await this.templateAi.enhanceTemplateDraft(
      dto,
      draftResult.template as Record<string, unknown>,
    );
    const validation = this.validator.validateTemplate(enhanced.template as any);

    return {
      success: true,
      data: {
        template: enhanced.template,
        validation,
        confidence: draftResult.confidence,
        warnings: draftResult.warnings,
        source: draftResult.source,
        aiEnhanced: enhanced.usedAi,
      },
    };
  }

  @Post("import-from-url")
  async importFromUrl(@Body() dto: ImportTemplateFromUrlDto) {
    const sourceUrl = this.normalizeUrl(dto.url);
    const pages = await this.captureFromUrl(sourceUrl);

    if (pages.length === 0) {
      throw new BadRequestException("IMPORT_URL_CAPTURE_EMPTY");
    }

    const capture: ImportTemplateDraftDto = {
      sourceUrl,
      name: dto.name,
      language: dto.language,
      industry: dto.industry,
      pages,
    };
    const profile = createWebsiteProfileFromCapture(capture);
    const draftResult = createTemplateDraftFromWebsiteProfile(profile);
    const enhanced = await this.templateAi.enhanceTemplateDraft(
      capture,
      draftResult.template as Record<string, unknown>,
    );
    const validation = this.validator.validateTemplate(enhanced.template as any);

    return {
      success: true,
      data: {
        template: enhanced.template,
        validation,
        confidence: draftResult.confidence,
        warnings: draftResult.warnings,
        source: draftResult.source,
        aiEnhanced: enhanced.usedAi,
      },
    };
  }

  @Post("import-from-zip")
  async importFromZip(@Body() dto: ImportTemplateFromZipDto) {
    const pages = this.captureFromZipBase64(dto.zipBase64);

    if (pages.length === 0) {
      throw new BadRequestException("IMPORT_ZIP_CAPTURE_EMPTY");
    }

    const sourceUrl = `zip://${dto.fileName}`;
    const capture: ImportTemplateDraftDto = {
      sourceUrl,
      name: dto.name || dto.fileName.replace(/\.zip$/i, ""),
      language: dto.language,
      industry: dto.industry,
      pages,
    };
    const profile = createWebsiteProfileFromCapture(capture);
    const draftResult = createTemplateDraftFromWebsiteProfile(profile);
    const enhanced = await this.templateAi.enhanceTemplateDraft(
      capture,
      draftResult.template as Record<string, unknown>,
    );
    const validation = this.validator.validateTemplate(enhanced.template as any);

    return {
      success: true,
      data: {
        template: enhanced.template,
        validation,
        confidence: draftResult.confidence,
        warnings: draftResult.warnings,
        source: draftResult.source,
        aiEnhanced: enhanced.usedAi,
      },
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

  @Patch(":id")
  async updateOfficial(@Param("id") id: string, @Body() dto: CreateTemplateDto) {
    const validation = this.validator.validateTemplate(dto);

    if (!validation.valid) {
      throw new BadRequestException({
        code: "ADMIN_TEMPLATE_VALIDATION_FAILED",
        validation,
      });
    }

    const existing = await this.prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!existing) {
      throw new BadRequestException("TEMPLATE_NOT_FOUND");
    }

    const slug = dto.slug
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const template = await tx.template.update({
        where: { id },
        data: {
          code: dto.code?.trim() || undefined,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          thumbnailUrl: dto.thumbnailUrl?.trim() || null,
          categoryId: category?.id ?? null,
          visibility: "OFFICIAL",
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
        id: updated.id,
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

  private normalizeUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException("IMPORT_URL_REQUIRED");
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(normalized);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new BadRequestException("IMPORT_URL_PROTOCOL_INVALID");
      }
      return url.toString();
    } catch {
      throw new BadRequestException("IMPORT_URL_INVALID");
    }
  }

  private async captureFromUrl(sourceUrl: string) {
    const rootUrl = new URL(sourceUrl);
    const firstHtml = await this.fetchHtml(sourceUrl);
    const discovered = this.extractLinks(firstHtml, rootUrl).slice(0, 2);
    const targets = [sourceUrl, ...discovered];
    const pages: Array<{
      url: string;
      path: string;
      title?: string;
      metaDescription?: string;
      headings?: string[];
      textBlocks?: string[];
      links?: Array<{ label: string; href: string }>;
      images?: Array<{
        url: string;
        alt?: string;
        width?: number;
        height?: number;
      }>;
      forms?: Array<{
        id?: string;
        title?: string;
        action?: string;
        fields?: string[];
      }>;
      colorSamples?: string[];
      fontFamilies?: string[];
    }> = [];

    for (const target of targets) {
      try {
        const html = target === sourceUrl ? firstHtml : await this.fetchHtml(target);
        const parsed = this.parseHtmlCapture(html, target);
        pages.push(parsed);
      } catch {
        // best-effort crawl; keep going with successful pages
      }
    }

    return pages;
  }

  private async fetchHtml(url: string) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FinnWeb Template Importer/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new BadRequestException("IMPORT_URL_FETCH_FAILED");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new BadRequestException("IMPORT_URL_NOT_HTML");
    }

    return response.text();
  }

  private parseHtmlCapture(html: string, url: string) {
    const path = (() => {
      try {
        return new URL(url).pathname || "/";
      } catch {
        return "/";
      }
    })();
    const title = this.firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = this.firstMatch(
      html,
      /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
    );
    const headings = this.extractMatches(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, 8);
    const links = this.extractAnchorLinks(html, url);
    const images = this.extractImages(html, url);
    const forms = this.extractForms(html, url);
    const textBlocks = this.extractTextBlocks(html, 10);
    const colorSamples = Array.from(
      new Set(this.extractMatches(html, /#(?:[0-9a-fA-F]{3}){1,2}\b/g, 12)),
    );
    const fontFamilies = Array.from(
      new Set(
        this.extractMatches(
          html,
          /font-family\s*:\s*([^;}{]+)/gi,
          6,
          (value) =>
            value
              .split(",")
              .map((item) => item.replace(/["']/g, "").trim())
              .filter(Boolean)[0] ?? "",
        ).filter(Boolean),
      ),
    );

    return {
      url,
      path,
      title,
      metaDescription,
      headings,
      textBlocks,
      links,
      images,
      forms,
      colorSamples,
      fontFamilies,
    };
  }

  private extractLinks(html: string, base: URL) {
    const hrefs = this.extractMatches(
      html,
      /<a[^>]+href=["']([^"']+)["'][^>]*>/gi,
      30,
    )
      .map((href) => {
        try {
          return new URL(href, base).toString();
        } catch {
          return null;
        }
      })
      .filter((value): value is string => Boolean(value))
      .filter((value) => value.startsWith(`${base.protocol}//${base.host}`))
      .filter((value) => !/[#?](.*)$/.test(value) || value.includes(base.pathname));

    return Array.from(new Set(hrefs));
  }

  private captureFromZipBase64(base64: string) {
    let zip: any;
    try {
      const buffer = Buffer.from(base64, "base64");
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException("IMPORT_ZIP_INVALID");
    }

    const entries = zip
      .getEntries()
      .filter((entry: any) => !entry.isDirectory)
      .filter((entry: any) => /\.html?$/i.test(entry.entryName))
      .slice(0, 8);

    const pages: Array<{
      url: string;
      path: string;
      title?: string;
      metaDescription?: string;
      headings?: string[];
      textBlocks?: string[];
      links?: Array<{ label: string; href: string }>;
      images?: Array<{ url: string; alt?: string; width?: number; height?: number }>;
      forms?: Array<{ id?: string; title?: string; action?: string; fields?: string[] }>;
      colorSamples?: string[];
      fontFamilies?: string[];
    }> = [];

    for (const entry of entries) {
      const html = zip.readAsText(entry, "utf8");
      const path = entry.entryName.replace(/\\/g, "/");
      pages.push(this.parseHtmlCapture(html, `https://zip.local/${path}`));
    }

    if (pages.length === 0) {
      return pages;
    }

    const assetEntries = zip
      .getEntries()
      .filter((entry: any) => !entry.isDirectory)
      .filter((entry: any) =>
        /\.(gif|jpe?g|png|svg|webp|avif|mp4|webm|json|lottie|css|js)$/i.test(
          entry.entryName,
        ),
      )
      .slice(0, 60);

    const pageZero = pages[0]!;
    const assetLinks = assetEntries.map((entry: any) => {
      const name = entry.entryName.split("/").pop() || entry.entryName;
      return { label: name, href: `zip://${entry.entryName.replace(/\\/g, "/")}` };
    });
    pageZero.links = [...(pageZero.links ?? []), ...assetLinks].slice(0, 40);

    return pages;
  }

  private extractAnchorLinks(html: string, sourceUrl: string) {
    const links: Array<{ label: string; href: string }> = [];
    const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) && links.length < 20) {
      const hrefRaw = (match[1] ?? "").trim();
      const label = this.cleanText(match[2] ?? "");
      if (!hrefRaw || !label) {
        continue;
      }

      try {
        const href = new URL(hrefRaw, sourceUrl).toString();
        links.push({ label: label.slice(0, 160), href: href.slice(0, 1000) });
      } catch {
        continue;
      }
    }
    return links;
  }

  private extractImages(html: string, sourceUrl: string) {
    const images: Array<{ url: string; alt?: string; width?: number; height?: number }> = [];
    const regex = /<img[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) && images.length < 20) {
      const tag = match[0] ?? "";
      const src = this.firstMatch(tag, /\ssrc=["']([^"']+)["']/i);
      if (!src) {
        continue;
      }

      try {
        const url = new URL(src, sourceUrl).toString();
        const alt = this.firstMatch(tag, /\salt=["']([^"']*)["']/i);
        const width = Number(this.firstMatch(tag, /\swidth=["'](\d+)["']/i) ?? "");
        const height = Number(this.firstMatch(tag, /\sheight=["'](\d+)["']/i) ?? "");
        images.push({
          url: url.slice(0, 1000),
          alt: alt?.slice(0, 200),
          width: Number.isFinite(width) && width > 0 ? width : undefined,
          height: Number.isFinite(height) && height > 0 ? height : undefined,
        });
      } catch {
        continue;
      }
    }
    return images;
  }

  private extractForms(html: string, sourceUrl: string) {
    const forms: Array<{ id?: string; title?: string; action?: string; fields?: string[] }> = [];
    const regex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) && forms.length < 6) {
      const full = match[0] ?? "";
      const inner = match[1] ?? "";
      const id = this.firstMatch(full, /\sid=["']([^"']+)["']/i);
      const actionRaw = this.firstMatch(full, /\saction=["']([^"']+)["']/i);
      const action = (() => {
        if (!actionRaw) {
          return undefined;
        }
        try {
          return new URL(actionRaw, sourceUrl).toString();
        } catch {
          return undefined;
        }
      })();
      const fields = Array.from(
        new Set(
          this.extractMatches(
            inner,
            /<(?:input|textarea|select)[^>]+name=["']([^"']+)["'][^>]*>/gi,
            12,
          ),
        ),
      );
      forms.push({
        id: id?.slice(0, 120),
        title: id ? `Form ${id}` : "Contact form",
        action: action?.slice(0, 1000),
        fields: fields.map((field) => field.slice(0, 80)),
      });
    }
    return forms;
  }

  private extractTextBlocks(html: string, limit: number) {
    const candidates = this.extractMatches(
      html,
      /<(?:p|li|span|div)[^>]*>([\s\S]*?)<\/(?:p|li|span|div)>/gi,
      200,
    )
      .map((item) => this.cleanText(item))
      .filter((item) => item.length >= 24 && item.length <= 240);
    return Array.from(new Set(candidates)).slice(0, limit);
  }

  private firstMatch(value: string, pattern: RegExp) {
    const match = value.match(pattern);
    return match?.[1] ? this.cleanText(match[1]) : undefined;
  }

  private extractMatches(
    value: string,
    pattern: RegExp,
    limit: number,
    transform?: (input: string) => string,
  ) {
    const items: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) && items.length < limit) {
      const raw = (match[1] ?? match[0] ?? "").trim();
      const next = transform ? transform(raw) : this.cleanText(raw);
      if (next) {
        items.push(next);
      }
    }
    return items;
  }

  private cleanText(value: string) {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
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
