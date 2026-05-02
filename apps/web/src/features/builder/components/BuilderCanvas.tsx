"use client";

import {
  getSectionRegistryEntry,
  type BuilderSection,
} from "../registry/section-registry";
import type { BuilderPreviewDevice } from "./DevicePreviewToggle";

type BuilderCanvasProps = {
  sections: BuilderSection[];
  selectedSectionId: string;
  device: BuilderPreviewDevice;
  onSelectSection: (sectionId: string) => void;
  isLoading?: boolean;
};

const CANVAS_WIDTH: Record<BuilderPreviewDevice, string> = {
  desktop: "max-w-5xl",
  tablet: "max-w-2xl",
  mobile: "max-w-[390px]",
};

export function BuilderCanvas({
  sections,
  selectedSectionId,
  device,
  onSelectSection,
  isLoading = false,
}: BuilderCanvasProps) {
  return (
    <div className="min-h-[560px] overflow-auto bg-[#151820] p-4 sm:p-6">
      <div
        className={`mx-auto min-h-full overflow-hidden rounded-lg border border-white/10 bg-[#F9FAFB] text-[#1A1C23] shadow-2xl shadow-black/20 transition-all ${CANVAS_WIDTH[device]}`}
      >
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Canvas - {device}
          </p>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Loading sections...
          </div>
        ) : null}

        {!isLoading && sections.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-kanit text-lg font-semibold text-[#1A1C23]">
              No sections on this page
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Add-section controls will be connected in a later builder task.
            </p>
          </div>
        ) : null}

        {!isLoading && sections.map((section) => {
          const selected = selectedSectionId === section.id;
          const hidden = section.isVisible === false;
          const registryEntry = getSectionRegistryEntry(section.type);
          const SectionComponent = registryEntry?.component;
          const sectionProps = {
            ...(registryEntry?.defaultProps ?? {}),
            ...section.props,
          };

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={`block w-full border-b text-left transition ${
                selected
                  ? "bg-[#FFF7E8] ring-2 ring-inset ring-[#FF8C00]"
                  : "bg-white hover:bg-slate-50"
              } ${selected ? "border-[#FF8C00]" : "border-slate-200"}`}
            >
              {hidden ? (
                <HiddenSectionPlaceholder section={section} />
              ) : SectionComponent ? (
                <SectionComponent props={sectionProps} />
              ) : (
                <UnknownSectionFallback section={section} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HiddenSectionPlaceholder({ section }: { section: BuilderSection }) {
  return (
    <div className="px-6 py-6 sm:px-10">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/70 p-4 text-slate-500">
        <p className="font-kanit text-base font-semibold text-slate-600">
          {section.label} is hidden
        </p>
        <p className="mt-1 text-xs leading-5">
          This section will not render normally until it is shown again.
        </p>
      </div>
    </div>
  );
}

function UnknownSectionFallback({ section }: { section: BuilderSection }) {
  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
        <p className="font-kanit text-lg font-semibold text-[#1A1C23]">
          Unknown section
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This section type is not registered yet:{" "}
          <span className="font-mono text-xs text-slate-800">
            {section.type}
          </span>
        </p>
      </div>
    </div>
  );
}
