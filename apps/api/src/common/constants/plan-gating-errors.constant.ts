/**
 * Plan gating error codes and messages for consistent limit enforcement.
 * Includes information for suggesting plan upgrades.
 */
export const PLAN_GATING_ERROR_CODES = {
  // Site limits
  SITE_LIMIT_REACHED: {
    code: "SITE_LIMIT_REACHED",
    defaultMessage:
      "You have reached the maximum number of websites for your plan",
    thaiMessage: "คุณถึงจำนวนสูงสุดของเว็บไซต์สำหรับแผนของคุณแล้ว",
  },

  // Page limits
  PAGE_LIMIT_REACHED: {
    code: "PAGE_LIMIT_REACHED",
    defaultMessage:
      "You have reached the maximum number of pages for this website",
    thaiMessage: "คุณถึงจำนวนสูงสุดของหน้าสำหรับเว็บไซต์นี้แล้ว",
  },

  // Section limits
  SECTION_LIMIT_REACHED: {
    code: "SECTION_LIMIT_REACHED",
    defaultMessage:
      "You have reached the maximum number of sections for this page",
    thaiMessage: "คุณถึงจำนวนสูงสุดของส่วนสำหรับหน้านี้แล้ว",
  },

  // Product limits (ecommerce)
  PRODUCT_LIMIT_REACHED: {
    code: "PRODUCT_LIMIT_REACHED",
    defaultMessage:
      "You have reached the maximum number of products for your plan",
    thaiMessage: "คุณถึงจำนวนสูงสุดของสินค้าสำหรับแผนของคุณแล้ว",
  },

  // Post limits (blog)
  POST_LIMIT_REACHED: {
    code: "POST_LIMIT_REACHED",
    defaultMessage:
      "You have reached the maximum number of posts for your plan",
    thaiMessage: "คุณถึงจำนวนสูงสุดของโพสต์สำหรับแผนของคุณแล้ว",
  },

  // Feature access
  FEATURE_NOT_AVAILABLE: {
    code: "FEATURE_NOT_AVAILABLE",
    defaultMessage: "This feature is not available in your current plan",
    thaiMessage: "คุณสมบัตินี้ไม่พร้อมใช้งานในแผนปัจจุบันของคุณ",
  },

  // LINE OA notification quota
  LINE_OA_QUOTA_REACHED: {
    code: "LINE_OA_QUOTA_REACHED",
    defaultMessage:
      "You have reached the monthly LINE OA notification quota for your plan",
    thaiMessage: "LINE OA quota for this month has been reached",
  },
};

/**
 * Maps error codes to the next recommended plan tier.
 * Used to suggest upgrades when limits are reached.
 */
export const PLAN_GATING_UPGRADE_HINTS: Record<
  string,
  { suggestedPlan: string; reason: string }
> = {
  SITE_LIMIT_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For more websites",
  },
  PAGE_LIMIT_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For more pages per website",
  },
  SECTION_LIMIT_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For more sections per page",
  },
  PRODUCT_LIMIT_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For product features",
  },
  POST_LIMIT_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For blog features",
  },
  FEATURE_NOT_AVAILABLE: {
    suggestedPlan: "BUSINESS",
    reason: "To unlock this feature",
  },
  LINE_OA_QUOTA_REACHED: {
    suggestedPlan: "BUSINESS",
    reason: "For unlimited LINE OA notifications",
  },
};
