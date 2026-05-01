import {
  Body,
  Controller,
  Get,
  Ip,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Query,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { SubmitPublicLeadDto } from "./dto/submit-public-lead.dto";
import { SitesService } from "./sites.service";

@Controller("public/sites")
export class PublicSitesController {
  constructor(
    @Inject(SitesService) private readonly sitesService: SitesService,
  ) {}

  @Get("page")
  async getPublicPage(
    @Query("domain") domain: string,
    @Query("path") pathOrSlug: string,
  ) {
    if (!domain || !pathOrSlug) {
      throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
    }

    const data = await this.sitesService.getPublicPageByDomainAndPath(
      domain,
      pathOrSlug,
    );

    return {
      success: true,
      data,
    };
  }

  @Get("preview/:token")
  async getPreviewPageByToken(
    @Param("token") token: string,
    @Query("path") pathOrSlug?: string,
  ) {
    if (!token) {
      throw new NotFoundException("PREVIEW_TOKEN_INVALID");
    }

    const data = await this.sitesService.getPreviewPageByToken(
      token,
      pathOrSlug,
    );

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/forms/submit")
  async submitPublicLead(
    @Param("siteId") siteId: string,
    @Body() dto: SubmitPublicLeadDto,
    @Req() req: FastifyRequest,
    @Ip() ip?: string,
  ) {
    if (!siteId) {
      throw new NotFoundException("PUBLIC_SITE_NOT_FOUND");
    }

    const userAgent =
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : undefined;

    const refererHeader = req.headers.referer ?? req.headers.referrer;
    const referrer =
      typeof refererHeader === "string" ? refererHeader : undefined;

    const data = await this.sitesService.submitPublicLead(siteId, dto, {
      ipAddress: ip,
      userAgent,
      referrer,
    });

    return {
      success: true,
      data,
    };
  }
}
