import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  RotateCcwIcon,
} from "lucide-react";

export type SaveStatusState = "saved" | "saving" | "unsaved" | "failed";

const STATUS_COPY: Record<SaveStatusState, string> = {
  saved: "Saved",
  saving: "Saving...",
  unsaved: "Unsaved",
  failed: "Save failed",
};

type SaveStatusProps = {
  status?: SaveStatusState;
  onRetry?: () => void;
};

export function SaveStatus({ status = "saved", onRetry }: SaveStatusProps) {
  const tone =
    status === "saved"
      ? "text-emerald-300"
      : status === "failed"
        ? "text-red-300"
        : "text-[#FFD700]";
  const Icon =
    status === "failed"
      ? AlertCircleIcon
      : status === "saving"
        ? LoaderCircleIcon
        : CheckCircle2Icon;

  return (
    <div className={`inline-flex items-center gap-2 text-xs ${tone}`}>
      <Icon
        className={`size-4 ${status === "saving" ? "animate-spin" : ""}`}
      />
      <span>{STATUS_COPY[status]}</span>
      {status === "failed" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-md border border-red-300/30 px-1.5 py-0.5 text-[11px] text-red-100 transition hover:bg-red-400/10"
        >
          <RotateCcwIcon className="size-3" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
