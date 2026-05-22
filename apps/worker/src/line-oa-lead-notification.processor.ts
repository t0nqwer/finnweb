import { UnrecoverableError } from "bullmq";
import type { LineOaLeadNotificationPayload } from "@finnweb/shared";
import { LINE_OA_DELIVERY_ERROR_CODES } from "../../api/src/common/constants/line-oa-delivery-errors.constant";
import { EmailService } from "../../api/src/modules/email/email.service";
import { LineOaDeliveryError } from "../../api/src/modules/line-oa-notification/line-oa-delivery.error";
import { textContainsSecret } from "../../api/src/modules/line-oa-notification/line-oa-token.util";
import { PrismaService } from "../../api/src/prisma/prisma.service";

export type LineOaNotificationSender = {
  sendLeadNotificationForSubmission(formSubmissionId: string): Promise<unknown>;
};

export const LINE_OA_QUEUE_LIMITER = {
  max: 100,
  duration: 1000,
} as const;

export async function processLineOaLeadNotificationJob(input: {
  data: LineOaLeadNotificationPayload;
  lineOaNotificationService: LineOaNotificationSender;
}) {
  try {
    return await input.lineOaNotificationService.sendLeadNotificationForSubmission(
      input.data.formSubmissionId,
    );
  } catch (error) {
    if (error instanceof LineOaDeliveryError && !error.retryable) {
      throw new UnrecoverableError(error.message);
    }

    throw error;
  }
}

export async function handleLineOaLeadNotificationFailure(input: {
  formSubmissionId: string;
  prisma: PrismaService;
  emailService: EmailService;
}) {
  const submission = await input.prisma.formSubmission.findUnique({
    where: {
      id: input.formSubmissionId,
    },
    include: {
      form: {
        include: {
          site: {
            include: {
              workspace: {
                include: {
                  owner: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      lineOaDelivery: true,
    },
  });

  if (!submission) {
    return;
  }

  const to =
    submission.form.notifyEmail?.trim() ||
    submission.form.site.workspace.owner.email?.trim();

  if (!to) {
    await input.prisma.lineOaDelivery.upsert({
      where: {
        formSubmissionId: submission.id,
      },
      create: {
        formSubmissionId: submission.id,
        formId: submission.formId,
        status: "FAILED",
        reasonCode: "LINE_OA_FALLBACK_EMAIL_MISSING",
        customerMessage:
          LINE_OA_DELIVERY_ERROR_CODES.LINE_OA_FALLBACK_EMAIL_MISSING
            .thaiMessage,
        failedAt: new Date(),
      },
      update: {
        status: "FAILED",
        reasonCode: "LINE_OA_FALLBACK_EMAIL_MISSING",
        customerMessage:
          LINE_OA_DELIVERY_ERROR_CODES.LINE_OA_FALLBACK_EMAIL_MISSING
            .thaiMessage,
        failedAt: new Date(),
      },
    });
    return;
  }

  const lead = extractLead(submission.data);
  const dashboardUrl = buildDashboardLeadUrl(submission.form.siteId);
  const bodyProbe = [
    lead.name,
    lead.phone,
    lead.email,
    lead.message,
    dashboardUrl,
  ].join("\n");

  if (textContainsSecret(bodyProbe, submission.form.lineOaAccessToken)) {
    throw new Error("LINE_OA_SECRET_IN_FALLBACK_EMAIL_BODY");
  }

  await input.emailService.sendLeadNotificationFallbackEmail({
    to,
    siteName: submission.form.site.name,
    lead: {
      ...lead,
      createdAt: submission.createdAt,
    },
    dashboardUrl,
  });

  await input.prisma.lineOaDelivery.upsert({
    where: {
      formSubmissionId: submission.id,
    },
    create: {
      formSubmissionId: submission.id,
      formId: submission.formId,
      status: "FALLBACK_SENT",
      sentAt: new Date(),
    },
    update: {
      status: "FALLBACK_SENT",
      sentAt: new Date(),
    },
  });
}

function extractLead(data: unknown) {
  const record =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  return {
    name: pickString(record, ["name", "fullName", "fullname"]),
    phone: pickString(record, ["phone", "phoneNumber", "tel"]),
    email: pickString(record, ["email", "emailAddress"]),
    message: pickString(record, ["message", "detail", "note"]),
  };
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildDashboardLeadUrl(siteId: string) {
  const frontendUrl = process.env.FRONTEND_URL ?? "https://app.finnweb.site";
  return `${frontendUrl.replace(/\/+$/, "")}/sites/${siteId}/leads`;
}
