import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import dotenv from "dotenv";
import { UnrecoverableError } from "bullmq";
import { LineOaDeliveryError } from "../../api/src/modules/line-oa-notification/line-oa-delivery.error";
import { textContainsSecret } from "../../api/src/modules/line-oa-notification/line-oa-token.util";
import { PrismaService } from "../../api/src/prisma/prisma.service";
import {
  handleLineOaLeadNotificationFailure,
  processLineOaLeadNotificationJob,
} from "./line-oa-lead-notification.processor";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), "../api/.env"), quiet: true });
dotenv.config({ quiet: true });

function uniqueSuffix(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Context = {
  userId: string;
  siteId: string;
  formId: string;
  submissionId: string;
};

class MockLineOaNotificationService {
  pushCount = 0;
  failuresBeforeSuccess = 0;

  constructor(private readonly prisma: PrismaService) {}

  async sendLeadNotificationForSubmission(formSubmissionId: string) {
    const submission = await this.prisma.formSubmission.findUniqueOrThrow({
      where: { id: formSubmissionId },
      select: { formId: true },
    });
    this.pushCount += 1;

    if (this.pushCount <= this.failuresBeforeSuccess) {
      await this.prisma.lineOaDelivery.upsert({
        where: { formSubmissionId },
        create: {
          formSubmissionId,
          formId: submission.formId,
          status: "FAILED",
          reasonCode: "LINE_OA_SERVER_ERROR",
          failedAt: new Date(),
        },
        update: {
          status: "FAILED",
          reasonCode: "LINE_OA_SERVER_ERROR",
          failedAt: new Date(),
        },
      });
      throw new LineOaDeliveryError({
        code: "LINE_OA_SERVER_ERROR",
        retryable: true,
        statusCode: 503,
      });
    }

    return this.prisma.lineOaDelivery.upsert({
      where: { formSubmissionId },
      create: {
        formSubmissionId,
        formId: submission.formId,
        status: "SENT",
        sentAt: new Date(),
        lineRequestId: `line-request-${this.pushCount}`,
      },
      update: {
        status: "SENT",
        sentAt: new Date(),
        lineRequestId: `line-request-${this.pushCount}`,
      },
    });
  }
}

describe("LINE OA lead notification worker processor", () => {
  let prisma: PrismaService;
  const createdUserIds: string[] = [];

  before(async () => {
    process.env.NODE_ENV = "test";
    prisma = new PrismaService();
    await prisma.$connect();

    await prisma.plan.update({
      where: { code: "BUSINESS" },
      data: { lineOaMonthlyQuota: null },
    });
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

  async function createContext(label: string, options?: {
    notifyEmail?: string | null;
    ownerEmail?: string;
    accessToken?: string;
  }): Promise<Context> {
    const suffix = uniqueSuffix(label);
    const plan = await prisma.plan.findUniqueOrThrow({
      where: { code: "BUSINESS" },
      select: { id: true },
    });
    const user = await prisma.user.create({
      data: {
        email: options?.ownerEmail ?? `line-worker+${suffix}@example.com`,
        name: `Line Worker ${suffix}`,
      },
      select: { id: true },
    });
    createdUserIds.push(user.id);
    const workspace = await prisma.workspace.create({
      data: {
        name: `Workspace ${suffix}`,
        slug: `workspace-${suffix}`,
        ownerId: user.id,
      },
      select: { id: true },
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
      select: { id: true },
    });
    const form = await prisma.form.create({
      data: {
        siteId: site.id,
        name: "Public lead form",
        slug: "public-site",
        status: "ACTIVE",
        notifyEmail: options?.notifyEmail,
        lineOaAccessToken: options?.accessToken ?? "line-token",
        lineOaBotUserId: "Ubot",
        lineOaRecipientId: "Uowner",
        lineOaRecipientType: "USER",
        lineOaSetupStatus: "VERIFIED",
      },
      select: { id: true },
    });
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: {
          name: "Lead Name",
          phone: "0812345678",
          email: "lead@example.com",
          message: "Need info",
        },
      },
      select: { id: true },
    });

    return {
      userId: user.id,
      siteId: site.id,
      formId: form.id,
      submissionId: submission.id,
    };
  }

  it("retries a retryable 5xx failure and succeeds on the second attempt", async () => {
    const context = await createContext("retry-success");
    const service = new MockLineOaNotificationService(prisma);
    service.failuresBeforeSuccess = 1;

    await assert.rejects(
      () =>
        processLineOaLeadNotificationJob({
          data: { formSubmissionId: context.submissionId },
          lineOaNotificationService: service,
        }),
      (error) =>
        error instanceof LineOaDeliveryError &&
        error.code === "LINE_OA_SERVER_ERROR",
    );

    await processLineOaLeadNotificationJob({
      data: { formSubmissionId: context.submissionId },
      lineOaNotificationService: service,
    });

    const delivery = await prisma.lineOaDelivery.findUniqueOrThrow({
      where: { formSubmissionId: context.submissionId },
    });

    assert.equal(delivery.status, "SENT");
    assert.equal(service.pushCount, 2);
  });

  it("sends fallback email after retry exhaustion", async () => {
    const context = await createContext("fallback-notify", {
      notifyEmail: "owner-notify@example.com",
    });
    const service = new MockLineOaNotificationService(prisma);
    service.failuresBeforeSuccess = 99;

    for (let index = 0; index < 3; index += 1) {
      await assert.rejects(() =>
        processLineOaLeadNotificationJob({
          data: { formSubmissionId: context.submissionId },
          lineOaNotificationService: service,
        }),
      );
    }

    const sentEmails: Array<{ to: string; input: unknown }> = [];
    await handleLineOaLeadNotificationFailure({
      formSubmissionId: context.submissionId,
      prisma,
      emailService: {
        async sendLeadNotificationFallbackEmail(input: { to: string }) {
          sentEmails.push({ to: input.to, input });
        },
      } as never,
    });

    const delivery = await prisma.lineOaDelivery.findUniqueOrThrow({
      where: { formSubmissionId: context.submissionId },
    });

    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, "owner-notify@example.com");
    assert.equal(delivery.status, "FALLBACK_SENT");
  });

  it("marks fallback missing when no email is available", async () => {
    const context = await createContext("fallback-missing", {
      notifyEmail: null,
      ownerEmail: "",
    });

    await handleLineOaLeadNotificationFailure({
      formSubmissionId: context.submissionId,
      prisma,
      emailService: {
        async sendLeadNotificationFallbackEmail() {
          throw new Error("SHOULD_NOT_SEND");
        },
      } as never,
    });

    const delivery = await prisma.lineOaDelivery.findUniqueOrThrow({
      where: { formSubmissionId: context.submissionId },
    });

    assert.equal(delivery.status, "FAILED");
    assert.equal(delivery.reasonCode, "LINE_OA_FALLBACK_EMAIL_MISSING");
  });

  it("does not push twice for the same sent submission", async () => {
    const context = await createContext("idempotent");
    const service = {
      pushCount: 0,
      async sendLeadNotificationForSubmission(formSubmissionId: string) {
        const existing = await prisma.lineOaDelivery.findUnique({
          where: { formSubmissionId },
        });

        if (existing?.status === "SENT") {
          return existing;
        }

        this.pushCount += 1;
        const submission = await prisma.formSubmission.findUniqueOrThrow({
          where: { id: formSubmissionId },
          select: { formId: true },
        });

        return prisma.lineOaDelivery.upsert({
          where: { formSubmissionId },
          create: {
            formSubmissionId,
            formId: submission.formId,
            status: "SENT",
            sentAt: new Date(),
          },
          update: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
      },
    };

    await processLineOaLeadNotificationJob({
      data: { formSubmissionId: context.submissionId },
      lineOaNotificationService: service,
    });
    await processLineOaLeadNotificationJob({
      data: { formSubmissionId: context.submissionId },
      lineOaNotificationService: service,
    });

    assert.equal(service.pushCount, 1);
  });

  it("does not leak the LINE token into fallback email payloads", async () => {
    const secret = "line-secret-token-should-not-leak";
    const context = await createContext("fallback-no-token", {
      notifyEmail: "owner-token-check@example.com",
      accessToken: secret,
    });

    let payload = "";
    await handleLineOaLeadNotificationFailure({
      formSubmissionId: context.submissionId,
      prisma,
      emailService: {
        async sendLeadNotificationFallbackEmail(input: unknown) {
          payload = JSON.stringify(input);
        },
      } as never,
    });

    assert.equal(textContainsSecret(payload, secret), false);
  });

  it("turns non-retryable LINE errors into unrecoverable worker failures", async () => {
    await assert.rejects(
      () =>
        processLineOaLeadNotificationJob({
          data: { formSubmissionId: "submission-id" },
          lineOaNotificationService: {
            async sendLeadNotificationForSubmission() {
              throw new LineOaDeliveryError({
                code: "LINE_OA_TOKEN_INVALID",
                retryable: false,
              });
            },
          } as never,
        }),
      (error) => error instanceof UnrecoverableError,
    );
  });
});
