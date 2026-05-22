import {
  getLineOaDeliveryErrorMessage,
  LineOaDeliveryErrorCode,
} from "../../common/constants/line-oa-delivery-errors.constant";

export class LineOaDeliveryError extends Error {
  readonly code: LineOaDeliveryErrorCode;
  readonly customerMessage: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly lineRequestId?: string | null;

  constructor(input: {
    code: LineOaDeliveryErrorCode;
    retryable: boolean;
    statusCode?: number;
    lineRequestId?: string | null;
  }) {
    super(input.code);
    this.name = "LineOaDeliveryError";
    this.code = input.code;
    this.customerMessage = getLineOaDeliveryErrorMessage(input.code);
    this.retryable = input.retryable;
    this.statusCode = input.statusCode;
    this.lineRequestId = input.lineRequestId ?? null;
  }
}
