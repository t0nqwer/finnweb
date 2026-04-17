import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AccessJwtGuard } from "@/common/guards/access-jwt.guard";
import { BillingService } from "./billing.service";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { CancelSubscriptionDto } from "./dto/cancel-subscription.dto";

@UseGuards(AccessJwtGuard)
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("subscription")
  async getCurrentSubscription(
    @Query("workspaceId") workspaceId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.billingService.getCurrentSubscription(workspaceId, userId);
  }

  @Get("plan-usage")
  async getPlanUsage(
    @Query("workspaceId") workspaceId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.billingService.getPlanUsage(workspaceId, userId);
  }

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

  @Post("reactivate")
  async reactivateSubscription(
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.billingService.reactivateSubscription(dto.workspaceId, userId);
  }
}
