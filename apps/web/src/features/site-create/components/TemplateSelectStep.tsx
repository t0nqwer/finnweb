import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MonitorIcon,
  PhoneIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_TEMPLATE_FILTERS,
  applyTemplateFilters,
  getOptionLabel,
  isTemplateRecommended,
} from "../lib/template-matching";
import type { TemplateFilterState } from "../lib/template-matching";
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

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
        active
          ? "border-[#FF8C00] bg-[#FF8C00]/20 text-[#FFD700]"
          : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

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
  const [filters, setFilters] = useState<TemplateFilterState>(
    EMPTY_TEMPLATE_FILTERS,
  );
  const [searchQuery, setSearchQuery] = useState("");

  function toggleFilter<K extends keyof Omit<TemplateFilterState, "onlyFree">>(
    key: K,
    value: TemplateFilterState[K],
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  }

  const displayedTemplates = useMemo(
    () => applyTemplateFilters(filteredTemplates, filters, searchQuery),
    [filteredTemplates, filters, searchQuery],
  );

  const activeFilterCount = [
    filters.businessType,
    filters.goal,
    filters.style,
    filters.language,
    filters.onlyFree,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim() !== "";

  function clearFilters() {
    setFilters(EMPTY_TEMPLATE_FILTERS);
    setSearchQuery("");
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside className="h-fit space-y-5 rounded-lg border border-white/10 bg-[#11131A] p-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeftIcon className="size-4" />
          แก้ข้อมูลธุรกิจ
        </button>

        {/* Business summary */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Business
            </p>
            <p className="mt-1 font-kanit text-base font-semibold leading-snug">
              {wizard.businessName || "ยังไม่ได้กรอกชื่อธุรกิจ"}
            </p>
          </div>
          <div className="grid gap-1 text-xs text-slate-400">
            <span>{getOptionLabel(businessOptions, wizard.businessType)}</span>
            <span>{getOptionLabel(goalOptions, wizard.goal)}</span>
            <span>
              {getOptionLabel(styleOptions, wizard.style)} ·{" "}
              {getOptionLabel(languageOptions, wizard.language)}
            </span>
          </div>
        </div>

        <div className="border-t border-white/10" />

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              ตัวกรอง
              {activeFilterCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-[#FF8C00] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300"
              >
                <XIcon className="size-3" />
                ล้าง
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">ประเภทธุรกิจ</p>
              <div className="flex flex-wrap gap-1.5">
                {businessOptions.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={filters.businessType === opt.id}
                    label={opt.label}
                    onClick={() => toggleFilter("businessType", opt.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">เป้าหมาย</p>
              <div className="flex flex-wrap gap-1.5">
                {goalOptions.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={filters.goal === opt.id}
                    label={opt.label}
                    onClick={() => toggleFilter("goal", opt.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">สไตล์</p>
              <div className="flex flex-wrap gap-1.5">
                {styleOptions.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={filters.style === opt.id}
                    label={opt.label}
                    onClick={() => toggleFilter("style", opt.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">ภาษา</p>
              <div className="flex flex-wrap gap-1.5">
                {languageOptions.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={filters.language === opt.id}
                    label={opt.label}
                    onClick={() => toggleFilter("language", opt.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">ราคา</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={filters.onlyFree}
                  label="ฟรีเท่านั้น"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyFree: !prev.onlyFree,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
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

        {/* Search bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ คำอธิบาย หรือ tag..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-[#FF8C00]/50 focus:outline-none focus:ring-1 focus:ring-[#FF8C00]/30"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
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

        {!isLoadingTemplates && templates.length > 0 ? (
          <>
            {/* Result count */}
            {hasActiveFilters ? (
              <p className="text-sm text-slate-400">
                {displayedTemplates.length === 0
                  ? "ไม่พบเทมเพลตที่ตรงกับเงื่อนไข"
                  : `แสดง ${displayedTemplates.length} จาก ${templates.length} เทมเพลต`}
              </p>
            ) : null}

            {displayedTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {displayedTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    selected={selectedTemplateId === template.id}
                    previewMode={previewMode}
                    isRecommended={isTemplateRecommended(template, wizard)}
                    onSelect={() => onSelectTemplate(template.id)}
                  />
                ))}
              </div>
            ) : null}

            {/* No results from filters — show all as fallback */}
            {displayedTemplates.length === 0 && hasActiveFilters ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm text-slate-400">
                    ไม่พบเทมเพลตที่ตรงกับตัวกรอง —{" "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-[#FFD700] underline-offset-2 hover:underline"
                    >
                      ล้างตัวกรองทั้งหมด
                    </button>
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.slice(0, 3).map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={selectedTemplateId === template.id}
                      previewMode={previewMode}
                      isRecommended={isTemplateRecommended(template, wizard)}
                      onSelect={() => onSelectTemplate(template.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
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
