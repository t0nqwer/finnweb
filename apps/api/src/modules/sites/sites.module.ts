import { Module } from "@nestjs/common";
import { SitesController } from "./sites.controller";
import { SitesService } from "./sites.service";
import { PublicSitesController } from "./public-sites.controller";

@Module({
  controllers: [SitesController, PublicSitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
