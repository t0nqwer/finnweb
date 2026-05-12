import { IsOptional, IsString, MaxLength } from "class-validator";

export class ImportTemplateFromZipDto {
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @MaxLength(20_000_000)
  zipBase64!: string;

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
