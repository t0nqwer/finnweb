import path from "node:path";
import dotenv from "dotenv";
import { Job, UnrecoverableError, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  APP_NAME,
  BillingStripeEventPayload,
  JOB_NAMES,
  JOB_QUEUE_NAMES,
  LineOaLeadNotificationPayload,
} from "@finnweb/shared";
import { BillingRepository } from "../../api/src/modules/billing/billing.repository";
import { BillingWebhookService } from "../../api/src/modules/billing/billing-webhook.service";
import { EmailService } from "../../api/src/modules/email/email.service";
import { LineOaHttpProvider } from "../../api/src/modules/line-oa-notification/line-oa-http.provider";
import { LineOaNotificationService } from "../../api/src/modules/line-oa-notification/line-oa-notification.service";
import { PrismaService } from "../../api/src/prisma/prisma.service";
import {
  handleLineOaLeadNotificationFailure,
  LINE_OA_QUEUE_LIMITER,
  processLineOaLeadNotificationJob,
} from "./line-oa-lead-notification.processor";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), "../api/.env"), quiet: true });
dotenv.config({ quiet: true });

async function main() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[worker] REDIS_URL missing; worker disabled for local dev");
      return;
    }

    throw new Error("REDIS_URL_MISSING");
  }

  console.log(`[${APP_NAME}] worker started`);

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  await connection.ping();

  const prisma = new PrismaService();
  await prisma.$connect();

  const billingRepository = new BillingRepository(prisma);
  const billingWebhookService = new BillingWebhookService(billingRepository);
  const configService = {
    get<T>(key: string) {
      const values: Record<string, unknown> = {
        "email.resendApiKey": process.env.RESEND_API_KEY,
        "email.from": process.env.EMAIL_FROM ?? "FinnWeb <no-reply@finnweb.site>",
        "lineOa.baseUrl": process.env.LINE_OA_API_BASE_URL ?? "https://api.line.me",
        "lineOa.timeoutMs": Number(process.env.LINE_OA_TIMEOUT_MS || 5000),
      };

      return values[key] as T;
    },
  };
  const lineOaProvider = new LineOaHttpProvider(configService as never);
  const lineOaNotificationService = new LineOaNotificationService(
    prisma,
    lineOaProvider,
  );
  const emailService = new EmailService(configService as never);

  const billingWorker = new Worker<BillingStripeEventPayload>(
    JOB_QUEUE_NAMES.billing,
    async (job: Job<BillingStripeEventPayload>) => {
      switch (job.name) {
        case JOB_NAMES.billingStripeEvent:
          await billingWebhookService.processQueuedEvent(job.data);
          return {
            eventId: job.data.eventId,
            processedAt: new Date().toISOString(),
          };

        default:
          console.warn(`[worker] unhandled job name: ${job.name}`);
          return null;
      }
    },
    {
      connection,
      prefix: process.env.QUEUE_PREFIX || "finnweb",
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    },
  );

  const lineOaWorker = new Worker<LineOaLeadNotificationPayload>(
    JOB_QUEUE_NAMES.lineOa,
    async (job: Job<LineOaLeadNotificationPayload>) => {
      switch (job.name) {
        case JOB_NAMES.lineOaLeadNotification:
          await processLineOaLeadNotificationJob({
            data: job.data,
            lineOaNotificationService,
          });
          return {
            formSubmissionId: job.data.formSubmissionId,
            processedAt: new Date().toISOString(),
          };

        default:
          console.warn(`[worker] unhandled LINE OA job name: ${job.name}`);
          return null;
      }
    },
    {
      connection,
      prefix: process.env.QUEUE_PREFIX || "finnweb",
      concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
      limiter: LINE_OA_QUEUE_LIMITER,
    },
  );

  billingWorker.on("ready", () => {
    console.log(`[worker] listening on queue: ${JOB_QUEUE_NAMES.billing}`);
  });

  lineOaWorker.on("ready", () => {
    console.log(`[worker] listening on queue: ${JOB_QUEUE_NAMES.lineOa}`);
  });

  billingWorker.on("completed", (job) => {
    console.log(`[worker] completed ${job.name}: ${job.data.eventId}`);
  });

  lineOaWorker.on("completed", (job) => {
    console.log(
      `[worker] completed ${job.name}: ${job.data.formSubmissionId}`,
    );
  });

  billingWorker.on("failed", (job, error) => {
    console.error(
      `[worker] failed ${job?.name ?? "unknown"}: ${job?.data.eventId ?? "unknown"}`,
      error,
    );
  });

  lineOaWorker.on("failed", (job, error) => {
    const formSubmissionId = job?.data.formSubmissionId;
    const maxAttempts = job?.opts.attempts ?? Number(process.env.QUEUE_DEFAULT_ATTEMPTS || 3);
    console.error(
      `[worker] failed ${job?.name ?? "unknown"}: ${formSubmissionId ?? "unknown"} (${error.name}:${error.message})`,
    );

    if (!formSubmissionId) {
      return;
    }

    if (
      job &&
      job.attemptsMade < maxAttempts &&
      !(error instanceof UnrecoverableError)
    ) {
      return;
    }

    void handleLineOaLeadNotificationFailure({
      formSubmissionId,
      prisma,
      emailService,
    }).catch((fallbackError: unknown) => {
      const message =
        fallbackError instanceof Error
          ? `${fallbackError.name}:${fallbackError.message}`
          : "unknown";
      console.error(
        `[worker] LINE OA fallback email failed: ${formSubmissionId} (${message})`,
      );
    });
  });

  const shutdown = async (signal: string) => {
    console.log(`[worker] shutting down on ${signal}`);
    await billingWorker.close().catch(() => undefined);
    await lineOaWorker.close().catch(() => undefined);
    await connection.quit().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exit(1);
});
