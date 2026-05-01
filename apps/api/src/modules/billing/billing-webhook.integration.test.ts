import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import Stripe from "stripe";
import configuration from "../../config/configuration";
import {
  BillingInterval,
  SubscriptionStatus,
} from "../../generated/prisma/client";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingRepository } from "./billing.repository";
import { BillingWebhookService } from "./billing-webhook.service";

type WorkspaceContext = {
  workspaceId: string;
  oldSubscriptionId: string;
  stripeSubscriptionId: string;
};

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("Billing webhook integration", () => {
  let prisma: PrismaService;
  let billingWebhookService: BillingWebhookService;
  const createdUserIds: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";
    process.env.STRIPE_PRICE_BASIC_MONTHLY = "price_basic_monthly_test";
    process.env.STRIPE_PRICE_BASIC_YEARLY = "price_basic_yearly_test";
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY = "price_business_monthly_test";
    process.env.STRIPE_PRICE_BUSINESS_YEARLY = "price_business_yearly_test";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly_test";
    process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro_yearly_test";

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env",
          load: [configuration],
        }),
        PrismaModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    billingWebhookService = new BillingWebhookService(
      new BillingRepository(prisma),
    );

    const requiredPlans = await prisma.plan.findMany({
      where: {
        code: {
          in: ["FREE", "BASIC", "BUSINESS", "PRO"],
        },
      },
      select: {
        code: true,
      },
    });

    assert.equal(
      requiredPlans.length,
      4,
      "Expected plans FREE/BASIC/BUSINESS/PRO in test DB",
    );
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          id: {
            in: createdUserIds,
          },
        },
      });
    }
  });

  async function createWorkspaceContext(
    label: string,
  ): Promise<WorkspaceContext> {
    const suffix = uniqueSuffix(label);
    const user = await prisma.user.create({
      data: {
        email: `billing-it+${suffix}@example.com`,
        name: `Billing Test ${suffix}`,
      },
      select: {
        id: true,
      },
    });
    createdUserIds.push(user.id);

    const workspace = await prisma.workspace.create({
      data: {
        name: `Workspace ${suffix}`,
        slug: `workspace-${suffix}`,
        ownerId: user.id,
      },
      select: {
        id: true,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    const freePlan = await prisma.plan.findUnique({
      where: { code: "FREE" },
      select: { id: true },
    });

    assert.ok(freePlan, "Expected FREE plan to exist");

    const stripeSubscriptionId = `sub_${suffix}`;

    const oldSubscription = await prisma.subscription.create({
      data: {
        workspaceId: workspace.id,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        isCurrent: true,
      },
      select: {
        id: true,
      },
    });

    return {
      workspaceId: workspace.id,
      oldSubscriptionId: oldSubscription.id,
      stripeSubscriptionId,
    };
  }

  it("upserts subscription from customer.subscription.updated and marks latest as current", async () => {
    const context = await createWorkspaceContext("subscription-upsert");

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("sub-updated")}`,
      eventType: "customer.subscription.updated",
      object: {
        id: context.stripeSubscriptionId,
        metadata: {
          workspaceId: context.workspaceId,
        },
        status: "active",
        cancel_at_period_end: false,
        customer: "cus_test_001",
        trial_start: null,
        trial_end: null,
        canceled_at: null,
        ended_at: null,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
              price: {
                id: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
              },
            },
          ],
        },
      },
      queuedAt: new Date().toISOString(),
    });

    const latest = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: context.stripeSubscriptionId,
      },
      include: {
        plan: {
          select: {
            code: true,
          },
        },
      },
    });

    assert.ok(latest);
    assert.equal(latest.isCurrent, true);
    assert.equal(latest.status, SubscriptionStatus.ACTIVE);
    assert.equal(latest.plan.code, "BUSINESS");

    const old = await prisma.subscription.findUnique({
      where: {
        id: context.oldSubscriptionId,
      },
    });

    assert.ok(old);
    assert.equal(old.isCurrent, false);
  });

  it("records PAID payment and keeps subscription ACTIVE on invoice.paid", async () => {
    const context = await createWorkspaceContext("invoice-paid");

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("sub-create")}`,
      eventType: "customer.subscription.created",
      object: {
        id: context.stripeSubscriptionId,
        metadata: {
          workspaceId: context.workspaceId,
        },
        status: "active",
        cancel_at_period_end: false,
        customer: "cus_test_002",
        trial_start: null,
        trial_end: null,
        canceled_at: null,
        ended_at: null,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
              price: {
                id: process.env.STRIPE_PRICE_BASIC_MONTHLY,
              },
            },
          ],
        },
      },
      queuedAt: new Date().toISOString(),
    });

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("invoice-paid")}`,
      eventType: "invoice.paid",
      object: {
        id: `in_${uniqueSuffix("paid")}`,
        amount_paid: 25000,
        currency: "thb",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: context.stripeSubscriptionId,
          },
        },
      },
      queuedAt: new Date().toISOString(),
    });

    const subscription = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: context.stripeSubscriptionId,
      },
      include: {
        payments: true,
      },
    });

    assert.ok(subscription);
    assert.equal(subscription.status, SubscriptionStatus.ACTIVE);

    const payment = subscription.payments.find(
      (entry) => entry.status === "PAID",
    );
    assert.ok(payment);
    assert.equal(Number(payment.amount), 250);
    assert.equal(payment.currency, "THB");
  });

  it("records FAILED payment and marks subscription PAST_DUE on invoice.payment_failed", async () => {
    const context = await createWorkspaceContext("invoice-failed");

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("sub-create-failed")}`,
      eventType: "customer.subscription.created",
      object: {
        id: context.stripeSubscriptionId,
        metadata: {
          workspaceId: context.workspaceId,
        },
        status: "active",
        cancel_at_period_end: false,
        customer: "cus_test_003",
        trial_start: null,
        trial_end: null,
        canceled_at: null,
        ended_at: null,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
              price: {
                id: process.env.STRIPE_PRICE_PRO_MONTHLY,
              },
            },
          ],
        },
      },
      queuedAt: new Date().toISOString(),
    });

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("invoice-failed")}`,
      eventType: "invoice.payment_failed",
      object: {
        id: `in_${uniqueSuffix("failed")}`,
        amount_due: 99000,
        currency: "thb",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: context.stripeSubscriptionId,
          },
        },
      },
      queuedAt: new Date().toISOString(),
    });

    const subscription = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: context.stripeSubscriptionId,
      },
      include: {
        payments: true,
      },
    });

    assert.ok(subscription);
    assert.equal(subscription.status, SubscriptionStatus.PAST_DUE);

    const failedPayment = subscription.payments.find(
      (entry) => entry.status === "FAILED",
    );
    assert.ok(failedPayment);
    assert.equal(Number(failedPayment.amount), 990);
    assert.equal(failedPayment.currency, "THB");
  });

  it("cancels deleted subscription and creates FREE fallback", async () => {
    const context = await createWorkspaceContext("subscription-deleted");

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("sub-create-delete")}`,
      eventType: "customer.subscription.created",
      object: {
        id: context.stripeSubscriptionId,
        metadata: {
          workspaceId: context.workspaceId,
        },
        status: "active",
        cancel_at_period_end: false,
        customer: "cus_test_004",
        trial_start: null,
        trial_end: null,
        canceled_at: null,
        ended_at: null,
        items: {
          data: [
            {
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end:
                Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
              price: {
                id: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
              },
            },
          ],
        },
      },
      queuedAt: new Date().toISOString(),
    });

    await billingWebhookService.processQueuedEvent({
      eventId: `evt_${uniqueSuffix("sub-deleted")}`,
      eventType: "customer.subscription.deleted",
      object: {
        id: context.stripeSubscriptionId,
        metadata: {
          workspaceId: context.workspaceId,
        },
      },
      queuedAt: new Date().toISOString(),
    });

    const current = await prisma.subscription.findFirst({
      where: {
        workspaceId: context.workspaceId,
        isCurrent: true,
      },
      include: {
        plan: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    assert.ok(current);
    assert.equal(current.plan.code, "FREE");

    const deletedSub = await prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId: context.stripeSubscriptionId,
      },
    });

    assert.ok(deletedSub);
    assert.equal(deletedSub.status, SubscriptionStatus.CANCELED);
    assert.equal(deletedSub.isCurrent, false);
    assert.equal(Boolean(deletedSub.endedAt), true);
  });
});
