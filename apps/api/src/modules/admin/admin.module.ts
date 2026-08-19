import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { AdminTemplatesController } from "./admin-templates.controller";
import { AdminTemplateValidationService } from "./admin-template-validation.service";
import { AdminTemplateAiService } from "./admin-template-ai.service";

@Module({
  imports: [AiModule],
  controllers: [AdminTemplatesController],
  providers: [
    PlatformAdminGuard,
    AdminTemplateValidationService,
    AdminTemplateAiService,
  ],
})
export class AdminModule {}
