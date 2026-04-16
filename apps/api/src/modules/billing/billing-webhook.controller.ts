import { Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { StripeService } from "./stripe.service";
import { BillingWebhookService } from "./billing-webhook.service";

@Controller("billing/webhooks")
export class BillingWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingWebhookService: BillingWebhookService,
  ) {}

  @Post("stripe")
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("stripe-signature") signature: string,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new Error("RAW_BODY_MISSING");
    }

    const event = this.stripeService.client.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );

    await this.billingWebhookService.handleEvent(event);

    return {
      received: true,
    };
  }
}
