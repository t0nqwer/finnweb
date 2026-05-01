import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BillingInterval, PlanCode } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { BillingRepository } from "./billing.repository";
import { BillingService } from "./billing.service";
import { StripeService } from "./stripe.service";

type CheckoutSessionParams = {
  mode?: string;
  ui_mode?: string;
  customer?: string;
  line_items?: Array<{ price?: string; quantity?: number }>;
  success_url?: string;
  cancel_url?: string;
  return_url?: string;
  payment_method_types?: string[];
  metadata?: Record<string, unknown>;
  subscription_data?: {
    metadata?: Record<string, unknown>;
    trial_period_days?: number;
  };
};

type StripeMockState = {
  checkoutSessionParams: CheckoutSessionParams[];
  checkoutSessionResponse: {
    id: string;
    url?: string;
    client_secret?: string;
  };
};

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createStripeServiceMock(state: StripeMockState) {
  return {
    client: {
      customers: {
        async create() {
          return {
            id: "cus_checkout_it_001",
          };
        },
      },
      checkout: {
        sessions: {
          async create(params: CheckoutSessionParams) {
            state.checkoutSessionParams.push(params);
            return {
              ...state.checkoutSessionResponse,
            };
          },
        },
      },
      subscriptions: {
        async update() {
          return {
            id: "sub_updated",
          };
        },
      },
    },
  } as unknown as StripeService;
}

describe("Billing checkout integration", () => {
  let prisma: PrismaService;
  let billingService: BillingService;
  let stripeState: StripeMockState;
  const createdUserIds: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";
    process.env.APP_URL = "http://localhost:3000";

    prisma = new PrismaService();
    await prisma.$connect();

    await prisma.plan.update({
      where: {
        code: PlanCode.BASIC,
      },
      data: {
        stripePriceMonthlyId: "price_basic_monthly_it",
        stripePriceYearlyId: "price_basic_yearly_it",
      },
    });

    await prisma.plan.update({
      where: {
        code: PlanCode.BUSINESS,
      },
      data: {
        stripePriceMonthlyId: "price_business_monthly_it",
        stripePriceYearlyId: "price_business_yearly_it",
      },
    });

    stripeState = {
      checkoutSessionParams: [],
      checkoutSessionResponse: {
        id: "cs_test_001",
        url: "https://checkout.stripe.com/session/test",
        client_secret: "cs_secret_test_001",
      },
    };

    billingService = new BillingService(
      new BillingRepository(prisma),
      createStripeServiceMock(stripeState),
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

    await prisma.$disconnect();
  });

  async function createWorkspaceContext(label: string) {
    const suffix = uniqueSuffix(label);

    const user = await prisma.user.create({
      data: {
        email: `billing-checkout-it+${suffix}@example.com`,
        name: `Billing Checkout ${suffix}`,
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

    return {
      userId: user.id,
      workspaceId: workspace.id,
    };
  }

  it("creates checkout session URL with trial for first-time paid upgrade", async () => {
    stripeState.checkoutSessionParams.length = 0;
    stripeState.checkoutSessionResponse = {
      id: "cs_trial_001",
      url: "https://checkout.stripe.com/session/trial",
      client_secret: "cs_secret_trial",
    };

    const context = await createWorkspaceContext("redirect-trial");

    const result = await billingService.createCheckoutSession(
      {
        workspaceId: context.workspaceId,
        planCode: PlanCode.BASIC,
        billingInterval: BillingInterval.MONTHLY,
      },
      context.userId,
    );

    assert.equal(result.url, "https://checkout.stripe.com/session/trial");
    assert.equal(stripeState.checkoutSessionParams.length, 1);

    const params = stripeState.checkoutSessionParams[0];
    assert.equal(params.mode, "subscription");
    assert.equal(params.customer, "cus_checkout_it_001");
    assert.equal(params.line_items?.[0]?.price, "price_basic_monthly_it");
    assert.equal(params.subscription_data?.trial_period_days, 7);
    assert.equal(
      params.success_url,
      "http://localhost:3000/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}",
    );
  });

  it("creates embedded checkout session with card-only settings and client secret", async () => {
    stripeState.checkoutSessionParams.length = 0;
    stripeState.checkoutSessionResponse = {
      id: "cs_embedded_001",
      url: undefined,
      client_secret: "cs_secret_embedded_001",
    };

    const context = await createWorkspaceContext("embedded");

    const result = await billingService.createEmbeddedCheckoutSession(
      {
        workspaceId: context.workspaceId,
        planCode: PlanCode.BUSINESS,
        billingInterval: BillingInterval.YEARLY,
      },
      context.userId,
    );

    assert.equal(result.clientSecret, "cs_secret_embedded_001");
    assert.equal(result.sessionId, "cs_embedded_001");
    assert.equal(stripeState.checkoutSessionParams.length, 1);

    const params = stripeState.checkoutSessionParams[0];
    assert.equal(params.mode, "subscription");
    assert.equal(params.ui_mode, "elements");
    assert.deepEqual(params.payment_method_types, ["card"]);
    assert.equal(
      params.return_url,
      "http://localhost:3000/dashboard/billing?session_id={CHECKOUT_SESSION_ID}",
    );
    assert.equal(params.line_items?.[0]?.price, "price_business_yearly_it");
  });

  it("rejects checkout session request for FREE plan", async () => {
    const context = await createWorkspaceContext("free-plan");

    await assert.rejects(
      () =>
        billingService.createCheckoutSession(
          {
            workspaceId: context.workspaceId,
            planCode: PlanCode.FREE,
            billingInterval: BillingInterval.MONTHLY,
          },
          context.userId,
        ),
      /FREE_PLAN_CANNOT_USE_CHECKOUT/,
    );
  });

  it("rejects embedded checkout when stripe does not return client secret", async () => {
    stripeState.checkoutSessionParams.length = 0;
    stripeState.checkoutSessionResponse = {
      id: "cs_missing_secret",
      url: undefined,
      client_secret: undefined,
    };

    const context = await createWorkspaceContext("embedded-no-secret");

    await assert.rejects(
      () =>
        billingService.createEmbeddedCheckoutSession(
          {
            workspaceId: context.workspaceId,
            planCode: PlanCode.BASIC,
            billingInterval: BillingInterval.MONTHLY,
          },
          context.userId,
        ),
      /CHECKOUT_CLIENT_SECRET_NOT_RETURNED/,
    );
  });
});
