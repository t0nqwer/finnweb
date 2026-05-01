import { Type } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export const PREVIEW_TOKEN_EXPIRY_DAYS = [1, 3, 7, 14] as const;

export class PreviewTokenPolicyDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(PREVIEW_TOKEN_EXPIRY_DAYS)
  expiresInDays?: (typeof PREVIEW_TOKEN_EXPIRY_DAYS)[number];
}
