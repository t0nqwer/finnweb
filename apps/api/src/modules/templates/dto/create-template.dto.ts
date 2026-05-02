import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PAGE_TYPES, type PageTypeValue } from "../../sites/dto/create-page.dto";
import {
  SECTION_TYPES,
  type SectionTypeValue,
} from "../../sites/dto/create-section.dto";

export class TemplateSectionInputDto {
  @IsIn(SECTION_TYPES)
  type!: SectionTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

export class TemplatePageInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsIn(PAGE_TYPES)
  pageType?: PageTypeValue;

  @IsOptional()
  @IsBoolean()
  isHomePage?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogImageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSectionInputDto)
  sections!: TemplateSectionInputDto[];
}

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  businessTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  styles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  keywords?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplatePageInputDto)
  pages!: TemplatePageInputDto[];
}
