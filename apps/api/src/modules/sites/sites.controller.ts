import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
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
import { SwitchSectionTemplateDto } from "./dto/switch-section-template.dto";
import { PreviewTokenPolicyDto } from "./dto/preview-token.dto";
import { ApplyTemplateDto } from "./dto/apply-site-template.dto";

@UseGuards(AccessJwtGuard)
@Controller("sites")
export class SitesController {
  private readonly sitesService: SitesService;

  constructor(@Inject(SitesService) sitesService: SitesService) {
    this.sitesService = sitesService;
  }

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

  @Post(":siteId/delete")
  async removeSiteViaPost(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
  ) {
    const data = await this.sitesService.removeSite(userId, siteId);

    return {
      success: true,
      data,
    };
  }

  @Delete(":siteId")
  async removeSite(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
  ) {
    const data = await this.sitesService.removeSite(userId, siteId);

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/publish")
  async publishSite(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
  ) {
    const data = await this.sitesService.publishSite(userId, siteId);

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/apply-template")
  async applyTemplate(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    const data = await this.sitesService.applyTemplate(userId, siteId, dto);

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/preview-token")
  async createPreviewToken(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Body() dto: PreviewTokenPolicyDto,
  ) {
    const data = await this.sitesService.createPreviewToken(
      userId,
      siteId,
      dto,
    );

    return {
      success: true,
      data,
    };
  }

  @Get(":siteId/preview-tokens")
  async findPreviewTokens(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
  ) {
    const data = await this.sitesService.findPreviewTokens(userId, siteId);

    return {
      success: true,
      data,
    };
  }

  @Delete(":siteId/preview-tokens/:previewTokenId")
  async revokePreviewToken(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("previewTokenId") previewTokenId: string,
  ) {
    const data = await this.sitesService.revokePreviewToken(
      userId,
      siteId,
      previewTokenId,
    );

    return {
      success: true,
      data,
    };
  }

  @Post(":siteId/preview-tokens/:previewTokenId/refresh")
  async refreshPreviewToken(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("previewTokenId") previewTokenId: string,
    @Body() dto: PreviewTokenPolicyDto,
  ) {
    const data = await this.sitesService.refreshPreviewToken(
      userId,
      siteId,
      previewTokenId,
      dto,
    );

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

  @Patch(":siteId/pages/:pageId/sections/:sectionId/template")
  async switchSectionTemplate(
    @CurrentUser("sub") userId: string,
    @Param("siteId") siteId: string,
    @Param("pageId") pageId: string,
    @Param("sectionId") sectionId: string,
    @Body() dto: SwitchSectionTemplateDto,
  ) {
    const data = await this.sitesService.switchSectionTemplate(
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
