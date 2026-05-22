import crypto from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";

type LineWebhookEvent = {
  type?: string;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
};

type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};

@Injectable()
export class LineOaWebhookService {
  private readonly logger = new Logger(LineOaWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleWebhook(input: {
    rawBody: Buffer;
    signature?: string;
    body: LineWebhookBody;
  }) {
    const destination = input.body.destination?.trim();

    if (!destination) {
      throw new UnauthorizedException("LINE_OA_SIGNATURE_INVALID");
    }

    const form = await this.prisma.form.findFirst({
      where: {
        lineOaBotUserId: destination,
      },
      select: {
        id: true,
        lineOaChannelSecret: true,
      },
    });

    if (!form) {
      this.logger.warn(
        `LINE OA webhook destination not found: ${destination}`,
      );
      return {
        ok: true,
      };
    }

    if (
      !form.lineOaChannelSecret?.trim() ||
      !this.verifySignature({
        rawBody: input.rawBody,
        channelSecret: form.lineOaChannelSecret,
        signature: input.signature,
      })
    ) {
      throw new UnauthorizedException("LINE_OA_SIGNATURE_INVALID");
    }

    for (const event of input.body.events ?? []) {
      await this.captureFollowRecipient(form.id, event);
    }

    return {
      ok: true,
    };
  }

  private async captureFollowRecipient(formId: string, event: LineWebhookEvent) {
    if (event.type !== "follow") {
      return;
    }

    const source = event.source;
    const recipient = this.pickRecipient(source);

    if (!recipient) {
      return;
    }

    await this.prisma.form.update({
      where: {
        id: formId,
      },
      data: {
        lineOaRecipientId: recipient.id,
        lineOaRecipientType: recipient.type,
        lineOaSetupStatus: "VERIFIED",
      },
    });
  }

  private pickRecipient(source?: LineWebhookEvent["source"]) {
    if (!source) {
      return null;
    }

    if (source.type === "user" && source.userId) {
      return {
        id: source.userId,
        type: "USER" as const,
      };
    }

    if (source.type === "group" && source.groupId) {
      return {
        id: source.groupId,
        type: "GROUP" as const,
      };
    }

    if (source.type === "room" && source.roomId) {
      return {
        id: source.roomId,
        type: "ROOM" as const,
      };
    }

    return null;
  }

  private verifySignature(input: {
    rawBody: Buffer;
    channelSecret: string;
    signature?: string;
  }) {
    if (!input.signature?.trim()) {
      return false;
    }

    const expected = crypto
      .createHmac("sha256", input.channelSecret)
      .update(input.rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(input.signature);

    return (
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }
}
