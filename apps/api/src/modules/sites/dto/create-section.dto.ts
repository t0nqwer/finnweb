import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsObject,
  ValidateIf,
} from "class-validator";

export const SECTION_TYPES = [
  "NAVBAR",
  "SIDEBAR",
  "HEADER",
  "HERO",
  "FEATURE",
  "ABOUT",
  "GALLERY",
  "TESTIMONIAL",
  "PRICING",
  "FAQ",
  "CONTACT",
  "CTA",
  "RICH_TEXT",
  "IMAGE",
  "VIDEO",
  "FORM",
  "BOOKING",
  "COMPARISON",
  "CONTENT",
  "FOOTER",
  "PRODUCT_GRID",
  "BLOG_LIST",
  "NEWS_LIST",
  "CUSTOM",
] as const;

export type SectionTypeValue = (typeof SECTION_TYPES)[number];

export class CreateSectionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sectionTemplateId?: string;

  @ValidateIf((value: CreateSectionDto) => !value.sectionTemplateId)
  @IsIn(SECTION_TYPES)
  type?: SectionTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}
