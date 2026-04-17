import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { SitesService } from "./sites.service";

@Controller("public/sites")
export class PublicSitesController {
  constructor(private readonly sitesService: SitesService) {}

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
}
