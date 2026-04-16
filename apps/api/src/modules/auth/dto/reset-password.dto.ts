import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    example: "reset-token-from-email",
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: "newPassword123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
