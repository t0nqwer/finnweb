import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class SubmitPublicLeadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(32)
  @Matches(/^[0-9+()\-\s]{7,20}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  /**
   * Honeypot field for bot detection.
   * DTO accepts any string so the service can silently ignore bot submissions.
   */
  @IsOptional()
  @IsString()
  _hp?: string;
}
