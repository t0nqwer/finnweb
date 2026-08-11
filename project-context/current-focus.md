# Current Focus

Updated: 2026-08-11 (code state verified at commit `6973b4e`, 2026-05-22 —
ไม่มี commit ใหม่หลังจากนั้น)

> Orchestrator session: read `strategy-roadmap.md` (why/priority) and
> `codex-review-rubric.md` (guardrails + how to review Codex) before prompting
> or reviewing Codex.

## Shipped since the previous focus note (2026-05-20)

- **Site builder output quality — ส่งมอบแล้ว** (commit `13b9ef5`, task
  `site-builder-visual-premium-motion-engine`): public renderer progressive
  enhancement (เนื้อหายังเห็นได้เมื่อไม่มี JS), scoped theme tokens จาก published
  snapshot + Deep Space default, first-party JSON-only motion directives บน GSAP
  ScrollTrigger, และ Thai premium aesthetic clinic showcase blueprint/theme/
  content pack. หัวข้อนี้ไม่ใช่ top priority แล้ว — เหลือเป็นงาน curation ต่อเนื่อง
  (เพิ่ม template คุณภาพสูงต่อ vertical) ไม่ใช่งานยกเครื่อง renderer.
- **LINE OA lead engine ส่งเข้า LINE ได้จริงแล้ว** (commit `6973b4e`, task
  `line-oa-send-path-real`): LINE Messaging API push ผ่าน per-form channel token,
  bot-info discovery, webhook + HMAC-SHA256 signature verification + follow-event
  recipient capture, quota ย้ายไปบังคับตอน send (FREE/BASIC เต็ม → `LineOaDelivery
  .status = SKIPPED` แต่ lead ยังบันทึกสำเร็จ; BUSINESS/PRO ไม่จำกัด), BullMQ async
  + idempotent `jobId`, fallback email หลัง retry หมด. รายละเอียด enforcement
  model อยู่ใน `line-oa-quota-rollout.md` (อัปเดตแล้ว 2026-05-22).

## Top priority: ทำให้ LINE OA engine ใช้งานได้จริงด้วยตัวเจ้าของเว็บ

- **ช่องว่างที่บล็อกอยู่ — ไม่มี owner-facing setup path.** `Form.lineOaAccessToken`,
  `lineOaSetupStatus`, recipient fields มีอยู่ใน Prisma + service layer เท่านั้น
  ไม่มี controller endpoint ใดเปิดให้ตั้งค่า (controller เดียวใน epic นี้คือ
  `POST /api/line-oa/webhook`) และไม่มี UI ใน builder/settings เลย
  (`apps/web/src` อ้างถึง LINE OA แค่ในหน้า marketing/plan catalog).
  แปลว่าตอนนี้ต่อ LINE OA ได้ทางเดียวคือเขียน token ลง DB ตรงๆ.
- เหตุผลเชิงกลยุทธ์: win-condition #1 คือ "LINE OA lead engine ที่ส่งจริง" — ตอนนี้
  ส่วน *ส่ง* เสร็จแล้ว แต่ SME ต่อเองไม่ได้ engine จึงยังพิสูจน์ thesis ไม่ได้
  และยังทดสอบกับ LINE OA จริงแบบ end-to-end ไม่ได้ด้วย.
- ขอบเขตที่เสนอ (ยังไม่ commit — รอเจ้าของยืนยัน): connect/disconnect endpoint
  ระดับ form + สถานะ setup, หน้า UI ตั้งค่าใน builder หรือ site settings,
  แสดง delivery status/reason code ให้เจ้าของเห็นว่า lead ส่งเข้า LINE สำเร็จไหม.
- โค้ดที่เกี่ยวข้อง: `apps/api/src/modules/line-oa/`,
  `apps/api/src/modules/line-oa-notification/`, `apps/api/src/modules/sites/
  site-lead.service.ts`, `apps/worker/src/line-oa-lead-notification.processor.ts`.

## Verification gap (ต้องรู้ก่อนเชื่อ test signal)

- Integration tests ทั้งชุดพึ่ง remote dev DB (DigitalOcean) — ตอนตรวจ 2026-08-11
  ต่อไม่ติด ทำให้ `pnpm --filter api test` ค้างเกิน 10 นาที และ worker test ทั้ง 6
  ตัวถูก cancel. regression signal ที่มีอยู่ตอนนี้มาจาก focused unit tests เท่านั้น
  (LINE sender/webhook/pages DTO/shared generator ผ่านหมด).
- `pnpm --filter web test` รันไม่ได้เลย: `apps/web` เรียก `tsx` แต่ไม่มีใน
  dependencies ของ package นั้น → `api-client.test.ts` ไม่เคยถูกรัน.
- `pnpm typecheck` ที่ root ข้าม `apps/web` ทั้งแอป (ไม่มี `typecheck` script) —
  web พึ่ง `next build` อย่างเดียว (build ผ่าน).
- `pnpm lint` แดงจาก error เดียวใน
  `apps/web/src/features/site-renderer/high-design/HighDesignMotion.tsx:442`
  (`react-hooks/set-state-in-effect`) + warning อีก 13 รายการ.
- งาน `integration-test-suite-mvp` ยังค้างสถานะ in-progress อยู่.

## Tech debt ที่บันทึกไว้จาก LINE OA commit

- `Form.lineOaAccessToken` เก็บเป็น plaintext at rest.
- worker import API services ตรงๆ (modular-monolith path) — ควรแยกใน hardening task.

## Known strategic gap (advisory, not yet committed)

- Business tier (฿490) ขายฟีเจอร์ที่ยังไม่ได้สร้าง: ecommerce, blog/content,
  analytics/tracking มีแค่ Prisma schema ไม่มี API module.
- ทิศทางที่คุยไว้ (ยังไม่สรุป): reposition เป็น "LINE lead engine",
  value metric เป็น lead-based, ดันรายปีลด churn, ช่องทาง reseller สำหรับ Pro.
