import { IsIn, IsOptional } from "class-validator";

export const TEMPLATE_SCOPES = ["official", "my", "all"] as const;

export type TemplateScope = (typeof TEMPLATE_SCOPES)[number];

export class ListTemplatesQueryDto {
  @IsOptional()
  @IsIn(TEMPLATE_SCOPES)
  scope?: TemplateScope;
}
