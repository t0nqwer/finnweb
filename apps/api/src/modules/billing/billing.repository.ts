import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  BillingInterval,
  BillingPaymentStatus,
  PlanCode,
  SubscriptionStatus,
  WorkspaceMemberRole,
} from "../../generated/prisma/client";

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWorkspaceForUser(workspaceId: string, userId: string) {
    return this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        members: {
          some: {
            userId,
            role: {
              in: [WorkspaceMemberRole.OWNER],
            },
          },
        },
      },
    });
  }

  findPlanByCode(code: PlanCode) {
    return this.prisma.plan.findUnique({
      where: { code },
    });
  }

  findCurrentSubscription(workspaceId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        workspaceId,
        isCurrent: true,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: {
        stripeSubscriptionId,
      },
    });
  }

  async hasPaidHistory(workspaceId: string) {
    const found = await this.prisma.subscription.findFirst({
      where: {
        workspaceId,
        plan: {
          code: {
            in: [PlanCode.BASIC, PlanCode.BUSINESS, PlanCode.PRO],
          },
        },
      },
      select: {
        id: true,
      },
    });

    return !!found;
  }

  markAllSubscriptionsNotCurrent(workspaceId: string) {
    return this.prisma.subscription.updateMany({
      where: {
        workspaceId,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    });
  }

  async createFreeSubscription(workspaceId: string) {
    const freePlan = await this.prisma.plan.findUnique({
      where: { code: PlanCode.FREE },
    });

    if (!freePlan) {
      throw new Error("FREE_PLAN_NOT_FOUND");
    }

    return this.prisma.subscription.create({
      data: {
        workspaceId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: BillingInterval.MONTHLY,
        isCurrent: true,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        trialStartAt: null,
        trialEndAt: null,
        canceledAt: null,
        endedAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  async upsertStripeSubscriptionRecord(input: {
    workspaceId: string;
    planId: string;
    billingInterval: BillingInterval;
    stripeCustomerId?: string | null;
    stripeSubscriptionId: string;
    stripePriceId?: string | null;
    status: SubscriptionStatus;
    cancelAtPeriodEnd?: boolean;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    trialStartAt?: Date | null;
    trialEndAt?: Date | null;
    canceledAt?: Date | null;
    endedAt?: Date | null;
  }) {
    await this.markAllSubscriptionsNotCurrent(input.workspaceId);

    return this.prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: input.stripeSubscriptionId,
      },
      update: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        billingInterval: input.billingInterval,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripePriceId: input.stripePriceId ?? null,
        status: input.status,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        trialStartAt: input.trialStartAt ?? null,
        trialEndAt: input.trialEndAt ?? null,
        canceledAt: input.canceledAt ?? null,
        endedAt: input.endedAt ?? null,
        isCurrent: true,
      },
      create: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        billingInterval: input.billingInterval,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripePriceId: input.stripePriceId ?? null,
        status: input.status,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        currentPeriodStart: input.currentPeriodStart ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        trialStartAt: input.trialStartAt ?? null,
        trialEndAt: input.trialEndAt ?? null,
        canceledAt: input.canceledAt ?? null,
        endedAt: input.endedAt ?? null,
        isCurrent: true,
      },
    });
  }

  updateSubscriptionById(
    id: string,
    data: {
      status?: SubscriptionStatus;
      isCurrent?: boolean;
      endedAt?: Date | null;
      canceledAt?: Date | null;
      cancelAtPeriodEnd?: boolean;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      trialStartAt?: Date | null;
      trialEndAt?: Date | null;
    },
  ) {
    return this.prisma.subscription.update({
      where: { id },
      data,
    });
  }

  createOrUpdatePayment(data: {
    subscriptionId: string;
    provider: string;
    providerRef: string;
    stripeInvoiceId?: string | null;
    stripeCheckoutSessionId?: string | null;
    amount: number;
    currency: string;
    status: BillingPaymentStatus;
    paidAt?: Date | null;
    failedAt?: Date | null;
  }) {
    return this.prisma.payment.upsert({
      where: {
        providerRef: data.providerRef,
      },
      update: {
        stripeInvoiceId: data.stripeInvoiceId ?? null,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        status: data.status,
        paidAt: data.paidAt ?? null,
        failedAt: data.failedAt ?? null,
      },
      create: {
        subscriptionId: data.subscriptionId,
        provider: data.provider,
        providerRef: data.providerRef,
        stripeInvoiceId: data.stripeInvoiceId ?? null,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        status: data.status,
        paidAt: data.paidAt ?? null,
        failedAt: data.failedAt ?? null,
      },
    });
  }

  getCurrentSubscriptionWithPlan(workspaceId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        workspaceId,
        isCurrent: true,
      },
      include: {
        plan: {
          select: {
            code: true,
            name: true,
            description: true,
            priceMonthly: true,
            priceYearly: true,
            maxSites: true,
            maxPagesPerSite: true,
            maxSectionsPerPage: true,
            maxProducts: true,
            maxPosts: true,
            allowCustomDomain: true,
            allowForms: true,
            allowAnalytics: true,
            allowCustomCode: true,
            allowEcommerce: true,
            allowBlog: true,
            allowNews: true,
            lineOaMonthlyQuota: true,
            supportTier: true,
            trackingLevel: true,
            analyticsLevel: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  getLatestPayment(subscriptionId: string) {
    return this.prisma.payment.findFirst({
      where: {
        subscriptionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async countWorkspaceSites(workspaceId: string) {
    const result = await this.prisma.site.count({
      where: {
        workspaceId,
      },
    });
    return result;
  }

  async countWorkspacePages(workspaceId: string) {
    // Count total pages across all sites in workspace
    const totalPages = await this.prisma.page.count({
      where: {
        site: {
          workspaceId,
        },
      },
    });

    // Get site IDs where pages exceed their per-site limit
    // This requires checking each site individually
    const sites = await this.prisma.site.findMany({
      where: { workspaceId },
      select: { id: true },
    });

    const siteIdsOverLimit: string[] = [];
    // Note: Actual checking of per-site limits is done at
    // usage time in sites.service since the limit depends
    // on the current plan
    // For now, this tracks all sites for potential analysis

    return {
      total: totalPages,
      siteIds: siteIdsOverLimit,
    };
  }

  async countMonthlyLineOaNotifications(workspaceId: string, at = new Date()) {
    const monthStart = new Date(at.getFullYear(), at.getMonth(), 1);
    const monthEnd = new Date(at.getFullYear(), at.getMonth() + 1, 1);

    return this.prisma.lineOaDelivery.count({
      where: {
        status: "SENT",
        sentAt: {
          gte: monthStart,
          lt: monthEnd,
        },
        form: {
          site: {
            workspaceId,
          },
        },
      },
    });
  }
}
