import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BillingRepository } from "./billing.repository";
import { StripeService } from "./stripe.service";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingWebhookService } from "./billing-webhook.service";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [
    BillingService,
    BillingRepository,
    StripeService,
    BillingWebhookService,
    PrismaService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
