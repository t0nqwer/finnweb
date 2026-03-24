import { ApiProperty } from "@nestjs/swagger";
import { AuthUserDto } from "./auth-user.dto";

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;
}
