import { CheckCircle2Icon, SparklesIcon } from "lucide-react";
import { DEFAULT_TEMPLATE_IMAGE } from "../lib/normalize-template";
import type { PreviewMode, SiteTemplate } from "../types/create-site.types";

type TemplateCardProps = {
  template: SiteTemplate;
  selected: boolean;
  previewMode: PreviewMode;
  isRecommended?: boolean;
  onSelect: () => void;
};

export function TemplateCard({
  template,
  selected,
  previewMode,
  isRecommended,
  onSelect,
}: TemplateCardProps) {
  const homePage =
    template.pages.find((page) => page.isHomePage) ?? template.pages[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`overflow-hidden rounded-lg border text-left transition ${
        selected
          ? "border-[#FF8C00] bg-[#FF8C00]/10"
          : "border-white/10 bg-[#2D2F39]/70 hover:border-[#FF8C00]/45"
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          previewMode === "mobile"
            ? "mx-auto mt-4 aspect-[9/14] w-[54%] rounded-lg"
            : "aspect-[16/10]"
        } bg-[#11131A]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnailUrl ?? DEFAULT_TEMPLATE_IMAGE}
          alt={template.name}
          className="h-full w-full object-cover opacity-90 transition duration-500 hover:scale-105"
        />

        {/* Recommended badge */}
        {isRecommended ? (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#FF8C00] px-2 py-0.5 text-[11px] font-semibold text-white shadow">
            <SparklesIcon className="size-3" />
            แนะนำ
          </div>
        ) : null}

        {/* Free / Paid badge */}
        <div
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            template.isFree
              ? "bg-emerald-500/90 text-white"
              : "bg-slate-700/80 text-slate-200"
          }`}
        >
          {template.isFree ? "ฟรี" : "พรีเมียม"}
        </div>

        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[#11131A]/82 p-2 backdrop-blur">
          <p className="line-clamp-1 text-xs font-semibold text-white">
            {homePage?.title ?? "Home page"}
          </p>
          <p className="text-[11px] text-slate-300">
            {template.sectionCount} sections
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-kanit text-lg font-semibold leading-snug">
              {template.name}
            </p>
            <p className="mt-1 text-xs text-[#FFD700]">
              {template.categoryLabel}
            </p>
          </div>
          {selected ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-[#FFD700]" />
          ) : null}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {(homePage?.sectionTypes ?? []).slice(0, 6).map((sectionType) => (
            <span
              key={`${template.id}-${sectionType}`}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300"
            >
              {sectionType}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
