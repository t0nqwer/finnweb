import { IsObject } from "class-validator";

export class UpdateSiteThemeDto {
  @IsObject()
  themeConfig!: Record<string, unknown>;
}
