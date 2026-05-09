import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { AdminTemplatesController } from "./admin-templates.controller";
import { AdminTemplateValidationService } from "./admin-template-validation.service";

@Module({
  controllers: [AdminTemplatesController],
  providers: [PlatformAdminGuard, AdminTemplateValidationService],
})
export class AdminModule {}
