import path from "node:path";
import dotenv from "dotenv";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  APP_NAME,
  BillingStripeEventPayload,
  JOB_NAMES,
  JOB_QUEUE_NAMES,
} from "@finnweb/shared";
import { BillingRepository } from "../../api/src/modules/billing/billing.repository";
import { BillingWebhookService } from "../../api/src/modules/billing/billing-webhook.service";
import { PrismaService } from "../../api/src/prisma/prisma.service";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
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

  billingWorker.on("ready", () => {
    console.log(`[worker] listening on queue: ${JOB_QUEUE_NAMES.billing}`);
  });

  billingWorker.on("completed", (job) => {
    console.log(`[worker] completed ${job.name}: ${job.data.eventId}`);
  });

  billingWorker.on("failed", (job, error) => {
    console.error(
      `[worker] failed ${job?.name ?? "unknown"}: ${job?.data.eventId ?? "unknown"}`,
      error,
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`[worker] shutting down on ${signal}`);
    await billingWorker.close().catch(() => undefined);
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
