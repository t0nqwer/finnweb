import {
  Body,
  Controller,
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
import { TemplatesService } from "./templates.service";
import { ListTemplatesQueryDto } from "./dto/list-templates-query.dto";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";
import { ApplyTemplateDto } from "./dto/apply-template.dto";

@UseGuards(AccessJwtGuard)
@Controller("templates")
export class TemplatesController {
  constructor(
    @Inject(TemplatesService)
    private readonly templatesService: TemplatesService,
  ) {}

  @Get()
  async list(
    @CurrentUser("sub") userId: string,
    @Query() query: ListTemplatesQueryDto,
  ) {
    return this.templatesService.list(userId, query);
  }

  @Get(":id")
  async findOne(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.templatesService.findOne(userId, id);
  }

  @Post()
  async create(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.templatesService.create(userId, dto);
  }

  @Patch(":id")
  async update(
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(userId, id, dto);
  }

  @Post(":id/apply")
  async apply(
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    return this.templatesService.apply(userId, id, dto);
  }
}
