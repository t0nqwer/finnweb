import { ArrowRightIcon, EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptionLabel } from "../lib/template-matching";
import type {
  BusinessType,
  MainGoal,
  SiteTemplate,
  WizardState,
} from "../types/create-site.types";

type ReviewCreateStepProps = {
  wizard: WizardState;
  selectedTemplate: SiteTemplate | null;
  isCreating: boolean;
  canCreate: boolean;
  normalizedLineId: string;
  businessOptions: Array<{ id: BusinessType; label: string }>;
  goalOptions: Array<{ id: MainGoal; label: string }>;
  onCreate: () => void;
  onChangeTemplate: () => void;
};

export function ReviewCreateStep({
  wizard,
  selectedTemplate,
  isCreating,
  canCreate,
  normalizedLineId,
  businessOptions,
  goalOptions,
  onCreate,
  onChangeTemplate,
}: ReviewCreateStepProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-lg border border-white/10 bg-[#2D2F39]/72 p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#FF8C00] text-white">
            <EyeIcon className="size-5" />
          </span>
          <div>
            <h2 className="font-kanit text-2xl font-semibold">
              ตรวจสอบ flow ก่อนสร้างเว็บ
            </h2>
            <p className="text-sm text-slate-400">
              หลังยืนยัน ระบบจะเรียก `POST /api/sites` พร้อม `templateId`
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#11131A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Business answers
            </p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">ชื่อธุรกิจ</dt>
                <dd className="font-medium text-white">{wizard.businessName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">ประเภท</dt>
                <dd className="text-slate-200">
                  {getOptionLabel(businessOptions, wizard.businessType)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">เป้าหมาย</dt>
                <dd className="text-slate-200">
                  {getOptionLabel(goalOptions, wizard.goal)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ติดต่อ</dt>
                <dd className="text-slate-200">
                  {[wizard.phone, normalizedLineId].filter(Boolean).join(" · ") ||
                    "ยังไม่ระบุ"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#11131A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Template install
            </p>
            {selectedTemplate ? (
              <div className="mt-3 space-y-3">
                <p className="font-kanit text-xl font-semibold">
                  {selectedTemplate.name}
                </p>
                <p className="text-sm leading-relaxed text-slate-400">
                  {selectedTemplate.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
                    {selectedTemplate.pages.length} หน้า
                  </span>
                  <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
                    {selectedTemplate.sectionCount} sections
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                ยังไม่ได้เลือกเทมเพลต
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-[#FFD700]/25 bg-[#FFD700]/8 p-4">
          <p className="font-kanit text-lg font-semibold text-[#FFE27A]">
            สิ่งที่จะเกิดขึ้นหลังสร้าง
          </p>
          <div className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300 md:grid-cols-2">
            <span>1. สร้าง Site ใน workspace ปัจจุบัน</span>
            <span>2. ติดตั้ง Page และ Section จากเทมเพลต</span>
            <span>3. แทนค่า placeholder ด้วยข้อมูลธุรกิจ</span>
            <span>4. เปิด builder เพื่อแก้ draft และ publish ต่อ</span>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-white/10 bg-[#11131A] p-5">
        <h2 className="font-kanit text-xl font-semibold">พร้อมสร้าง</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          MVP นี้ไม่เปิด raw JSON ให้ผู้ใช้ทั่วไป และไม่สร้าง section ฝั่ง client
        </p>

        <div className="mt-5 space-y-3">
          <Button
            type="button"
            disabled={!canCreate}
            onClick={onCreate}
            className="h-12 w-full bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
          >
            {isCreating ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                กำลังสร้างเว็บไซต์
              </>
            ) : (
              <>
                สร้างและเปิด builder
                <ArrowRightIcon className="size-4" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onChangeTemplate}
            className="w-full text-slate-300 hover:bg-white/10 hover:text-white"
          >
            เปลี่ยนเทมเพลต
          </Button>
        </div>
      </aside>
    </section>
  );
}
