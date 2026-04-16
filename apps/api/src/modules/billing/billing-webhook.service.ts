import { Injectable, Logger, Optional } from "@nestjs/common";
import Stripe from "stripe";
import {
  BillingStripeEventPayload,
  isSupportedBillingEventType,
} from "@finnweb/shared";
import {
  BillingInterval,
  BillingPaymentStatus,
  PlanCode,
  SubscriptionStatus,
} from "../../generated/prisma/client";
import { JobsService } from "../../jobs/jobs.service";
import { BillingRepository } from "./billing.repository";

@Injectable()
export class BillingWebhookService {
  private readonly logger = new Logger(BillingWebhookService.name);

  constructor(
    private readonly billingRepository: BillingRepository,
    @Optional() private readonly jobsService?: JobsService,
  ) {}

  async handleEvent(event: Stripe.Event) {
    const payload = this.toQueuePayload(event);

    if (payload && this.jobsService) {
      const result = await this.jobsService.enqueueBillingStripeEvent(payload);

      if (result.queued) {
        this.logger.log(
          `Queued Stripe billing event ${payload.eventType}: ${payload.eventId}`,
        );
        return;
      }

      this.logger.warn(
        `Queue unavailable; processing Stripe billing event inline: ${payload.eventType}`,
      );
    }

    await this.processEvent(event);
  }

  async processQueuedEvent(payload: BillingStripeEventPayload) {
    await this.processEvent({
      id: payload.eventId,
      type: payload.eventType,
      data: {
        object: payload.object,
      },
    } as Stripe.Event);
  }

  private toQueuePayload(
    event: Stripe.Event,
  ): BillingStripeEventPayload | null {
    if (!isSupportedBillingEventType(event.type)) {
      return null;
    }

    return {
      eventId: event.id,
      eventType: event.type,
      object: event.data.object as Record<string, unknown>,
      queuedAt: new Date().toISOString(),
    };
  }

  private async processEvent(event: Stripe.Event) {
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    switch (status) {
      case "trialing":
        return SubscriptionStatus.TRIALING;
      case "active":
        return SubscriptionStatus.ACTIVE;
      case "past_due":
      case "unpaid":
        return SubscriptionStatus.PAST_DUE;
      case "canceled":
        return SubscriptionStatus.CANCELED;
      case "incomplete_expired":
        return SubscriptionStatus.EXPIRED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice) {
    if (
      invoice.parent &&
      invoice.parent.type === "subscription_details" &&
      invoice.parent.subscription_details?.subscription
    ) {
      const sub = invoice.parent.subscription_details.subscription;
      return typeof sub === "string" ? sub : sub.id;
    }

    return null;
  }

  private getSubscriptionPeriodDates(subscription: Stripe.Subscription) {
    const firstItem = subscription.items.data[0];

    return {
      currentPeriodStart: firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000)
        : null,
      currentPeriodEnd: firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : null,
    };
  }

  private resolvePlanByStripePriceId(priceId?: string | null): {
    code: PlanCode;
    interval: BillingInterval;
  } {
    const map: Record<string, { code: PlanCode; interval: BillingInterval }> = {
      [process.env.STRIPE_PRICE_BASIC_MONTHLY as string]: {
        code: PlanCode.BASIC,
        interval: BillingInterval.MONTHLY,
      },
      [process.env.STRIPE_PRICE_BASIC_YEARLY as string]: {
        code: PlanCode.BASIC,
        interval: BillingInterval.YEARLY,
      },
      [process.env.STRIPE_PRICE_BUSINESS_MONTHLY as string]: {
        code: PlanCode.BUSINESS,
        interval: BillingInterval.MONTHLY,
      },
      [process.env.STRIPE_PRICE_BUSINESS_YEARLY as string]: {
        code: PlanCode.BUSINESS,
        interval: BillingInterval.YEARLY,
      },
      [process.env.STRIPE_PRICE_PRO_MONTHLY as string]: {
        code: PlanCode.PRO,
        interval: BillingInterval.MONTHLY,
      },
      [process.env.STRIPE_PRICE_PRO_YEARLY as string]: {
        code: PlanCode.PRO,
        interval: BillingInterval.YEARLY,
      },
    };

    const found = priceId ? map[priceId] : null;

    if (!found) {
      throw new Error(`UNMAPPED_STRIPE_PRICE_ID:${priceId}`);
    }

    return found;
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    this.logger.log(`checkout.session.completed: ${session.id}`);
  }

  private async handleSubscriptionUpsert(subscription: Stripe.Subscription) {
    const workspaceId = subscription.metadata?.workspaceId;

    if (!workspaceId) {
      throw new Error("WORKSPACE_ID_NOT_FOUND_IN_SUBSCRIPTION_METADATA");
    }

    const item = subscription.items.data[0];
    const priceId = item?.price?.id ?? null;
    const resolved = this.resolvePlanByStripePriceId(priceId);

    const plan = await this.billingRepository.findPlanByCode(resolved.code);

    if (!plan) {
      throw new Error("PLAN_NOT_FOUND_FROM_PRICE");
    }

    const { currentPeriodStart, currentPeriodEnd } =
      this.getSubscriptionPeriodDates(subscription);

    await this.billingRepository.upsertStripeSubscriptionRecord({
      workspaceId,
      planId: plan.id,
      billingInterval: resolved.interval,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: this.mapStripeStatus(subscription.status),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart,
      currentPeriodEnd,
      trialStartAt: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEndAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      endedAt: subscription.ended_at
        ? new Date(subscription.ended_at * 1000)
        : null,
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const stripeSubscriptionId =
      this.getStripeSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) {
      this.logger.warn(`invoice.paid missing subscription link: ${invoice.id}`);
      return;
    }

    const current =
      await this.billingRepository.findSubscriptionByStripeSubscriptionId(
        stripeSubscriptionId,
      );

    if (!current) {
      this.logger.warn(
        `invoice.paid subscription not found in DB: ${stripeSubscriptionId}`,
      );
      return;
    }

    await this.billingRepository.createOrUpdatePayment({
      subscriptionId: current.id,
      provider: "STRIPE",
      providerRef: invoice.id,
      stripeInvoiceId: invoice.id,
      stripeCheckoutSessionId: null,
      amount: Number(invoice.amount_paid || 0) / 100,
      currency: invoice.currency || "THB",
      status: BillingPaymentStatus.PAID,
      paidAt: new Date(),
    });

    await this.billingRepository.updateSubscriptionById(current.id, {
      status: SubscriptionStatus.ACTIVE,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const stripeSubscriptionId =
      this.getStripeSubscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) {
      this.logger.warn(
        `invoice.payment_failed missing subscription link: ${invoice.id}`,
      );
      return;
    }

    const current =
      await this.billingRepository.findSubscriptionByStripeSubscriptionId(
        stripeSubscriptionId,
      );

    if (!current) {
      this.logger.warn(
        `invoice.payment_failed subscription not found in DB: ${stripeSubscriptionId}`,
      );
      return;
    }

    await this.billingRepository.createOrUpdatePayment({
      subscriptionId: current.id,
      provider: "STRIPE",
      providerRef: invoice.id,
      stripeInvoiceId: invoice.id,
      stripeCheckoutSessionId: null,
      amount: Number(invoice.amount_due || 0) / 100,
      currency: invoice.currency || "THB",
      status: BillingPaymentStatus.FAILED,
      failedAt: new Date(),
    });

    await this.billingRepository.updateSubscriptionById(current.id, {
      status: SubscriptionStatus.PAST_DUE,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const workspaceId = subscription.metadata?.workspaceId;

    if (!workspaceId) {
      this.logger.warn(
        `customer.subscription.deleted missing workspaceId metadata: ${subscription.id}`,
      );
      return;
    }

    const current =
      await this.billingRepository.findSubscriptionByStripeSubscriptionId(
        subscription.id,
      );

    if (current) {
      await this.billingRepository.updateSubscriptionById(current.id, {
        status: SubscriptionStatus.CANCELED,
        isCurrent: false,
        endedAt: new Date(),
      });
    }

    await this.billingRepository.createFreeSubscription(workspaceId);
  }
}
