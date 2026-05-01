import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { ListSectionTemplatesQueryDto } from "./dto/list-section-templates-query.dto";
import { SectionTemplatesService } from "./section-templates.service";

@UseGuards(AccessJwtGuard)
@Controller("section-templates")
export class SectionTemplatesController {
  constructor(
    @Inject(SectionTemplatesService)
    private readonly sectionTemplatesService: SectionTemplatesService,
  ) {}

  @Get()
  async list(
    @CurrentUser("sub") userId: string,
    @Query() query: ListSectionTemplatesQueryDto,
  ) {
    return this.sectionTemplatesService.list(userId, query);
  }

  @Get(":id")
  async findOne(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.sectionTemplatesService.findOne(userId, id);
  }
}

