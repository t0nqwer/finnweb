import { Module } from "@nestjs/common";
import { PlatformAdminGuard } from "@/common/guards/platform-admin.guard";
import { AdminTemplatesController } from "./admin-templates.controller";

@Module({
  controllers: [AdminTemplatesController],
  providers: [PlatformAdminGuard],
})
export class AdminModule {}
