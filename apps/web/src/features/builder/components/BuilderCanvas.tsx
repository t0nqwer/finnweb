"use client";

import { useEffect, useRef } from "react";
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
  selectedSectionLabel?: string | null;
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
  selectedSectionLabel,
  device,
  onSelectSection,
  isLoading = false,
}: BuilderCanvasProps) {
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedSectionId) {
      return;
    }

    sectionRefs.current[selectedSectionId]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [selectedSectionId]);

  return (
    <div className="min-h-[calc(100vh-73px)] overflow-auto bg-[#12151D] p-3 sm:p-5">
      <div
        className={`mx-auto min-h-[760px] overflow-hidden rounded-xl border border-white/10 bg-[#F9FAFB] text-[#1A1C23] shadow-2xl shadow-black/25 transition-all ${CANVAS_WIDTH[device]}`}
      >
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-slate-200 bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Live canvas
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {selectedSectionLabel
                ? `Editing ${selectedSectionLabel}`
                : "Select a section to edit"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold capitalize text-slate-600 shadow-sm">
            {device} preview
          </span>
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
              ref={(node) => {
                sectionRefs.current[section.id] = node;
              }}
              onClick={() => onSelectSection(section.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSection(section.id);
                }
              }}
              role="button"
              tabIndex={0}
              className={`group relative block w-full border-b text-left outline-none transition ${
                selected
                  ? "bg-[#FFF8ED] ring-2 ring-inset ring-[#FF8C00]"
                  : "bg-white hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFB347]"
              } ${selected ? "border-[#FF8C00]" : "border-slate-200"}`}
            >
              {selected ? (
                <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full border border-[#FF8C00]/30 bg-[#11131A] px-3 py-1 text-xs font-semibold text-[#FFD700] shadow-lg shadow-black/20">
                  Selected
                </div>
              ) : null}
              {hidden ? (
                <HiddenSectionPlaceholder section={section} />
              ) : shouldUsePublicRenderer ? (
                <PublicSectionRenderer
                  sections={[publicSection]}
                  siteId="builder-preview"
                  pageId={section.pageId ?? "builder-page"}
                  showScrollProgress={false}
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
