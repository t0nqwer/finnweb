import { Inject, Injectable, Logger } from "@nestjs/common";
import type * as runtime from "@prisma/client/runtime/client";
import { LINE_OA_DELIVERY_ERROR_CODES } from "../../common/constants/line-oa-delivery-errors.constant";
import { PrismaService } from "../../prisma/prisma.service";
import { LineOaDeliveryError } from "./line-oa-delivery.error";
import {
  LINE_OA_PROVIDER,
  LineOaMessage,
} from "./line-oa-message.types";
import type { LineOaProvider } from "./line-oa-message.types";
import { maskLineOaToken } from "./line-oa-token.util";

type LeadContact = {
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
};

@Injectable()
export class LineOaNotificationService {
  private readonly logger = new Logger(LineOaNotificationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LINE_OA_PROVIDER)
    private readonly lineOaProvider: LineOaProvider,
  ) {}

  async discoverBotInfoForForm(formId: string) {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        lineOaAccessToken: true,
      },
    });

    if (!form?.lineOaAccessToken?.trim()) {
      await this.prisma.form.update({
        where: { id: formId },
        data: {
          lineOaBotUserId: null,
          lineOaSetupStatus: "PENDING",
        },
      });
      return {
        status: "PENDING" as const,
        botUserId: null,
      };
    }

    try {
      const botInfo = await this.lineOaProvider.getBotInfo(
        form.lineOaAccessToken,
      );

      await this.prisma.form.update({
        where: { id: formId },
        data: {
          lineOaBotUserId: botInfo.userId,
          lineOaSetupStatus: "VERIFIED",
        },
      });

      return {
        status: "VERIFIED" as const,
        botUserId: botInfo.userId,
      };
    } catch (error) {
      await this.prisma.form.update({
        where: { id: formId },
        data: {
          lineOaBotUserId: null,
          lineOaSetupStatus: "PENDING",
        },
      });

      this.logger.warn(
        `LINE OA bot info discovery failed for form ${formId}; token=${maskLineOaToken(form.lineOaAccessToken)}`,
      );

      return {
        status: "PENDING" as const,
        botUserId: null,
        reasonCode:
          error instanceof LineOaDeliveryError
            ? error.code
            : "LINE_OA_SETUP_PENDING",
      };
    }
  }

  async sendLeadNotificationForSubmission(formSubmissionId: string) {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: formSubmissionId },
      include: {
        form: {
          include: {
            site: {
              include: {
                workspace: {
                  include: {
                    subscriptions: {
                      where: {
                        isCurrent: true,
                      },
                      include: {
                        plan: {
                          select: {
                            lineOaMonthlyQuota: true,
                          },
                        },
                      },
                      orderBy: {
                        createdAt: "desc",
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new LineOaDeliveryError({
        code: "LINE_OA_REQUEST_REJECTED",
        retryable: false,
      });
    }

    const delivery = await this.prisma.lineOaDelivery.upsert({
      where: {
        formSubmissionId: submission.id,
      },
      create: {
        formSubmissionId: submission.id,
        formId: submission.formId,
        status: "PENDING",
      },
      update: {},
    });

    if (delivery.status === "SENT" || delivery.status === "FALLBACK_SENT") {
      return delivery;
    }

    const quotaResult = await this.checkMonthlyQuota({
      workspaceId: submission.form.site.workspaceId,
      quota:
        submission.form.site.workspace.subscriptions[0]?.plan
          .lineOaMonthlyQuota ?? 5,
    });

    if (!quotaResult.allowed) {
      return this.markDeliverySkipped(delivery.id, "LINE_OA_QUOTA_REACHED");
    }

    const token = submission.form.lineOaAccessToken?.trim();
    const recipientId = submission.form.lineOaRecipientId?.trim();

    if (!token || !recipientId || submission.form.lineOaSetupStatus !== "VERIFIED") {
      const reasonCode =
        !token || submission.form.lineOaSetupStatus !== "VERIFIED"
          ? "LINE_OA_SETUP_PENDING"
          : "LINE_OA_RECIPIENT_MISSING";

      return this.markDeliverySkipped(delivery.id, reasonCode);
    }

    const contact = this.extractLeadContact(submission.data);
    const messages = this.buildLeadMessages({
      contact,
      createdAt: submission.createdAt,
      siteName: submission.form.site.name,
      dashboardUrl: this.buildDashboardLeadUrl(submission.form.siteId),
    });

    try {
      const result = await this.lineOaProvider.pushMessage({
        accessToken: token,
        to: recipientId,
        messages,
        retryKey: `line-oa-lead-${submission.id}`,
      });

      return this.prisma.lineOaDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          lineRequestId: result.lineRequestId,
          reasonCode: null,
          customerMessage: null,
          attemptCount: {
            increment: 1,
          },
          attemptedAt: new Date(),
          sentAt: new Date(),
          failedAt: null,
        },
      });
    } catch (error) {
      const normalized =
        error instanceof LineOaDeliveryError
          ? error
          : new LineOaDeliveryError({
              code: "LINE_OA_SERVER_ERROR",
              retryable: true,
            });

      await this.prisma.lineOaDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          reasonCode: normalized.code,
          customerMessage: normalized.customerMessage,
          lineRequestId: normalized.lineRequestId ?? null,
          attemptCount: {
            increment: 1,
          },
          attemptedAt: new Date(),
          failedAt: new Date(),
        },
      });

      throw normalized;
    }
  }

  private markDeliverySkipped(
    deliveryId: string,
    reasonCode: keyof typeof LINE_OA_DELIVERY_ERROR_CODES,
  ) {
    return this.prisma.lineOaDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "SKIPPED",
        reasonCode,
        customerMessage: LINE_OA_DELIVERY_ERROR_CODES[reasonCode].thaiMessage,
        attemptedAt: new Date(),
        failedAt: new Date(),
      },
    });
  }

  private async checkMonthlyQuota(input: {
    workspaceId: string;
    quota: number | null;
  }) {
    if (input.quota === null) {
      return {
        allowed: true,
        used: 0,
      };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const used = await this.prisma.lineOaDelivery.count({
      where: {
        status: "SENT",
        sentAt: {
          gte: monthStart,
          lt: monthEnd,
        },
        form: {
          site: {
            workspaceId: input.workspaceId,
          },
        },
      },
    });

    return {
      allowed: used < input.quota,
      used,
    };
  }

  private extractLeadContact(data: runtime.JsonValue): LeadContact {
    const record =
      typeof data === "object" && data !== null && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};

    return {
      name: this.pickString(record, ["name", "fullName", "fullname"]),
      phone: this.pickString(record, ["phone", "phoneNumber", "tel"]),
      email: this.pickString(record, ["email", "emailAddress"]),
      message: this.pickString(record, ["message", "detail", "note"]),
    };
  }

  private pickString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private buildLeadMessages(input: {
    contact: LeadContact;
    createdAt: Date;
    siteName: string;
    dashboardUrl: string;
  }): LineOaMessage[] {
    const contact = input.contact;
    const lines = [
      "FinnWeb Lead ใหม่",
      `เว็บไซต์: ${input.siteName}`,
      `ชื่อ: ${contact.name ?? "-"}`,
      `เบอร์: ${contact.phone ?? "-"}`,
      `อีเมล: ${contact.email ?? "-"}`,
      `ข้อความ: ${contact.message ?? "-"}`,
      `เวลา: ${input.createdAt.toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
      })}`,
      `Dashboard: ${input.dashboardUrl}`,
    ];

    return [
      {
        type: "text",
        text: lines.join("\n"),
      },
    ];
  }

  private buildDashboardLeadUrl(siteId: string) {
    const frontendUrl = process.env.FRONTEND_URL ?? "https://app.finnweb.site";
    return `${frontendUrl.replace(/\/+$/, "")}/sites/${siteId}/leads`;
  }
}
