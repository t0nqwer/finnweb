import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RefreshDto {
  @ApiProperty({
    type: String,
    example: "your-refresh-token",
    description: "Refresh token",
  })
  @IsString()
  refreshToken!: string;
}
