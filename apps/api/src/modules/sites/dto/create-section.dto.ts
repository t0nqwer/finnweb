import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export const SECTION_TYPES = [
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
  "PRODUCT_GRID",
  "BLOG_LIST",
  "NEWS_LIST",
  "CUSTOM",
] as const;

export type SectionTypeValue = (typeof SECTION_TYPES)[number];

export class CreateSectionDto {
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
  @IsObject()
  props?: Record<string, unknown>;
}
