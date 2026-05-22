import { Module } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { LineOaNotificationModule } from "../line-oa-notification/line-oa-notification.module";
import { LineOaWebhookController } from "./line-oa-webhook.controller";
import { LineOaWebhookService } from "./line-oa-webhook.service";

@Module({
  imports: [LineOaNotificationModule],
  controllers: [LineOaWebhookController],
  providers: [PrismaService, LineOaWebhookService],
})
export class LineOaModule {}
