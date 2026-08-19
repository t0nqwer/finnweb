import { Injectable, Logger } from "@nestjs/common";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export type DeepSeekJsonResult<T> = {
  /** Parsed JSON object, or null when the call or the parse failed. */
  data: T | null;
  /** False whenever the caller must fall back to deterministic content. */
  usedAi: boolean;
  reason?: "disabled" | "http_error" | "empty" | "invalid_json";
};

/**
 * Single DeepSeek entry point for the whole API.
 *
 * Callers get a parsed object or a null with a reason — never a thrown error —
 * so every AI path is forced to have a deterministic fallback.
 */
@Injectable()
export class DeepSeekClient {
  private readonly logger = new Logger(DeepSeekClient.name);

  isEnabled() {
    return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  }

  async completeJson<T>({
    system,
    user,
    temperature = 0.2,
  }: {
    system: string;
    user: string;
    temperature?: number;
  }): Promise<DeepSeekJsonResult<T>> {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return { data: null, usedAi: false, reason: "disabled" };
    }

    const messages: DeepSeekMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const response = await fetch(
      process.env.DEEPSEEK_BASE_URL?.trim() ||
        "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
          temperature,
          response_format: { type: "json_object" },
          messages,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(
        `DeepSeek API failed: ${response.status} ${body.slice(0, 400)}`,
      );
      return { data: null, usedAi: false, reason: "http_error" };
    }

    const payload = (await response.json()) as DeepSeekResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { data: null, usedAi: false, reason: "empty" };
    }

    try {
      return { data: JSON.parse(content) as T, usedAi: true };
    } catch {
      this.logger.warn("DeepSeek returned content that was not valid JSON.");
      return { data: null, usedAi: false, reason: "invalid_json" };
    }
  }
}
