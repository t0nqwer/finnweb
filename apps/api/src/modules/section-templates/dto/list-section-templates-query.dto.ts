import { IsIn, IsOptional, IsString } from "class-validator";
import { SECTION_TYPES } from "../../sites/dto/create-section.dto";

export const SECTION_TEMPLATE_SCOPES = ["official", "my", "all"] as const;
export type SectionTemplateScope = (typeof SECTION_TEMPLATE_SCOPES)[number];

export class ListSectionTemplatesQueryDto {
  @IsOptional()
  @IsIn(SECTION_TEMPLATE_SCOPES)
  scope?: SectionTemplateScope;

  @IsOptional()
  @IsString()
  @IsIn(SECTION_TYPES)
  type?: (typeof SECTION_TYPES)[number];
}

