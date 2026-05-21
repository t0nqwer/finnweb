# Current Focus

Updated: 2026-05-20

> Orchestrator session: read `strategy-roadmap.md` (why/priority) and
> `codex-review-rubric.md` (guardrails + how to review Codex) before prompting
> or reviewing Codex.

## Top priority: Site builder output quality

- ผลลัพธ์หน้าเว็บจาก builder ยัง "ไม่สวยพอ" และ motion ยังไม่ดึงดูด —
  ต้องยกระดับ visual quality + animation ให้ถึงมาตรฐาน DESIGN.md ("Ignition Console").
- เหตุผลเชิงกลยุทธ์: "เร็ว + สวย + lead เข้า LINE" คือจุดแข็งเดียวที่สู้คู่แข่งไทยได้
  (MakeWebEasy / LnwShop / Page365 ระบบครบกว่าอยู่แล้ว). ถ้า builder สร้างหน้าสวย
  ไม่ได้ จุดแข็งหลักของผลิตภัณฑ์พังทันที.
- ขอบเขต: ยกระดับ "ผลลัพธ์/section renderer/templates" ไม่ใช่ทำ editor ให้ซับซ้อน
  ตัว builder ต้องคงความเรียบง่าย schema-driven ตาม `site-builder-flow.md`.
- โค้ดที่เกี่ยวข้อง: `apps/web/src/features/builder/`,
  `apps/web/src/features/site-renderer/`, `PublicSectionRenderer`,
  `props.motion`/`MotionSection`, high-design variant path.

## Known strategic gap (advisory, not yet committed)

- Business tier (฿490) ขายฟีเจอร์ที่ยังไม่ได้สร้าง: ecommerce, blog/content,
  analytics/tracking มีแค่ Prisma schema ไม่มี API module.
- LINE OA — differentiator หลัก — ยังไม่ส่งจริง (เก็บ token + นับ quota เท่านั้น
  ยังไม่มี send path; ดู `line-oa-quota-rollout.md`).
- ทิศทางที่คุยไว้ (ยังไม่สรุป): reposition เป็น "LINE lead engine",
  value metric เป็น lead-based, ดันรายปีลด churn, ช่องทาง reseller สำหรับ Pro.
