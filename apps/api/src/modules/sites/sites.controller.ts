import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { CreatePageDto } from "./dto/create-page.dto";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdatePageDto } from "./dto/update-page.dto";
import { SitesService } from "./sites.service";

@UseGuards(AccessJwtGuard)
@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async create(@CurrentUser("sub") userId: string, @Body() dto: CreateSiteDto) {
    const data = await this.sitesService.create(userId, dto);

    return {
      success: true,
      data,
    };
  }

  @Get()
  async findAll(@CurrentUser("sub") userId: string) {
    const data = await this.sitesService.findAll(userId);

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/pages")
  async createPage(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Body() dto: CreatePageDto,
  ) {
    const data = await this.sitesService.createPage(userId, siteId, dto);

    return {
      success: true,
      data,
    };
  }

  @Get(":siteId/pages")
  async findPages(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
  ) {
    const data = await this.sitesService.findPages(userId, siteId);

    return {
      success: true,
      data,
    };
  }

  @Get(":siteId/pages/:pageId")
  async findPage(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
  ) {
    const data = await this.sitesService.findPage(userId, siteId, pageId);

    return {
      success: true,
      data,
    };
  }

  @Patch(":siteId/pages/:pageId")
  async updatePage(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    const data = await this.sitesService.updatePage(
      userId,
      siteId,
      pageId,
      dto,
    );

    return {
      success: true,
      data,
    };
  }

  @Delete(":siteId/pages/:pageId")
  async removePage(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
  ) {
    const data = await this.sitesService.removePage(userId, siteId, pageId);

    return {
      success: true,
      data,
    };
  }
}
