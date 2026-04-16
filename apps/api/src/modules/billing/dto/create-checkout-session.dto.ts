import { ApiProperty } from "@nestjs/swagger";
import { BillingInterval, PlanCode } from "../../../generated/prisma/client";
import { IsEnum, IsString } from "class-validator";

export class CreateCheckoutSessionDto {
  @ApiProperty()
  @IsString()
  workspaceId!: string;

  @ApiProperty({
    enum: [PlanCode.BASIC, PlanCode.BUSINESS, PlanCode.PRO],
  })
  @IsEnum(PlanCode)
  planCode!: PlanCode;

  @ApiProperty({
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval)
  billingInterval!: BillingInterval;
}
