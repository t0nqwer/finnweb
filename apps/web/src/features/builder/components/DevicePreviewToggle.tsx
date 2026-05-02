"use client";

import { MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react";

export type BuilderPreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICES: Array<{
  id: BuilderPreviewDevice;
  label: string;
  icon: typeof MonitorIcon;
}> = [
  { id: "desktop", label: "Desktop", icon: MonitorIcon },
  { id: "tablet", label: "Tablet", icon: TabletIcon },
  { id: "mobile", label: "Mobile", icon: SmartphoneIcon },
];

type DevicePreviewToggleProps = {
  value: BuilderPreviewDevice;
  onChange: (device: BuilderPreviewDevice) => void;
};

export function DevicePreviewToggle({
  value,
  onChange,
}: DevicePreviewToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1"
      aria-label="Device preview"
    >
      {DEVICES.map((device) => {
        const Icon = device.icon;
        const selected = value === device.id;

        return (
          <button
            key={device.id}
            type="button"
            onClick={() => onChange(device.id)}
            className={`inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs transition ${
              selected
                ? "bg-[#FF8C00] text-white"
                : "text-slate-400 hover:bg-white/8 hover:text-white"
            }`}
            aria-pressed={selected}
            title={device.label}
          >
            <Icon className="size-4" />
            <span className="hidden xl:inline">{device.label}</span>
          </button>
        );
      })}
    </div>
  );
}
