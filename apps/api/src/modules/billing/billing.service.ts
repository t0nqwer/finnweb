import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { BillingInterval, PlanCode } from "../../generated/prisma/client";
import { BillingRepository } from "./billing.repository";
import { StripeService } from "./stripe.service";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly stripeService: StripeService,
  ) {}

  private getStripePriceIdFromPlan(
    plan: {
      stripePriceMonthlyId?: string | null;
      stripePriceYearlyId?: string | null;
    },
    billingInterval: BillingInterval,
  ) {
    if (billingInterval === BillingInterval.MONTHLY) {
      return plan.stripePriceMonthlyId ?? null;
    }

    if (billingInterval === BillingInterval.YEARLY) {
      return plan.stripePriceYearlyId ?? null;
    }

    return null;
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto, userId: string) {
    if (dto.planCode === PlanCode.FREE) {
      throw new BadRequestException("FREE_PLAN_CANNOT_USE_CHECKOUT");
    }

    const workspace = await this.billingRepository.findWorkspaceForUser(
      dto.workspaceId,
      userId,
    );

    if (!workspace) {
      throw new ForbiddenException("WORKSPACE_ACCESS_DENIED");
    }

    const plan = await this.billingRepository.findPlanByCode(dto.planCode);

    if (!plan || !plan.isActive) {
      throw new BadRequestException("PLAN_NOT_FOUND");
    }

    const currentSubscription =
      await this.billingRepository.findCurrentSubscription(dto.workspaceId);

    const hasPaidHistory = await this.billingRepository.hasPaidHistory(
      dto.workspaceId,
    );

    const shouldApplyTrial = !hasPaidHistory && plan.trialDays > 0;

    let stripeCustomerId = currentSubscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await this.stripeService.client.customers.create({
        metadata: {
          workspaceId: workspace.id,
        },
      });

      stripeCustomerId = customer.id;
    }

    const stripePriceId = this.getStripePriceIdFromPlan(
      plan,
      dto.billingInterval,
    );

    if (!stripePriceId) {
      throw new BadRequestException("STRIPE_PRICE_NOT_CONFIGURED");
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";

    const session = await this.stripeService.client.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing`,
      metadata: {
        workspaceId: workspace.id,
        planCode: dto.planCode,
        billingInterval: dto.billingInterval,
      },
      subscription_data: {
        metadata: {
          workspaceId: workspace.id,
          planCode: dto.planCode,
          billingInterval: dto.billingInterval,
        },
        ...(shouldApplyTrial
          ? {
              trial_period_days: plan.trialDays,
            }
          : {}),
      },
    });

    return {
      url: session.url,
    };
  }

  async cancelAtPeriodEnd(workspaceId: string, userId: string) {
    const workspace = await this.billingRepository.findWorkspaceForUser(
      workspaceId,
      userId,
    );

    if (!workspace) {
      throw new ForbiddenException("WORKSPACE_ACCESS_DENIED");
    }

    const current =
      await this.billingRepository.findCurrentSubscription(workspaceId);

    if (!current?.stripeSubscriptionId) {
      throw new BadRequestException("NO_ACTIVE_PAID_SUBSCRIPTION");
    }

    await this.stripeService.client.subscriptions.update(
      current.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      },
    );

    return {
      success: true,
    };
  }
}
