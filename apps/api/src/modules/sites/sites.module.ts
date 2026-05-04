import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller";
import { SitesService } from "./sites.service";
import { PublicSitesController } from "./public-sites.controller";
import { SitePublishingService } from "./site-publishing.service";
import { PublicSiteRenderService } from "./public-site-render.service";
import { SiteLeadService } from "./site-lead.service";
import { PreviewTokenService } from "./preview-token.service";

@Module({
  controllers: [SitesController, PublicSitesController],
  providers: [
    SitesService,
    SitePublishingService,
    PublicSiteRenderService,
    SiteLeadService,
    PreviewTokenService,
  ],
  exports: [SitesService],
})
export class SitesModule {}
