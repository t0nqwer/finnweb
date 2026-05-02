"use client";

import type { ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ContactIcon,
  CopyIcon,
  GripVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  Layers3Icon,
  LayoutIcon,
  MessageSquareTextIcon,
  PlusIcon,
  Rows3Icon,
  Trash2Icon,
} from "lucide-react";
import type {
  BuilderSection,
  SectionType,
} from "../registry/section-registry";

const SECTION_ICONS: Partial<Record<SectionType, typeof LayoutIcon>> = {
  "hero.splitImage": LayoutIcon,
  "features.grid": Rows3Icon,
  "contact.lineCta": ContactIcon,
  "footer.simple": MessageSquareTextIcon,
};

type SectionListPanelProps = {
  sections: BuilderSection[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onToggleVisibility: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
};

export function SectionListPanel({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleVisibility,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
}: SectionListPanelProps) {
  return (
    <aside className="min-h-0 border-b border-white/10 bg-[#20232C] p-4 lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Section List
          </p>
          <h2 className="font-kanit text-lg font-semibold">Page sections</h2>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[#FFD700]">
          <Layers3Icon className="size-5" />
        </span>
      </div>

      <button
        type="button"
        className="mb-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#FF8C00]/45 bg-[#FF8C00]/8 text-sm font-medium text-[#FFD700] transition hover:bg-[#FF8C00]/12"
      >
        <PlusIcon className="size-4" />
        Add section
      </button>

      <div className="space-y-2">
        {sections.map((section, index) => {
          const selected = selectedSectionId === section.id;
          const hidden = section.isVisible === false;
          const Icon =
            SECTION_ICONS[section.type as SectionType] ?? Layers3Icon;

          return (
            <div
              key={section.id}
              className={`rounded-lg border transition ${
                selected
                  ? "border-[#FF8C00]/70 bg-[#FF8C00]/12 text-white"
                  : "border-white/10 bg-[#1A1C23] text-slate-300 hover:border-white/20"
              } ${hidden ? "opacity-60" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectSection(section.id)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <GripVerticalIcon className="size-4 shrink-0 text-slate-600" />
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-[#FF8C00] text-white"
                      : "bg-white/[0.06] text-[#FFB347]"
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block truncate text-sm font-medium">
                      {section.label}
                    </span>
                    {hidden ? (
                      <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                        Hidden
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Section {index + 1}
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-1 border-t border-white/10 px-3 py-2">
                <SectionActionButton
                  label="Move section up"
                  onClick={() => onMoveSection(section.id, "up")}
                  disabled={index === 0}
                >
                  <ArrowUpIcon className="size-3.5" />
                </SectionActionButton>
                <SectionActionButton
                  label="Move section down"
                  onClick={() => onMoveSection(section.id, "down")}
                  disabled={index === sections.length - 1}
                >
                  <ArrowDownIcon className="size-3.5" />
                </SectionActionButton>
                <SectionActionButton
                  label={hidden ? "Show section" : "Hide section"}
                  onClick={() => onToggleVisibility(section.id)}
                >
                  {hidden ? (
                    <EyeIcon className="size-3.5" />
                  ) : (
                    <EyeOffIcon className="size-3.5" />
                  )}
                </SectionActionButton>
                <SectionActionButton
                  label="Duplicate section placeholder"
                  onClick={() => onDuplicateSection(section.id)}
                >
                  <CopyIcon className="size-3.5" />
                </SectionActionButton>
                <SectionActionButton
                  label="Delete section placeholder"
                  onClick={() => onDeleteSection(section.id)}
                  danger
                >
                  <Trash2Icon className="size-3.5" />
                </SectionActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function SectionActionButton({
  label,
  children,
  danger = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-8 items-center justify-center rounded-md border transition ${
        disabled
          ? "cursor-not-allowed border-white/5 text-slate-700"
          : danger
          ? "border-red-300/15 text-red-300 hover:bg-red-400/10"
          : "border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
