import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApplyTemplateDto {
  @IsString()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  goal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lineId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;
}

export { ApplyTemplateDto as ApplySiteTemplateDto };
