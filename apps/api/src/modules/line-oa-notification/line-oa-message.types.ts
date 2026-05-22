export type LineOaMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "flex";
      altText: string;
      contents: Record<string, unknown>;
    };

export type LineOaPushInput = {
  accessToken: string;
  to: string;
  messages: LineOaMessage[];
  retryKey?: string;
};

export type LineOaPushResult = {
  lineRequestId: string | null;
};

export type LineOaBotInfo = {
  userId: string;
  basicId?: string;
  displayName?: string;
  pictureUrl?: string;
  chatMode?: string;
  markAsReadMode?: string;
};

export const LINE_OA_PROVIDER = Symbol("LINE_OA_PROVIDER");

export interface LineOaProvider {
  pushMessage(input: LineOaPushInput): Promise<LineOaPushResult>;
  getBotInfo(accessToken: string): Promise<LineOaBotInfo>;
}
