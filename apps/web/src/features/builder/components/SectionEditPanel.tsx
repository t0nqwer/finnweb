"use client";

import { PanelRightIcon, SlidersHorizontalIcon } from "lucide-react";
import {
  getSectionRegistryEntry,
  type BuilderSection,
} from "../registry/section-registry";
import type {
  EditorFieldValue,
  EditorSchemaField,
} from "../types/editor-schema.types";

type SectionEditPanelProps = {
  section: BuilderSection | null;
  onChangeProps: (
    sectionId: string,
    nextProps: Record<string, unknown>,
  ) => void;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-white/10 bg-[#1A1C23] px-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#FF8C00]/70";

export function SectionEditPanel({
  section,
  onChangeProps,
}: SectionEditPanelProps) {
  const registryEntry = section
    ? getSectionRegistryEntry(section.type)
    : undefined;
  const editorSchema = registryEntry?.editorSchema ?? [];
  const values = {
    ...(registryEntry?.defaultProps ?? {}),
    ...(section?.props ?? {}),
  };

  function updateField(key: string, value: EditorFieldValue) {
    if (!section) {
      return;
    }
    onChangeProps(section.id, { [key]: value });
  }

  return (
    <aside className="min-h-0 overflow-y-auto border-t border-white/10 bg-[#20232C] p-4 lg:border-l lg:border-t-0 lg:border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Edit Panel
          </p>
          <h2 className="font-kanit text-lg font-semibold">Section settings</h2>
        </div>
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[#FFD700]">
          <PanelRightIcon className="size-5" />
        </span>
      </div>

      {section ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-[#1A1C23] p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-[#FF8C00]/15 text-[#FFD700]">
                <SlidersHorizontalIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-kanit text-lg font-semibold">
                  {section.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {registryEntry?.label ?? "Unregistered section"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] font-medium text-slate-400">
                    {section.sourceType ?? section.type}
                  </span>
                  {section.isVisible === false ? (
                    <span className="rounded-md bg-red-400/10 px-2 py-1 text-[11px] font-medium text-red-200">
                      Hidden
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-200">
                      Visible
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {editorSchema.length > 0 ? (
            <div className="space-y-4">
              {editorSchema.map((field) => (
                <EditorFieldControl
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => updateField(field.key, value)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-[#1A1C23] p-4">
              <p className="text-sm font-semibold text-slate-200">
                Preview-only section
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This imported section renders in the canvas, but it does not
                have focused editing controls yet.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-dashed border-[#FF8C00]/35 bg-[#FF8C00]/8 p-3">
            <p className="text-sm font-medium text-[#FFD700]">
              Autosaved draft
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Changes are saved automatically after you stop typing.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-[#1A1C23] p-4">
          <p className="text-sm font-semibold text-slate-200">
            Pick a section
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Select a block from the canvas or section list to edit copy,
            images, links, and visibility.
          </p>
        </div>
      )}
    </aside>
  );
}

function EditorFieldControl({
  field,
  value,
  onChange,
}: {
  field: EditorSchemaField;
  value: unknown;
  onChange: (value: EditorFieldValue) => void;
}) {
  const stringValue = typeof value === "string" ? value : "";

  if (field.type === "switch") {
    return (
      <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#1A1C23] px-3 py-3">
        <span>
          <span className="block text-sm font-medium text-slate-200">
            {field.label}
          </span>
          {field.required ? (
            <span className="mt-1 block text-xs text-slate-500">Required</span>
          ) : null}
        </span>
        <input
          type="checkbox"
          checked={typeof value === "boolean" ? value : false}
          onChange={(event) => onChange(event.target.checked)}
          className="size-5 accent-[#FF8C00]"
        />
      </label>
    );
  }

  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-200">
        <span>{field.label}</span>
        {field.required ? (
          <span className="text-xs font-normal text-[#FFD700]">Required</span>
        ) : null}
      </span>
      {renderInput(field, stringValue, onChange)}
    </label>
  );
}

function renderInput(
  field: EditorSchemaField,
  value: string,
  onChange: (value: EditorFieldValue) => void,
) {
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={value}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-none rounded-lg border border-white/10 bg-[#1A1C23] px-3 py-2 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-[#FF8C00]/70"
        />
      );

    case "select":
      return (
        <select
          value={value || field.options?.[0]?.value || ""}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeColorValue(value)}
            required={field.required}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-12 rounded-lg border border-white/10 bg-[#1A1C23] p-1"
          />
          <input
            type="text"
            value={value}
            placeholder={field.placeholder ?? "#FF8C00"}
            required={field.required}
            onChange={(event) => onChange(event.target.value)}
            className={inputClassName}
          />
        </div>
      );

    case "url":
    case "image":
      return (
        <input
          type="url"
          value={value}
          placeholder={field.placeholder ?? "https://..."}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
      );

    case "text":
    default:
      return (
        <input
          type="text"
          value={value}
          placeholder={field.placeholder}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
        />
      );
  }
}

function normalizeColorValue(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#FF8C00";
}
