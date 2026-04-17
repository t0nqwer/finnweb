import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { CreatePageDto } from "./dto/create-page.dto";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdatePageDto } from "./dto/update-page.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { ReorderSectionsDto } from "./dto/reorder-sections.dto";
import { GetSiteLeadsQueryDto } from "./dto/get-site-leads-query.dto";
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

  // Section Endpoints

  @Post(":siteId/pages/:pageId/sections")
  async createSection(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Body() dto: CreateSectionDto,
  ) {
    const data = await this.sitesService.createSection(
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

  @Post(":siteId/pages/:pageId/sections/reorder")
  async reorderSections(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Body() dto: ReorderSectionsDto,
  ) {
    const data = await this.sitesService.reorderSections(
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

  @Get(":siteId/pages/:pageId/sections")
  async findSections(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
  ) {
    const data = await this.sitesService.findSections(userId, siteId, pageId);

    return {
      success: true,
      data,
    };
  }

  @Get(":siteId/pages/:pageId/sections/:sectionId")
  async findSection(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Param("sectionId") sectionId: string,
  ) {
    const data = await this.sitesService.findSection(
      userId,
      siteId,
      pageId,
      sectionId,
    );

    return {
      success: true,
      data,
    };
  }

  @Patch(":siteId/pages/:pageId/sections/:sectionId")
  async updateSection(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    const data = await this.sitesService.updateSection(
      userId,
      siteId,
      pageId,
      sectionId,
      dto,
    );

    return {
      success: true,
      data,
    };
  }

  @Delete(":siteId/pages/:pageId/sections/:sectionId")
  async deleteSection(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Param("sectionId") sectionId: string,
  ) {
    const data = await this.sitesService.deleteSection(
      userId,
      siteId,
      pageId,
      sectionId,
    );

    return {
      success: true,
      data,
    };
  }

  @Get(":siteId/leads")
  async findLeads(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Query() query: GetSiteLeadsQueryDto,
  ) {
    const data = await this.sitesService.findLeads(userId, siteId, query);

    return {
      success: true,
      data,
    };
  }
}
