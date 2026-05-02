import { CheckCircle2Icon } from "lucide-react";
import type { CreateStep } from "../types/create-site.types";

const STEPS: Array<{ id: CreateStep; label: string }> = [
  { id: "profile", label: "ข้อมูลธุรกิจ" },
  { id: "template", label: "เลือกเทมเพลต" },
  { id: "review", label: "สร้างเว็บไซต์" },
];

export function StepRail({ step }: { step: CreateStep }) {
  const activeIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((item, index) => {
        const isActive = item.id === step;
        const isDone = index < activeIndex;

        return (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              isActive
                ? "border-[#FF8C00] bg-[#FF8C00]/14 text-white"
                : isDone
                  ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFE27A]"
                  : "border-white/10 bg-white/[0.03] text-slate-400"
            }`}
          >
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-md bg-white/8 text-xs font-semibold">
              {isDone ? <CheckCircle2Icon className="size-4" /> : index + 1}
            </span>
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
