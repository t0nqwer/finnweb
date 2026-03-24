import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
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
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
