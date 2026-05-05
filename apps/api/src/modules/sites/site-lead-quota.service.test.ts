import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
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

    siteLeadService = new SiteLeadService(prisma);
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

  it("blocks LINE OA-enabled public lead submissions when FREE quota is reached", async () => {
    const context = await createContext("free-reached", "FREE");

    await prisma.formSubmission.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        formId: context.formId,
        data: {
          name: `Existing Lead ${index + 1}`,
          phone: "0812345678",
        },
      })),
    });

    await assert.rejects(
      () =>
        siteLeadService.submitPublicLead(context.siteId, {
          name: "Blocked Lead",
          phone: "0812345678",
        }),
      (error) =>
        error instanceof BadRequestException &&
        error.message === "LINE_OA_QUOTA_REACHED",
    );
  });

  it("allows LINE OA-enabled public lead submissions for BUSINESS unlimited quota", async () => {
    const context = await createContext("business-unlimited", "BUSINESS");

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
  });
});
