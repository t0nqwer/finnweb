import { Module } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { LINE_OA_PROVIDER } from "./line-oa-message.types";
import { LineOaHttpProvider } from "./line-oa-http.provider";
import { LineOaNotificationService } from "./line-oa-notification.service";

@Module({
  providers: [
    PrismaService,
    LineOaNotificationService,
    {
      provide: LINE_OA_PROVIDER,
      useClass: LineOaHttpProvider,
    },
  ],
  exports: [LineOaNotificationService, LINE_OA_PROVIDER],
})
export class LineOaNotificationModule {}
