export const LINE_OA_DELIVERY_ERROR_CODES = {
  LINE_OA_TOKEN_INVALID: {
    code: "LINE_OA_TOKEN_INVALID",
    thaiMessage:
      "โทเคน LINE OA ไม่ถูกต้องหรือหมดอายุ กรุณาออกโทเคนใหม่แล้วบันทึกอีกครั้ง",
    retryable: false,
  },
  LINE_OA_SETUP_PENDING: {
    code: "LINE_OA_SETUP_PENDING",
    thaiMessage:
      "การตั้งค่า LINE OA ยังไม่สมบูรณ์ กรุณาตรวจสอบ token, channel secret และเพิ่ม OA เป็นเพื่อน",
    retryable: false,
  },
  LINE_OA_RECIPIENT_MISSING: {
    code: "LINE_OA_RECIPIENT_MISSING",
    thaiMessage:
      "ยังไม่มีผู้รับ LINE OA สำหรับฟอร์มนี้ กรุณาเพิ่ม OA เป็นเพื่อนอีกครั้ง",
    retryable: false,
  },
  LINE_OA_QUOTA_REACHED: {
    code: "LINE_OA_QUOTA_REACHED",
    thaiMessage:
      "โควต้า LINE OA เดือนนี้เต็มแล้ว ระบบบันทึก lead ไว้แต่ไม่ได้ส่งแจ้งเตือน LINE",
    retryable: false,
  },
  LINE_OA_RATE_LIMITED: {
    code: "LINE_OA_RATE_LIMITED",
    thaiMessage:
      "LINE OA รับคำขอถี่เกินไป ระบบจะลองส่งแจ้งเตือนใหม่อีกครั้ง",
    retryable: true,
  },
  LINE_OA_TIMEOUT: {
    code: "LINE_OA_TIMEOUT",
    thaiMessage:
      "การเชื่อมต่อ LINE OA ใช้เวลานานเกินไป ระบบจะลองส่งแจ้งเตือนใหม่อีกครั้ง",
    retryable: true,
  },
  LINE_OA_SERVER_ERROR: {
    code: "LINE_OA_SERVER_ERROR",
    thaiMessage:
      "LINE OA ขัดข้องชั่วคราว ระบบจะลองส่งแจ้งเตือนใหม่อีกครั้ง",
    retryable: true,
  },
  LINE_OA_REQUEST_REJECTED: {
    code: "LINE_OA_REQUEST_REJECTED",
    thaiMessage:
      "LINE OA ปฏิเสธคำขอส่งแจ้งเตือน กรุณาตรวจสอบการตั้งค่า LINE OA",
    retryable: false,
  },
  LINE_OA_FALLBACK_EMAIL_MISSING: {
    code: "LINE_OA_FALLBACK_EMAIL_MISSING",
    thaiMessage:
      "ส่ง LINE OA ไม่สำเร็จ และยังไม่มีอีเมลสำรองสำหรับรับแจ้งเตือน",
    retryable: false,
  },
} as const;

export type LineOaDeliveryErrorCode =
  keyof typeof LINE_OA_DELIVERY_ERROR_CODES;

export function getLineOaDeliveryErrorMessage(
  code: LineOaDeliveryErrorCode,
) {
  return LINE_OA_DELIVERY_ERROR_CODES[code].thaiMessage;
}
