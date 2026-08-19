"use client";

import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import type { QualityIssue, QualityReport } from "@finnweb/shared";
import type { SiteQualityResult } from "../api/builder.api";
import type { BuilderSection } from "../registry/section-registry";
import { sectionIdOfIssue } from "../lib/page-quality";

type QualityPanelProps = {
  onGenerateContent?: () => void;
  isGeneratingContent?: boolean;
  report: QualityReport | SiteQualityResult;
  /** "site" when the report came back from a refused publish. */
  scope?: "page" | "site";
  sections: BuilderSection[];
  onSelectSection: (sectionId: string) => void;
};

/** Deep Space surface, Ignite Orange reserved for the primary action elsewhere. */
const containerClassName =
  "flex max-h-72 flex-col gap-2 overflow-y-auto border-t border-white/10 bg-[#20232C] p-3";

export function QualityPanel({
  report,
  scope = "page",
  sections,
  onSelectSection,
  onGenerateContent,
  isGeneratingContent = false,
}: QualityPanelProps) {
  const { errorCount, warningCount } = report.summary;

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {scope === "site" ? "คุณภาพทั้งเว็บไซต์" : "คุณภาพหน้านี้"}
        </p>
        <span
          className={
            report.passed
              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300"
              : "rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300"
          }
          title={`คะแนน ${report.score} จาก 100`}
        >
          {report.score}/100
        </span>
      </div>

      {onGenerateContent ? (
        <button
          type="button"
          onClick={onGenerateContent}
          disabled={isGeneratingContent}
          className={
            isGeneratingContent
              ? "cursor-not-allowed rounded-lg border border-white/5 px-3 py-2 text-sm leading-[1.7] text-slate-500"
              : "rounded-lg border border-white/10 px-3 py-2 text-sm leading-[1.7] text-slate-200 transition hover:border-white/25 hover:bg-white/[0.06]"
          }
        >
          {isGeneratingContent
            ? "กำลังให้ AI เขียนข้อความ..."
            : "ให้ AI ช่วยเขียนข้อความไทย"}
        </button>
      ) : null}

      {report.issues.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-sm leading-[1.7] text-emerald-100">
          <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />
          หน้านี้พร้อมเผยแพร่แล้ว
        </p>
      ) : (
        <>
          <p className="text-xs leading-[1.7] text-slate-400">
            {errorCount > 0
              ? `ต้องแก้ ${errorCount} จุดก่อนเผยแพร่`
              : "เผยแพร่ได้แล้ว แต่ยังปรับให้ดีขึ้นได้"}
            {warningCount > 0 ? ` · ข้อแนะนำ ${warningCount} จุด` : ""}
          </p>

          <ul className="flex flex-col gap-1.5">
            {report.issues.map((issue) => (
              <QualityIssueRow
                key={`${issue.code}-${issue.path}`}
                issue={issue}
                // A site-scoped path indexes sections within *its* page, which
                // is not necessarily the page open in the editor, so only the
                // page-scoped report can safely jump to a section.
                sectionId={
                  scope === "page" ? sectionIdOfIssue(issue, sections) : null
                }
                onSelectSection={onSelectSection}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function QualityIssueRow({
  issue,
  sectionId,
  onSelectSection,
}: {
  issue: QualityIssue;
  sectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}) {
  const isError = issue.severity === "error";
  const Icon = isError ? XCircleIcon : AlertTriangleIcon;

  const body = (
    <span className="flex items-start gap-2">
      <Icon
        className={
          isError
            ? "mt-0.5 size-4 shrink-0 text-red-400"
            : "mt-0.5 size-4 shrink-0 text-amber-400"
        }
        aria-hidden
      />
      <span className="text-sm leading-[1.7] text-slate-200">
        {issue.ownerMessage}
      </span>
    </span>
  );

  const className = isError
    ? "rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-left"
    : "rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-left";

  return (
    <li>
      {sectionId ? (
        <button
          type="button"
          onClick={() => onSelectSection(sectionId)}
          className={`${className} w-full transition hover:border-white/25`}
        >
          {body}
        </button>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}
