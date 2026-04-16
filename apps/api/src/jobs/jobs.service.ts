import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import {
  BillingStripeEventPayload,
  JOB_NAMES,
  JOB_QUEUE_NAMES,
} from "@finnweb/shared";

export type EnqueueResult = {
  queued: boolean;
  jobId: string | null;
};

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private connection: IORedis | null = null;
  private billingQueue: Queue<BillingStripeEventPayload> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.ensureBillingQueue();
  }

  async enqueueBillingStripeEvent(
    payload: BillingStripeEventPayload,
  ): Promise<EnqueueResult> {
    const queue = await this.ensureBillingQueue();

    if (!queue) {
      return {
        queued: false,
        jobId: null,
      };
    }

    const job = await queue.add(JOB_NAMES.billingStripeEvent, payload, {
      jobId: payload.eventId,
    });

    return {
      queued: true,
      jobId: job.id?.toString() ?? payload.eventId,
    };
  }

  private async ensureBillingQueue() {
    if (this.billingQueue) {
      return this.billingQueue;
    }

    const redisUrl = this.configService.get<string>("queue.redisUrl");

    if (!redisUrl) {
      this.logger.warn("Queue disabled because REDIS_URL is not configured.");
      return null;
    }

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });

      await this.connection.ping();

      this.billingQueue = new Queue<BillingStripeEventPayload>(
        JOB_QUEUE_NAMES.billing,
        {
          connection: this.connection,
          prefix: this.configService.get<string>("queue.prefix") ?? "finnweb",
          defaultJobOptions: {
            attempts:
              this.configService.get<number>("queue.defaultAttempts") ?? 3,
            backoff: {
              type: "exponential",
              delay: this.configService.get<number>("queue.backoffMs") ?? 5000,
            },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        },
      );

      this.logger.log(
        `Billing queue ready on ${JOB_QUEUE_NAMES.billing} (${redisUrl}).`,
      );

      return this.billingQueue;
    } catch (error) {
      this.logger.error("Failed to initialize BullMQ queue.", error);
      await this.connection?.quit().catch(() => undefined);
      this.connection = null;
      this.billingQueue = null;
      return null;
    }
  }

  async onModuleDestroy() {
    await this.billingQueue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
