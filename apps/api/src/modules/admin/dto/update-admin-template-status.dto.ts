import { IsIn } from "class-validator";

export const ADMIN_TEMPLATE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type AdminTemplateStatus = (typeof ADMIN_TEMPLATE_STATUSES)[number];

export class UpdateAdminTemplateStatusDto {
  @IsIn(ADMIN_TEMPLATE_STATUSES)
  status!: AdminTemplateStatus;
}
