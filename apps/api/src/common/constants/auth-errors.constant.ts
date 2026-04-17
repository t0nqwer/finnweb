/**
 * Auth error codes and messages for consistent error handling.
 * These codes can be translated on the frontend.
 */
export const AUTH_ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: {
    code: "INVALID_CREDENTIALS",
    defaultMessage: "Invalid email or password",
    thaiMessage: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  },
  USER_DISABLED: {
    code: "USER_DISABLED",
    defaultMessage: "User account is disabled",
    thaiMessage: "บัญชีผู้ใช้ถูกปิดใช้งาน",
  },
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    defaultMessage: "User not found",
    thaiMessage: "ไม่พบผู้ใช้",
  },
  USER_NOT_FOUND_OR_DISABLED: {
    code: "USER_NOT_FOUND_OR_DISABLED",
    defaultMessage: "User not found or disabled",
    thaiMessage: "ไม่พบผู้ใช้หรือบัญชีถูกปิดใช้งาน",
  },
  EMAIL_ALREADY_EXISTS: {
    code: "EMAIL_ALREADY_EXISTS",
    defaultMessage: "Email already registered",
    thaiMessage: "อีเมลนี้ลงทะเบียนไปแล้ว",
  },

  // Token/Session
  INVALID_REFRESH_TOKEN: {
    code: "INVALID_REFRESH_TOKEN",
    defaultMessage: "Invalid or expired refresh token",
    thaiMessage: "โทเค็นรีเฟรชไม่ถูกต้องหรือหมดอายุ",
  },
  SESSION_NOT_FOUND: {
    code: "SESSION_NOT_FOUND",
    defaultMessage: "Session not found",
    thaiMessage: "ไม่พบเซสชัน",
  },
  SESSION_REVOKED: {
    code: "SESSION_REVOKED",
    defaultMessage: "Session has been revoked",
    thaiMessage: "เซสชันถูกยกเลิก",
  },
  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    defaultMessage: "Session expired",
    thaiMessage: "เซสชันหมดอายุ",
  },

  // Password/Email verification
  INVALID_CURRENT_PASSWORD: {
    code: "INVALID_CURRENT_PASSWORD",
    defaultMessage: "Invalid current password",
    thaiMessage: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
  },
  INVALID_OR_EXPIRED_VERIFICATION_TOKEN: {
    code: "INVALID_OR_EXPIRED_VERIFICATION_TOKEN",
    defaultMessage: "Invalid or expired verification token",
    thaiMessage: "โทเค็นยืนยันไม่ถูกต้องหรือหมดอายุ",
  },
  INVALID_OR_EXPIRED_RESET_TOKEN: {
    code: "INVALID_OR_EXPIRED_RESET_TOKEN",
    defaultMessage: "Invalid or expired reset token",
    thaiMessage: "โทเค็นรีเซ็ตไม่ถูกต้องหรือหมดอายุ",
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    defaultMessage:
      "Too many attempts. Please try again later or contact support.",
    thaiMessage: "จำนวนครั้งของการลองเกินข้อจำกัด กรุณาลองอีกครั้งในภายหลัง",
  },
  RATE_LIMIT_LOGIN: {
    code: "RATE_LIMIT_EXCEEDED",
    defaultMessage:
      "Too many login attempts. Please try again after 15 minutes.",
    thaiMessage: "พยายาม login มากเกินไป กรุณาลองอีกครั้งหลังจาก 15 นาที",
  },
  RATE_LIMIT_PASSWORD_RESET: {
    code: "RATE_LIMIT_EXCEEDED",
    defaultMessage:
      "Too many password reset attempts. Please try again after 40 minutes.",
    thaiMessage:
      "พยายามรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองอีกครั้งหลังจาก 40 นาที",
  },
};

/**
 * Response method for errors that masks sensitive information.
 * Only returns error code and user-friendly message.
 */
export function createErrorResponse(code: string, message?: string) {
  return {
    error: code,
    message: message || "An error occurred. Please try again.",
  };
}
