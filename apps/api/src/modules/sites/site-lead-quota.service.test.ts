import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaService } from "../../prisma/prisma.service";
import { LineOaNotificationService } from "../line-oa-notification/line-oa-notification.service";
import { LineOaProvider } from "../line-oa-notification/line-oa-message.types";
import { SiteLeadService } from "./site-lead.service";

type LeadQuotaContext = {
  userId: string;
  workspaceId: string;
  siteId: string;
  formId: string;
};

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("SiteLeadService LINE OA quota", () => {
  let prisma: PrismaService;
  let siteLeadService: SiteLeadService;
  let lineOaNotificationService: LineOaNotificationService;
  let lineOaProvider: LineOaProvider & { pushCount: number };
  let enqueuedSubmissionIds: string[];
  const createdUserIds: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";

    prisma = new PrismaService();
    await prisma.$connect();

    await prisma.plan.update({
      where: { code: "FREE" },
      data: {
        lineOaMonthlyQuota: 5,
      },
    });
    await prisma.plan.update({
      where: { code: "BUSINESS" },
      data: {
        lineOaMonthlyQuota: null,
      },
    });

    lineOaProvider = {
      pushCount: 0,
      async pushMessage() {
        this.pushCount += 1;
        return {
          lineRequestId: `line-request-${this.pushCount}`,
        };
      },
      async getBotInfo() {
        return {
          userId: "Ubot",
        };
      },
    };

    lineOaNotificationService = new LineOaNotificationService(
      prisma,
      lineOaProvider,
    );
    enqueuedSubmissionIds = [];
    siteLeadService = new SiteLeadService(prisma, {
      async enqueueLineOaLeadNotification(payload: { formSubmissionId: string }) {
        enqueuedSubmissionIds.push(payload.formSubmissionId);
        return {
          queued: true,
          jobId: `line-oa-lead:${payload.formSubmissionId}`,
        };
      },
    } as never);
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

  async function createContext(
    label: string,
    planCode: "FREE" | "BUSINESS",
  ): Promise<LeadQuotaContext> {
    const suffix = uniqueSuffix(label);
    const plan = await prisma.plan.findUniqueOrThrow({
      where: { code: planCode },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        email: `site-lead-quota+${suffix}@example.com`,
        name: `Site Lead Quota ${suffix}`,
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
    await prisma.subscription.create({
      data: {
        workspaceId: workspace.id,
        planId: plan.id,
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        isCurrent: true,
      },
    });

    const site = await prisma.site.create({
      data: {
        workspaceId: workspace.id,
        name: `Site ${suffix}`,
        slug: `site-${suffix}`,
      },
      select: {
        id: true,
      },
    });
    const form = await prisma.form.create({
      data: {
        siteId: site.id,
        name: "Public lead form",
        slug: "public-site",
        status: "ACTIVE",
        lineOaAccessToken: "line-token",
        lineOaBotUserId: "Ubot",
        lineOaRecipientId: "Uowner",
        lineOaRecipientType: "USER",
        lineOaSetupStatus: "VERIFIED",
      },
      select: {
        id: true,
      },
    });

    return {
      userId: user.id,
      workspaceId: workspace.id,
      siteId: site.id,
      formId: form.id,
    };
  }

  async function waitForFinalDelivery(submissionId: string) {
    for (let index = 0; index < 40; index += 1) {
      const delivery = await prisma.lineOaDelivery.findUnique({
        where: {
          formSubmissionId: submissionId,
        },
      });

      if (delivery && delivery.status !== "PENDING") {
        return delivery;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    return null;
  }

  it("keeps public lead submission successful and skips LINE OA when FREE quota is reached", async () => {
    const context = await createContext("free-reached", "FREE");

    for (let index = 0; index < 5; index += 1) {
      const existingSubmission = await prisma.formSubmission.create({
        data: {
          formId: context.formId,
          data: {
            name: `Existing Lead ${index + 1}`,
            phone: "0812345678",
          },
        },
      });

      await prisma.lineOaDelivery.create({
        data: {
          formSubmissionId: existingSubmission.id,
          formId: context.formId,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    const result = await siteLeadService.submitPublicLead(context.siteId, {
      name: "Skipped Lead",
      phone: "0812345678",
    });

    assert.equal(result.siteId, context.siteId);
    assert.equal(result.formId, context.formId);
    assert.equal(enqueuedSubmissionIds.includes(result.submissionId), true);

    await lineOaNotificationService.sendLeadNotificationForSubmission(
      result.submissionId,
    );

    const delivery = await waitForFinalDelivery(result.submissionId);

    assert.ok(delivery);
    assert.equal(delivery.status, "SKIPPED");
    assert.equal(delivery.reasonCode, "LINE_OA_QUOTA_REACHED");
  });

  it("sends LINE OA notifications for BUSINESS unlimited quota", async () => {
    const context = await createContext("business-unlimited", "BUSINESS");
    const pushCountBefore = lineOaProvider.pushCount;

    await prisma.formSubmission.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        formId: context.formId,
        data: {
          name: `Existing Lead ${index + 1}`,
          phone: "0812345678",
        },
      })),
    });

    const result = await siteLeadService.submitPublicLead(context.siteId, {
      name: "Allowed Lead",
      phone: "0812345678",
    });

    assert.equal(result.siteId, context.siteId);
    assert.equal(result.formId, context.formId);
    assert.equal(enqueuedSubmissionIds.includes(result.submissionId), true);

    await lineOaNotificationService.sendLeadNotificationForSubmission(
      result.submissionId,
    );

    const delivery = await waitForFinalDelivery(result.submissionId);

    assert.ok(delivery);
    assert.equal(delivery.status, "SENT");
    assert.equal(delivery.reasonCode, null);
    assert.equal(lineOaProvider.pushCount, pushCountBefore + 1);
  });
});
