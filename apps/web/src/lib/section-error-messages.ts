const SECTION_ERROR_CODE_TO_THAI: Record<string, string> = {
  SECTION_PROPS_INVALID: "ข้อมูล section ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  SECTION_PROPS_INVALID_TITLE: "ช่องหัวข้อไม่ถูกต้อง กรุณาใส่ข้อความใหม่",
  SECTION_PROPS_INVALID_SUBTITLE: "ช่องคำอธิบายไม่ถูกต้อง กรุณาใส่ข้อความใหม่",
  SECTION_PROPS_INVALID_BUTTON_TEXT:
    "ช่องข้อความปุ่มไม่ถูกต้อง กรุณาใส่ข้อความใหม่",
  SECTION_PROPS_INVALID_IMAGE_URL:
    "ลิงก์รูปภาพไม่ถูกต้อง ต้องเป็น http(s):// หรือขึ้นต้นด้วย /",
  SECTION_PROPS_INVALID_ALT_TEXT:
    "คำอธิบายรูปภาพไม่ถูกต้อง กรุณาใส่ข้อความใหม่",
  SECTION_PROPS_INVALID_LOGO:
    "โลโก้ไม่ถูกต้อง ต้องเป็น http(s):// หรือขึ้นต้นด้วย /",
  SECTION_PROPS_INVALID_MENU_ITEMS:
    "รายการเมนูไม่ถูกต้อง กรุณาตรวจสอบ label และลิงก์",
  SECTION_PROPS_INVALID_CTA:
    "ค่า CTA ไม่ถูกต้อง กรุณาตรวจสอบปุ่มเรียกใช้งาน",
  SECTION_PROPS_INVALID_LINKS:
    "ลิงก์ใน sidebar ไม่ถูกต้อง กรุณาตรวจสอบข้อมูล",
  SECTION_PROPS_INVALID_PROMOS:
    "บล็อกโปรโมชันไม่ถูกต้อง กรุณาตรวจสอบข้อมูล",
  SECTION_PROPS_INVALID_SUBMIT_LABEL:
    "ข้อความปุ่มส่งข้อมูลไม่ถูกต้อง",
  SECTION_PROPS_INVALID_CALENDAR_MODE:
    "โหมดปฏิทินไม่ถูกต้อง",
  SECTION_PROPS_INVALID_FIELDS:
    "รายการฟิลด์แบบฟอร์มไม่ถูกต้อง",
  SECTION_PROPS_INVALID_PLANS:
    "ข้อมูลแพ็กเกจเปรียบเทียบไม่ถูกต้อง",
  SECTION_PROPS_INVALID_ITEMS:
    "รายการเปรียบเทียบไม่ถูกต้อง",
  SECTION_PROPS_INVALID_SOURCE_MODE:
    "โหมดแหล่งข้อมูลไม่ถูกต้อง",
  SECTION_PROPS_INVALID_ITEM_LIMIT:
    "จำนวนรายการที่แสดงไม่ถูกต้อง",
  SECTION_PROPS_INVALID_BODY: "เนื้อหาหลักยาวเกินไปหรือรูปแบบไม่ถูกต้อง",
  SECTION_PROPS_INVALID_DESCRIPTION: "คำอธิบายยาวเกินไปหรือรูปแบบไม่ถูกต้อง",
};

type ApiErrorPayload = {
  message?: unknown;
  error?: {
    message?: unknown;
    code?: unknown;
  };
};

function toStringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function mapSectionErrorCodeToThai(errorCode: string) {
  if (SECTION_ERROR_CODE_TO_THAI[errorCode]) {
    return SECTION_ERROR_CODE_TO_THAI[errorCode];
  }

  if (
    errorCode.startsWith("SECTION_PROPS_INVALID_") &&
    errorCode.endsWith("_DEPTH")
  ) {
    return "ข้อมูลซ้อนกันลึกเกินไป กรุณาลดความซับซ้อนของข้อมูล";
  }

  if (
    errorCode.startsWith("SECTION_PROPS_INVALID_") &&
    errorCode.endsWith("_SIZE")
  ) {
    return "จำนวนข้อมูลมากเกินไป กรุณาลดจำนวนรายการ";
  }

  if (
    errorCode.startsWith("SECTION_PROPS_INVALID_") &&
    errorCode.endsWith("_LENGTH")
  ) {
    return "ข้อความยาวเกินกำหนด กรุณาย่อข้อความให้สั้นลง";
  }

  if (errorCode.startsWith("SECTION_PROPS_INVALID_")) {
    return "ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบค่าที่กรอก";
  }

  return errorCode;
}

export function resolveSectionApiErrorMessage(
  payload: unknown,
  fallback: string,
) {
  const apiPayload =
    typeof payload === "object" && payload !== null
      ? (payload as ApiErrorPayload)
      : null;

  const messageCode = toStringOrEmpty(apiPayload?.message);
  const nestedMessageCode = toStringOrEmpty(apiPayload?.error?.message);
  const nestedCode = toStringOrEmpty(apiPayload?.error?.code);

  const rawCode = messageCode || nestedMessageCode || nestedCode;

  if (!rawCode) {
    return fallback;
  }

  return mapSectionErrorCodeToThai(rawCode);
}
