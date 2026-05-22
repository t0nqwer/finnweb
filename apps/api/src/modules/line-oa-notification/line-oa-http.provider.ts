import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LINE_OA_DELIVERY_ERROR_CODES } from "../../common/constants/line-oa-delivery-errors.constant";
import { LineOaDeliveryError } from "./line-oa-delivery.error";
import {
  LineOaBotInfo,
  LineOaProvider,
  LineOaPushInput,
  LineOaPushResult,
} from "./line-oa-message.types";

type FetchLike = typeof fetch;

@Injectable()
export class LineOaHttpProvider implements LineOaProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(configService: ConfigService, fetchImpl: FetchLike = fetch) {
    this.baseUrl =
      configService.get<string>("lineOa.baseUrl") ?? "https://api.line.me";
    this.timeoutMs = configService.get<number>("lineOa.timeoutMs") ?? 5000;
    this.fetchImpl = fetchImpl;
  }

  async pushMessage(input: LineOaPushInput): Promise<LineOaPushResult> {
    const response = await this.requestWithTimeout(
      `${this.baseUrl}/v2/bot/message/push`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
          ...(input.retryKey ? { "X-Line-Retry-Key": input.retryKey } : {}),
        },
        body: JSON.stringify({
          to: input.to,
          messages: input.messages,
        }),
      },
    );

    if (!response.ok) {
      throw this.normalizeLineError(response);
    }

    return {
      lineRequestId: this.getLineRequestId(response),
    };
  }

  async getBotInfo(accessToken: string): Promise<LineOaBotInfo> {
    const response = await this.requestWithTimeout(`${this.baseUrl}/v2/bot/info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw this.normalizeLineError(response);
    }

    const body = (await response.json()) as Partial<LineOaBotInfo>;

    if (!body.userId) {
      throw new LineOaDeliveryError({
        code: "LINE_OA_REQUEST_REJECTED",
        retryable: LINE_OA_DELIVERY_ERROR_CODES.LINE_OA_REQUEST_REJECTED.retryable,
        lineRequestId: this.getLineRequestId(response),
      });
    }

    return {
      userId: body.userId,
      basicId: body.basicId,
      displayName: body.displayName,
      pictureUrl: body.pictureUrl,
      chatMode: body.chatMode,
      markAsReadMode: body.markAsReadMode,
    };
  }

  private async requestWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof LineOaDeliveryError) {
        throw error;
      }

      const isTimeout =
        error instanceof DOMException
          ? error.name === "AbortError"
          : error instanceof Error && error.name === "AbortError";

      throw new LineOaDeliveryError({
        code: isTimeout ? "LINE_OA_TIMEOUT" : "LINE_OA_SERVER_ERROR",
        retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeLineError(response: Response) {
    const lineRequestId = this.getLineRequestId(response);

    if (response.status === 401 || response.status === 403) {
      return new LineOaDeliveryError({
        code: "LINE_OA_TOKEN_INVALID",
        retryable: false,
        statusCode: response.status,
        lineRequestId,
      });
    }

    if (response.status === 429) {
      return new LineOaDeliveryError({
        code: "LINE_OA_RATE_LIMITED",
        retryable: true,
        statusCode: response.status,
        lineRequestId,
      });
    }

    if (response.status >= 500) {
      return new LineOaDeliveryError({
        code: "LINE_OA_SERVER_ERROR",
        retryable: true,
        statusCode: response.status,
        lineRequestId,
      });
    }

    return new LineOaDeliveryError({
      code: "LINE_OA_REQUEST_REJECTED",
      retryable: false,
      statusCode: response.status,
      lineRequestId,
    });
  }

  private getLineRequestId(response: Response) {
    return (
      response.headers.get("x-line-request-id") ??
      response.headers.get("X-Line-Request-Id")
    );
  }
}
