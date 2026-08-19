// ---------------------------------------------------------------------------
// SEO rules — a page nobody can find is not finished
//
// Technical SEO is free for every tier per strategy-roadmap.md, so these run
// on all sites rather than being gated behind a plan.
// ---------------------------------------------------------------------------

import type { QualityEmit, QualityPage } from "../page-quality.types";
import { trimmedString } from "../props";

const MAX_SEO_TITLE_LENGTH = 60;
const MIN_SEO_DESCRIPTION_LENGTH = 50;
const MAX_SEO_DESCRIPTION_LENGTH = 160;

export function checkPageSeo(
  page: QualityPage,
  basePath: string,
  emit: QualityEmit,
): void {
  // Draft pages are not indexed, so hold SEO to the publish moment only.
  if (page.isPublished === false) {
    return;
  }

  const seoTitle = trimmedString(page.seoTitle);
  const seoDescription = trimmedString(page.seoDescription);

  if (!seoTitle) {
    // Warning, not an error: the renderer falls back to the page title, so a
    // missing SEO title costs ranking rather than breaking the page. It still
    // keeps the score off 100 so "perfect" means perfect.
    emit({
      severity: "warning",
      code: "SEO_TITLE_MISSING",
      path: `${basePath}.seoTitle`,
      message: "Page has no SEO title; search results will fall back to the page title.",
      ownerMessage:
        "หน้านี้ยังไม่มีชื่อสำหรับ Google (SEO title) ทำให้ผลค้นหาแสดงชื่อที่ไม่ได้ตั้งใจ",
    });
  } else if (seoTitle.length > MAX_SEO_TITLE_LENGTH) {
    emit({
      severity: "warning",
      code: "SEO_TITLE_TOO_LONG",
      path: `${basePath}.seoTitle`,
      message: `SEO title is ${seoTitle.length} characters; Google truncates past ${MAX_SEO_TITLE_LENGTH}.`,
      ownerMessage: `ชื่อ SEO ยาว ${seoTitle.length} ตัวอักษร Google จะตัดทิ้งหลัง ${MAX_SEO_TITLE_LENGTH} ตัว`,
    });
  }

  if (!seoDescription) {
    emit({
      severity: "warning",
      code: "SEO_DESCRIPTION_MISSING",
      path: `${basePath}.seoDescription`,
      message: "Page has no SEO description.",
      ownerMessage:
        "หน้านี้ยังไม่มีคำอธิบายสำหรับ Google (SEO description) ทำให้คนเห็นในผลค้นหาแล้วไม่รู้ว่าเว็บขายอะไร",
    });
  } else if (
    seoDescription.length < MIN_SEO_DESCRIPTION_LENGTH ||
    seoDescription.length > MAX_SEO_DESCRIPTION_LENGTH
  ) {
    emit({
      severity: "warning",
      code: "SEO_DESCRIPTION_LENGTH",
      path: `${basePath}.seoDescription`,
      message: `SEO description is ${seoDescription.length} characters; aim for ${MIN_SEO_DESCRIPTION_LENGTH}–${MAX_SEO_DESCRIPTION_LENGTH}.`,
      ownerMessage: `คำอธิบาย SEO ยาว ${seoDescription.length} ตัวอักษร ควรอยู่ระหว่าง ${MIN_SEO_DESCRIPTION_LENGTH}–${MAX_SEO_DESCRIPTION_LENGTH} ตัว`,
    });
  }

  if (page.isHomePage && !trimmedString(page.ogImageUrl)) {
    emit({
      severity: "warning",
      code: "SEO_OG_IMAGE_MISSING",
      path: `${basePath}.ogImageUrl`,
      message: "Home page has no Open Graph image; shared links will render without a preview.",
      ownerMessage:
        "หน้าแรกยังไม่มีรูปพรีวิว เวลาแชร์ลิงก์ใน LINE หรือ Facebook จะไม่ขึ้นรูป",
    });
  }
}
