import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CreateSiteDto } from "./dto/create-site.dto";

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  private makeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  async create(dto: CreateSiteDto) {
    const slug = dto.slug || this.makeSlug(dto.name);

    return slug;
  }

  async findAll() {
    return this.prisma.site.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
