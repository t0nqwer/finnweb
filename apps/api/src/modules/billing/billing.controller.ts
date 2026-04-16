import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { BillingService } from "./billing.service";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { CancelSubscriptionDto } from "./dto/cancel-subscription.dto";

@UseGuards(AccessJwtGuard)
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout-session")
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.billingService.createCheckoutSession(dto, userId);
  }

  @Post("cancel")
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.billingService.cancelAtPeriodEnd(dto.workspaceId, userId);
  }
}
