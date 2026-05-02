import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MonitorIcon,
  PhoneIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptionLabel } from "../lib/template-matching";
import type {
  BusinessType,
  MainGoal,
  PreviewMode,
  SiteLanguage,
  SiteStyle,
  SiteTemplate,
  WizardState,
} from "../types/create-site.types";
import { TemplateCard } from "./TemplateCard";

type TemplateSelectStepProps = {
  wizard: WizardState;
  templates: SiteTemplate[];
  filteredTemplates: SiteTemplate[];
  selectedTemplate: SiteTemplate | null;
  selectedTemplateId: string | null;
  previewMode: PreviewMode;
  isLoadingTemplates: boolean;
  businessOptions: Array<{ id: BusinessType; label: string }>;
  goalOptions: Array<{ id: MainGoal; label: string }>;
  styleOptions: Array<{ id: SiteStyle; label: string }>;
  languageOptions: Array<{ id: SiteLanguage; label: string }>;
  canReview: boolean;
  onBack: () => void;
  onReview: () => void;
  onSelectTemplate: (templateId: string) => void;
  onPreviewModeChange: (previewMode: PreviewMode) => void;
};

export function TemplateSelectStep({
  wizard,
  templates,
  filteredTemplates,
  selectedTemplate,
  selectedTemplateId,
  previewMode,
  isLoadingTemplates,
  businessOptions,
  goalOptions,
  styleOptions,
  languageOptions,
  canReview,
  onBack,
  onReview,
  onSelectTemplate,
  onPreviewModeChange,
}: TemplateSelectStepProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-white/10 bg-[#11131A] p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          แก้ข้อมูลธุรกิจ
        </button>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Business
            </p>
            <p className="mt-1 font-kanit text-lg font-semibold">
              {wizard.businessName || "ยังไม่ได้กรอกชื่อธุรกิจ"}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-300">
            <span>{getOptionLabel(businessOptions, wizard.businessType)}</span>
            <span>{getOptionLabel(goalOptions, wizard.goal)}</span>
            <span>
              {getOptionLabel(styleOptions, wizard.style)} ·{" "}
              {getOptionLabel(languageOptions, wizard.language)}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <SearchIcon className="size-4 text-[#FFD700]" />
            Template matching
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            แสดงเทมเพลตที่ตรงกับประเภทธุรกิจและเป้าหมายก่อน ถ้าไม่มีจะแสดงตัวเลือกที่ใกล้เคียง
          </p>
        </div>
      </aside>

      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-kanit text-2xl font-semibold">
              เลือกเทมเพลตเริ่มต้น
            </h2>
            <p className="text-sm text-slate-400">
              เทมเพลตมาจาก API และสร้างเป็น section JSON ใน backend
            </p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-white/10 bg-white/[0.04] p-1">
            <Button
              type="button"
              size="sm"
              variant={previewMode === "desktop" ? "default" : "ghost"}
              onClick={() => onPreviewModeChange("desktop")}
              className={previewMode === "desktop" ? "bg-[#FF8C00]" : ""}
            >
              <MonitorIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={previewMode === "mobile" ? "default" : "ghost"}
              onClick={() => onPreviewModeChange("mobile")}
              className={previewMode === "mobile" ? "bg-[#FF8C00]" : ""}
            >
              <PhoneIcon className="size-4" />
            </Button>
          </div>
        </div>

        {isLoadingTemplates ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.035]"
              />
            ))}
          </div>
        ) : null}

        {!isLoadingTemplates && templates.length === 0 ? (
          <div className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 p-5">
            <p className="font-kanit text-lg font-semibold text-[#FFE27A]">
              ยังไม่มีเทมเพลตให้เลือก
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              กรุณา seed official templates หรือเช็ก API `/templates?scope=all`
              ก่อนสร้างเว็บไซต์แบบ template-first
            </p>
          </div>
        ) : null}

        {!isLoadingTemplates && filteredTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                previewMode={previewMode}
                onSelect={() => onSelectTemplate(template.id)}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="justify-start text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeftIcon className="size-4" />
            ย้อนกลับ
          </Button>
          <Button
            type="button"
            disabled={!canReview}
            onClick={onReview}
            className="h-11 bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
          >
            ตรวจสอบก่อนสร้าง
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
