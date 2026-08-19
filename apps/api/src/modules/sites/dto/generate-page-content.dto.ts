import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class GeneratePageContentDto {
  /** Defaults to the site's own name when the caller does not supply one. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  tone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  highlights?: string[];
}
