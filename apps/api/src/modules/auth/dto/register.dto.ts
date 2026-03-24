import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({
    type: String,
    example: "test@example.com",
    description: "User email address",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    example: "12345678",
    description: "User password",
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional({
    type: String,
    example: "Jirapat",
    description: "Display name",
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
