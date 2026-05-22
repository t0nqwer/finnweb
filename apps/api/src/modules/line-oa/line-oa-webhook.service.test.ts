import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { LineOaWebhookService } from "./line-oa-webhook.service";

function sign(rawBody: Buffer, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
}

describe("LineOaWebhookService", () => {
  it("captures a follow user recipient when the signature is valid", async () => {
    const updates: unknown[] = [];
    const prisma = {
      form: {
        findFirst: async () => ({
          id: "form-1",
          lineOaChannelSecret: "channel-secret",
        }),
        update: async (input: unknown) => {
          updates.push(input);
          return input;
        },
      },
    };
    const service = new LineOaWebhookService(prisma as never);
    const body = {
      destination: "Ubot",
      events: [
        {
          type: "follow",
          source: {
            type: "user",
            userId: "Uowner",
          },
        },
      ],
    };
    const rawBody = Buffer.from(JSON.stringify(body));

    const result = await service.handleWebhook({
      rawBody,
      signature: sign(rawBody, "channel-secret"),
      body,
    });

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(updates[0], {
      where: { id: "form-1" },
      data: {
        lineOaRecipientId: "Uowner",
        lineOaRecipientType: "USER",
        lineOaSetupStatus: "VERIFIED",
      },
    });
  });

  it("rejects matched destinations with invalid signatures", async () => {
    const service = new LineOaWebhookService({
      form: {
        findFirst: async () => ({
          id: "form-1",
          lineOaChannelSecret: "channel-secret",
        }),
      },
    } as never);
    const body = {
      destination: "Ubot",
      events: [],
    };

    await assert.rejects(
      () =>
        service.handleWebhook({
          rawBody: Buffer.from(JSON.stringify(body)),
          signature: "bad-signature",
          body,
        }),
      (error) => error instanceof UnauthorizedException,
    );
  });

  it("returns ok for unknown destinations so LINE does not retry", async () => {
    const service = new LineOaWebhookService({
      form: {
        findFirst: async () => null,
      },
    } as never);
    const body = {
      destination: "Uunknown",
      events: [],
    };

    const result = await service.handleWebhook({
      rawBody: Buffer.from(JSON.stringify(body)),
      signature: "not-needed-without-a-known-secret",
      body,
    });

    assert.deepEqual(result, { ok: true });
  });
});
