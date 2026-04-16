import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CancelSubscriptionDto {
  @ApiProperty()
  @IsString()
  workspaceId!: string;
}
