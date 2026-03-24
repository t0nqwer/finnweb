import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateSiteDto } from "./dto/create-site.dto";
import { SitesService } from "./sites.service";

@Controller("sites")
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  async create(@Body() dto: CreateSiteDto) {
    const data = await this.sitesService.create(dto);

    return {
      success: true,
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.sitesService.findAll();

    return {
      success: true,
      data,
    };
  }
}
