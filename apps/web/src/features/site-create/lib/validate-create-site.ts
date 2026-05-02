import type { WizardState } from "../types/create-site.types";

export type CreateSiteValidationErrors = Partial<
  Record<keyof WizardState, string>
>;

const THAIISH_PHONE_PATTERN = /^(?:0\d{8,9}|\+?66\d{8,9})$/;

function isBlank(value: string) {
  return value.trim().length === 0;
}

function isTooShort(value: string) {
  return value.trim().length > 0 && value.trim().length < 2;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeLineId(lineId: string) {
  const value = lineId.trim();

  if (!value) {
    return "";
  }

  return value.startsWith("@") ? value : `@${value}`;
}

export function validateCreateSiteWizard(
  wizard: WizardState,
): CreateSiteValidationErrors {
  const errors: CreateSiteValidationErrors = {};

  if (isBlank(wizard.businessName)) {
    errors.businessName = "กรุณากรอกชื่อธุรกิจ";
  } else if (isTooShort(wizard.businessName)) {
    errors.businessName = "ชื่อธุรกิจต้องมีอย่างน้อย 2 ตัวอักษร";
  }

  if (isBlank(wizard.siteName)) {
    errors.siteName = "กรุณากรอกชื่อเว็บไซต์";
  } else if (isTooShort(wizard.siteName)) {
    errors.siteName = "ชื่อเว็บไซต์ต้องมีอย่างน้อย 2 ตัวอักษร";
  }

  if (!wizard.businessType) {
    errors.businessType = "กรุณาเลือกประเภทธุรกิจ";
  }

  if (!wizard.goal) {
    errors.goal = "กรุณาเลือกเป้าหมายหลัก";
  }

  if (!wizard.style) {
    errors.style = "กรุณาเลือกสไตล์เว็บไซต์";
  }

  if (!wizard.language) {
    errors.language = "กรุณาเลือกภาษาเว็บไซต์";
  }

  const phone = wizard.phone.trim();
  const phoneForValidation = phone.replace(/[\s().-]/g, "");
  if (phone && !THAIISH_PHONE_PATTERN.test(phoneForValidation)) {
    errors.phone = "กรุณากรอกเบอร์โทรไทยให้ถูกต้อง เช่น 080-123-4567";
  }

  const logoUrl = wizard.logoUrl.trim();
  if (logoUrl && !isValidHttpUrl(logoUrl)) {
    errors.logoUrl = "กรุณากรอก URL โลโก้ที่ขึ้นต้นด้วย http:// หรือ https://";
  }

  return errors;
}

export function hasCreateSiteValidationErrors(
  errors: CreateSiteValidationErrors,
) {
  return Object.keys(errors).length > 0;
}
