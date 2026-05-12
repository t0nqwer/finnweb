"use client";

import {
  getSectionRegistryEntry,
  type BuilderSection,
} from "../registry/section-registry";
import { PublicSectionRenderer } from "@/features/site-renderer/PublicSectionRenderer";
import type { PublicSection } from "@/features/site-renderer/public-site.api";
import type { BuilderPreviewDevice } from "./DevicePreviewToggle";

type BuilderCanvasProps = {
  sections: BuilderSection[];
  selectedSectionId: string;
  device: BuilderPreviewDevice;
  onSelectSection: (sectionId: string) => void;
  isLoading?: boolean;
};

const CANVAS_WIDTH: Record<BuilderPreviewDevice, string> = {
  desktop: "max-w-[1280px]",
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
              Use the section library on the left to add the first block.
            </p>
          </div>
        ) : null}

        {!isLoading && sections.map((section) => {
          const selected = selectedSectionId === section.id;
          const hidden = section.isVisible === false;
          const publicSection = toPublicSection(section);
          const shouldUsePublicRenderer = isHighDesignSection(section);
          const registryEntry = getSectionRegistryEntry(section.type);
          const SectionComponent = registryEntry?.component;
          const sectionProps = {
            ...(registryEntry?.defaultProps ?? {}),
            ...section.props,
          };

          return (
            <div
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSection(section.id);
                }
              }}
              role="button"
              tabIndex={0}
              className={`block w-full border-b text-left transition ${
                selected
                  ? "bg-[#FFF7E8] ring-2 ring-inset ring-[#FF8C00]"
                  : "bg-white hover:bg-slate-50"
              } ${selected ? "border-[#FF8C00]" : "border-slate-200"}`}
            >
              {hidden ? (
                <HiddenSectionPlaceholder section={section} />
              ) : shouldUsePublicRenderer ? (
                <PublicSectionRenderer
                  sections={[publicSection]}
                  siteId="builder-preview"
                  pageId={section.pageId ?? "builder-page"}
                />
              ) : SectionComponent ? (
                <SectionComponent props={sectionProps} />
              ) : (
                <UnknownSectionFallback section={section} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toPublicSection(section: BuilderSection): PublicSection {
  return {
    id: section.id,
    type: section.sourceType ?? section.type,
    name: section.label,
    sortOrder: section.sortOrder,
    isVisible: section.isVisible,
    props: section.props,
  };
}

function isHighDesignSection(section: BuilderSection) {
  const variant =
    typeof section.props.variant === "string" ? section.props.variant : "";
  if (
    [
      "stickyAnimated",
      "educationEditorial",
      "metricStrip",
      "featuredGrid",
      "bentoLearning",
      "bentoProof",
      "logoStrip",
      "categoryGrid",
      "insightsGrid",
      "splitAccordion",
      "floatingAvatars",
      "largeDark",
    ].includes(variant)
  ) {
    return true;
  }

  return section.type === section.sourceType && !getSectionRegistryEntry(section.type);
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
