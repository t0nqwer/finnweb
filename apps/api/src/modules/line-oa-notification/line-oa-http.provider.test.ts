import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConfigService } from "@nestjs/config";
import { LineOaDeliveryError } from "./line-oa-delivery.error";
import { LineOaHttpProvider } from "./line-oa-http.provider";

function makeConfig() {
  return {
    get<T>(key: string) {
      const values: Record<string, unknown> = {
        "lineOa.baseUrl": "https://line.test",
        "lineOa.timeoutMs": 10,
      };
      return values[key] as T;
    },
  } as ConfigService;
}

function makeProvider(fetchImpl: typeof fetch) {
  return new LineOaHttpProvider(makeConfig(), fetchImpl);
}

function successResponse(body = "") {
  return new Response(body, {
    status: 200,
    headers: {
      "x-line-request-id": "line-request-1",
    },
  });
}

describe("LineOaHttpProvider", () => {
  it("sends push messages through the LINE Messaging API", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = makeProvider(async (url, init) => {
      calls.push({ url: url.toString(), init: init ?? {} });
      return successResponse();
    });

    const result = await provider.pushMessage({
      accessToken: "secret-token",
      to: "U123",
      messages: [{ type: "text", text: "hello" }],
      retryKey: "line-oa-lead-submission-1",
    });

    assert.equal(result.lineRequestId, "line-request-1");
    assert.equal(calls[0].url, "https://line.test/v2/bot/message/push");
    assert.equal(
      (calls[0].init.headers as Record<string, string>).Authorization,
      "Bearer secret-token",
    );
    assert.equal(
      (calls[0].init.headers as Record<string, string>)["X-Line-Retry-Key"],
      "line-oa-lead-submission-1",
    );
  });

  it("normalizes 4xx auth errors without leaking the access token", async () => {
    const token = "secret-token-should-not-leak";
    const provider = makeProvider(async () =>
      new Response(JSON.stringify({ message: token }), {
        status: 401,
        headers: { "x-line-request-id": "line-request-auth" },
      }),
    );

    await assert.rejects(
      () =>
        provider.pushMessage({
          accessToken: token,
          to: "U123",
          messages: [{ type: "text", text: "hello" }],
        }),
      (error) => {
        assert.ok(error instanceof LineOaDeliveryError);
        assert.equal(error.code, "LINE_OA_TOKEN_INVALID");
        assert.equal(error.retryable, false);
        assert.equal(error.lineRequestId, "line-request-auth");
        assert.equal(error.message.includes(token), false);
        assert.equal(error.customerMessage.includes(token), false);
        return true;
      },
    );
  });

  it("normalizes 5xx errors as retryable server failures", async () => {
    const provider = makeProvider(async () => new Response("", { status: 503 }));

    await assert.rejects(
      () =>
        provider.pushMessage({
          accessToken: "secret-token",
          to: "U123",
          messages: [{ type: "text", text: "hello" }],
        }),
      (error) => {
        assert.ok(error instanceof LineOaDeliveryError);
        assert.equal(error.code, "LINE_OA_SERVER_ERROR");
        assert.equal(error.retryable, true);
        return true;
      },
    );
  });

  it("normalizes timeout failures as retryable", async () => {
    const provider = makeProvider(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    await assert.rejects(
      () =>
        provider.pushMessage({
          accessToken: "secret-token",
          to: "U123",
          messages: [{ type: "text", text: "hello" }],
        }),
      (error) => {
        assert.ok(error instanceof LineOaDeliveryError);
        assert.equal(error.code, "LINE_OA_TIMEOUT");
        assert.equal(error.retryable, true);
        return true;
      },
    );
  });

  it("normalizes 429 as retryable rate limiting", async () => {
    const provider = makeProvider(async () => new Response("", { status: 429 }));

    await assert.rejects(
      () =>
        provider.pushMessage({
          accessToken: "secret-token",
          to: "U123",
          messages: [{ type: "text", text: "hello" }],
        }),
      (error) => {
        assert.ok(error instanceof LineOaDeliveryError);
        assert.equal(error.code, "LINE_OA_RATE_LIMITED");
        assert.equal(error.retryable, true);
        return true;
      },
    );
  });

  it("discovers bot info with a valid channel access token", async () => {
    const provider = makeProvider(async () =>
      successResponse(
        JSON.stringify({
          userId: "Ubot",
          basicId: "@finnweb",
          displayName: "FinnWeb OA",
        }),
      ),
    );

    const botInfo = await provider.getBotInfo("secret-token");

    assert.equal(botInfo.userId, "Ubot");
    assert.equal(botInfo.basicId, "@finnweb");
    assert.equal(botInfo.displayName, "FinnWeb OA");
  });
});
