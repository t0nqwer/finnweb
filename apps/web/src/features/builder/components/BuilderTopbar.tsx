"use client";

import {
  ArrowLeftIcon,
  ChevronDownIcon,
  EyeIcon,
  RocketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DevicePreviewToggle,
  type BuilderPreviewDevice,
} from "./DevicePreviewToggle";
import { SaveStatus, type SaveStatusState } from "./SaveStatus";
import type { SitePage } from "../api/builder.api";

type BuilderTopbarProps = {
  siteId: string;
  pages: SitePage[];
  selectedPageId: string;
  device: BuilderPreviewDevice;
  saveStatus: SaveStatusState;
  isPublishing?: boolean;
  publicUrl?: string | null;
  onPageChange: (pageId: string) => void;
  onDeviceChange: (device: BuilderPreviewDevice) => void;
  onRetrySave?: () => void;
  onPublish?: () => void;
};

export function BuilderTopbar({
  siteId,
  pages,
  selectedPageId,
  device,
  saveStatus,
  isPublishing = false,
  publicUrl,
  onPageChange,
  onDeviceChange,
  onRetrySave,
  onPublish,
}: BuilderTopbarProps) {
  return (
    <header className="flex min-h-16 flex-col gap-3 border-b border-white/10 bg-[#11131A] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <a
          href="/sites"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-[#FF8C00]/50 hover:text-white"
          aria-label="Back to sites"
        >
          <ArrowLeftIcon className="size-4" />
        </a>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-kanit text-lg font-semibold leading-tight">
              Site Builder
            </p>
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">
              {siteId}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Section-based editor shell
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative inline-flex h-9 items-center">
          <select
            value={selectedPageId}
            onChange={(event) => onPageChange(event.target.value)}
            disabled={pages.length === 0}
            className="h-9 min-w-36 appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 pr-8 text-sm text-slate-200 outline-none transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Select page"
          >
            {pages.length > 0 ? (
              pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))
            ) : (
              <option value="">No pages</option>
            )}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 size-4 text-slate-500" />
        </label>

        <DevicePreviewToggle value={device} onChange={onDeviceChange} />

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (publicUrl) {
              window.open(publicUrl, "_blank", "noreferrer");
            }
          }}
          disabled={!publicUrl}
          className="h-9 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
        >
          <EyeIcon className="size-4" />
          Preview
        </Button>
        <Button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="h-9 bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
        >
          <RocketIcon className="size-4" />
          {isPublishing ? "Publishing..." : "Publish"}
        </Button>

        <div className="ml-1">
          <SaveStatus status={saveStatus} onRetry={onRetrySave} />
        </div>
      </div>
    </header>
  );
}
