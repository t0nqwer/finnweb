import { Body, Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { LineOaWebhookService } from "./line-oa-webhook.service";

@Controller("line-oa")
export class LineOaWebhookController {
  constructor(private readonly lineOaWebhookService: LineOaWebhookService) {}

  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("x-line-signature") signature: string | undefined,
    @Body() body: unknown,
  ) {
    if (!req.rawBody) {
      throw new Error("RAW_BODY_MISSING");
    }

    return this.lineOaWebhookService.handleWebhook({
      rawBody: req.rawBody,
      signature,
      body: this.normalizeBody(body),
    });
  }

  private normalizeBody(body: unknown) {
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      return body as {
        destination?: string;
        events?: Array<{
          type?: string;
          source?: {
            type?: string;
            userId?: string;
            groupId?: string;
            roomId?: string;
          };
        }>;
      };
    }

    return {};
  }
}
