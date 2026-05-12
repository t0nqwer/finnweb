import { IsOptional, IsString, MaxLength } from "class-validator";

export class ImportTemplateFromUrlDto {
  @IsString()
  @MaxLength(1000)
  url!: string;

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
}
