import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller";
import { SitesService } from "./sites.service";
import { PublicSitesController } from "./public-sites.controller";
import { SitePublishingService } from "./site-publishing.service";
import { PublicSiteRenderService } from "./public-site-render.service";
import { SiteLeadService } from "./site-lead.service";
import { PreviewTokenService } from "./preview-token.service";
import { SiteContentAiService } from "./site-content-ai.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [SitesController, PublicSitesController],
  providers: [
    SitesService,
    SitePublishingService,
    PublicSiteRenderService,
    SiteLeadService,
    PreviewTokenService,
    SiteContentAiService,
  ],
  exports: [SitesService],
})
export class SitesModule {}
