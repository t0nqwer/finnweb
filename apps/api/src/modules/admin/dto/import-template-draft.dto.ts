import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CapturedWebsiteLinkDto {
  @IsString()
  @MaxLength(160)
  label!: string;

  @IsString()
  @MaxLength(1000)
  href!: string;
}

export class CapturedWebsiteImageDto {
  @IsString()
  @MaxLength(1000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}

export class CapturedWebsiteFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  action?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  fields?: string[];
}

export class CapturedWebsiteStatDto {
  @IsString()
  @MaxLength(40)
  value!: string;

  @IsString()
  @MaxLength(120)
  label!: string;
}

export class CapturedWebsiteCardDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrow?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  meta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  price?: string;
}

export class CapturedWebsiteFaqDto {
  @IsString()
  @MaxLength(180)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  answer?: string;
}

export class CapturedWebsitePageDto {
  @IsString()
  @MaxLength(1000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(180, { each: true })
  headings?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(600, { each: true })
  textBlocks?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteStatDto)
  stats?: CapturedWebsiteStatDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteCardDto)
  cards?: CapturedWebsiteCardDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  logos?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteFaqDto)
  faqs?: CapturedWebsiteFaqDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteLinkDto)
  links?: CapturedWebsiteLinkDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteImageDto)
  images?: CapturedWebsiteImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsiteFormDto)
  forms?: CapturedWebsiteFormDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  colorSamples?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  fontFamilies?: string[];
}

export class ImportTemplateDraftDto {
  @IsString()
  @MaxLength(1000)
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  styleKeywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  customCss?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedWebsitePageDto)
  pages!: CapturedWebsitePageDto[];
}
