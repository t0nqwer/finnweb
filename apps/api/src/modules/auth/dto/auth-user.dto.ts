import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiPropertyOptional()
  avatarUrl!: string | null;

  @ApiProperty({ enum: ["USER", "ADMIN"] })
  role!: "USER" | "ADMIN";

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
