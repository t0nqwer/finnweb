"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeftIcon,
  GlobeIcon,
  GripVerticalIcon,
  ImageIcon,
  LayersIcon,
  LoaderIcon,
  MonitorIcon,
  MousePointerClickIcon,
  PlusCircleIcon,
  RocketIcon,
  SaveIcon,
  SettingsIcon,
  SmartphoneIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import { resolveSectionApiErrorMessage } from "@/lib/section-error-messages";
import {
  formatSectionType,
  getSectionLabel,
  SECTION_LIBRARY,
} from "@/features/builder/registry/section-registry";
import {
  getEditableFields,
} from "@/features/builder/editor-schemas/section-editor-schemas";

type SiteEditorSimulatorProps = {
  site: {
    id: string;
    name: string;
    slug: string;
  };
  onClose: () => void;
  onSaveAsTemplate?: (site: { id: string; name: string; slug: string }) => void;
};

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  path?: string | null;
};

type SectionRecord = {
  id: string;
  type: string;
  name: string | null;
  sortOrder: number;
  isVisible: boolean;
  props?: Record<string, unknown> | null;
  customData?: Record<string, unknown> | null;
  sectionTemplate?: {
    id: string;
    code: string;
    name: string;
    sectionType: string;
    thumbnailUrl?: string | null;
    isOfficial: boolean;
    isPublished: boolean;
    sortOrder: number;
  } | null;
};

type SectionTemplateRecord = {
  id: string;
  code: string;
  name: string;
  sectionType: string;
  thumbnailUrl?: string | null;
  isOfficial: boolean;
  isPublished: boolean;
  sortOrder: number;
  layoutJson?: Record<string, unknown> | null;
  schemaJson?: Record<string, unknown> | null;
  activeVersion?: {
    id: string;
    version: number;
    renderMode?: "STRUCTURED" | "SAFE_HTML";
    htmlTemplate?: string | null;
    cssTemplate?: string | null;
    snapshot?: Record<string, unknown> | null;
  } | null;
};

type PreviewViewport = "mobile" | "desktop";
type SectionStyleMode = "theme" | "custom";
type RuntimeStyleEntry = {
  key: string;
  css: string;
};

// Per 2026-05-01 builder brief rework: MVP preview should be section-registry/JSON driven.
// Keep SAFE_HTML data for backward compatibility in DB, but do not render raw template HTML here.
const ENABLE_SAFE_HTML_RENDERER = false;

type GlobalStyleSettings = {
  themePresetId: string;
  fontFamily: string;
  accentColor: string;
  textColor: string;
  surfaceColor: string;
  sectionRadius: number;
  contentWidth: "normal" | "wide";
  heroTone: "warm" | "neutral" | "contrast";
};

type AdReadySettings = {
  facebookPixelId: string;
  googleTagId: string;
  tiktokPixelId: string;
  campaignName: string;
  autoAppendUtm: boolean;
};
type PreviewTokenItem = {
  id: string;
  token: string;
  previewUrl: string;
  apiPreviewUrl: string;
  expiresAt: string;
  createdAt: string;
};

type SortableSectionItemProps = {
  index: number;
  section: SectionRecord;
  isSelected: boolean;
  isSaving: boolean;
  nameValue: string;
  onSelect: (sectionId: string) => void;
  onNameChange: (section: SectionRecord, value: string) => void;
  onToggleVisibility: (section: SectionRecord, checked: boolean) => void;
  onDelete: (sectionId: string) => void;
};

const FONT_FAMILY_OPTIONS = [
  {
    value: "Kanit",
    label: "Kanit (Brand)",
  },
  {
    value: "Playfair Display",
    label: "Playfair Display",
  },
  {
    value: "Montserrat",
    label: "Montserrat",
  },
  {
    value: "Sarabun",
    label: "Sarabun",
  },
] as const;

const THEME_PRESETS = [
  {
    id: "deep-space-gold",
    label: "Deep Space Gold",
    accentColor: "#D4AF37",
    textColor: "#F5F5F5",
    surfaceColor: "#050608",
    fontFamily: "Kanit",
  },
  {
    id: "midnight-orange",
    label: "Midnight Orange",
    accentColor: "#FF8C00",
    textColor: "#F9FAFB",
    surfaceColor: "#0B1020",
    fontFamily: "Kanit",
  },
  {
    id: "emerald-luxe",
    label: "Emerald Luxe",
    accentColor: "#2EC4B6",
    textColor: "#F5F7FA",
    surfaceColor: "#081312",
    fontFamily: "Montserrat",
  },
] as const;

const SECTION_LIBRARY_ICON_MAP = {
  layers: LayersIcon,
  globe: GlobeIcon,
  type: TypeIcon,
  image: ImageIcon,
  pointer: MousePointerClickIcon,
} as const;

function readStringProp(props: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function readObjectProp(
  props: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = props[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function readObjectArrayProp(
  props: Record<string, unknown>,
  ...keys: string[]
): Array<Record<string, unknown>> {
  for (const key of keys) {
    const value = props[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
    }
  }

  return [];
}

function readBooleanProp(
  props: Record<string, unknown>,
  ...keys: string[]
): boolean {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return false;
}

function resolveNavbarHref(item: Record<string, unknown>) {
  const directHref = readStringProp(item, "href");
  if (directHref) {
    return directHref;
  }

  const linkType = readStringProp(item, "linkType");
  if (linkType === "section") {
    const sectionId = readStringProp(item, "sectionId").replace(/^#/, "");
    return sectionId ? `#${sectionId}` : "#";
  }

  if (linkType === "external") {
    return readStringProp(item, "url") || "#";
  }

  const pagePath = readStringProp(item, "pagePath");
  if (pagePath) {
    return pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  }

  return "#";
}

function normalizePreviewPagePath(pathLike: string) {
  const trimmed = pathLike.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getPagePathFromRecord(page: PageRecord) {
  if (page.path && page.path.trim()) {
    return normalizePreviewPagePath(page.path);
  }

  if (page.slug === "home") {
    return "/";
  }

  return normalizePreviewPagePath(page.slug);
}

function normalizeHexColor(input: string) {
  const trimmed = input.trim();
  const valid = /^#([0-9a-fA-F]{6})$/.test(trimmed);
  return valid ? trimmed : "#FF8C00";
}

function getThemePresetById(themePresetId: string) {
  return (
    THEME_PRESETS.find((preset) => preset.id === themePresetId) ??
    THEME_PRESETS[0]
  );
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHref(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "#";
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  return "#";
}

function sanitizeTemplateHtml(raw: string) {
  // Keep a conservative sanitization layer because template source is DB-driven.
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function interpolateTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    tokens[key] ?? "",
  );
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function defaultSafeNavbarCssTemplate() {
  return `.__SCOPE__ .fw-nav{background:#070708;border-bottom:1px solid rgba(255,255,255,.12);color:{{textColor}};font-family:{{fontFamily}};}
.__SCOPE__ .fw-topline{padding:.5rem 1rem;font-size:.72rem;color:rgba(255,255,255,.65);}
.__SCOPE__ .fw-card{margin:.75rem;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(0,0,0,.25);}
.__SCOPE__ .fw-nav-inner{max-width:1120px;margin:0 auto;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;}
.__SCOPE__ .fw-logo{font-weight:700;letter-spacing:.1em;color:{{accentColor}};}
.__SCOPE__ .fw-logo.with-badge{display:flex;align-items:center;gap:.6rem;}
.__SCOPE__ .fw-logo .badge{border:1px solid rgba(255,255,255,.25);padding:.15rem .4rem;border-radius:6px;font-size:.65rem;}
.__SCOPE__ .fw-menu{display:flex;align-items:center;gap:1.1rem;}
.__SCOPE__ .fw-menu.centered{justify-content:center;flex:1;}
.__SCOPE__ .fw-menu.right{justify-content:flex-end;flex:1;}
.__SCOPE__ .fw-menu a{font-size:.72rem;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.88);text-decoration:none;}
.__SCOPE__ .fw-menu.chips a{border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:.38rem .7rem;}
.__SCOPE__ .fw-menu.pill{background:rgba(255,255,255,.06);border-radius:999px;padding:.2rem;}
.__SCOPE__ .fw-menu.pill a{padding:.35rem .65rem;border-radius:999px;}
.__SCOPE__ .fw-menu.underline a{border-bottom:1px solid transparent;padding-bottom:.28rem;}
.__SCOPE__ .fw-menu.underline a:hover{border-bottom-color:rgba(255,255,255,.65);}
.__SCOPE__ .fw-cta a{display:inline-flex;align-items:center;justify-content:center;padding:.52rem .95rem;border-radius:8px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;text-decoration:none;background:{{accentColor}};color:#111;}
.__SCOPE__ .fw-cta.outline a,.__SCOPE__ .fw-cta-left a{background:transparent;border:1px solid rgba(255,255,255,.25);color:{{accentColor}};}
.__SCOPE__ .fw-mobile-btn{display:none;border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;border-radius:8px;padding:.38rem .6rem;font-size:.68rem;text-transform:uppercase;letter-spacing:.12em;}
.__SCOPE__ .fw-mobile{display:none;padding:0 1.25rem 1rem;max-width:1120px;margin:0 auto;}
.__SCOPE__ .fw-mobile a{display:block;margin:.3rem 0;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:.55rem .75rem;text-decoration:none;color:rgba(255,255,255,.88);font-size:.78rem;}
.__SCOPE__ .fw-mobile .fw-cta-mobile a{background:{{accentColor}};color:#111;font-weight:700;text-align:center;}
.__SCOPE__ .fw-nav-09 .center-logo{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;}
.__SCOPE__ .fw-nav-09 .fw-mobile-btn{justify-self:end;}
@media (max-width: 900px){.__SCOPE__ .fw-menu,.__SCOPE__ .fw-cta,.__SCOPE__ .fw-cta-left{display:none;}.__SCOPE__ .fw-mobile-btn{display:inline-flex;}.__SCOPE__ .fw-mobile{display:block;}.__SCOPE__ .fw-nav-09 .center-logo{display:flex;}}`;
}

function toFontFamilyCss(fontFamily: string) {
  const trimmed = fontFamily.trim();

  if (!trimmed) {
    return '"Kanit", sans-serif';
  }

  if (trimmed.includes(",") || trimmed.includes('"') || trimmed.includes("'")) {
    return trimmed;
  }

  return trimmed.includes(" ")
    ? `"${trimmed}", sans-serif`
    : `${trimmed}, sans-serif`;
}

function extractPrimaryFontName(fontFamily: string) {
  const trimmed = fontFamily.trim();
  if (!trimmed) {
    return "";
  }

  const firstChunk = trimmed.split(",")[0]?.trim() ?? "";
  if (!firstChunk) {
    return "";
  }

  return firstChunk.replace(/^["']|["']$/g, "");
}

function toGoogleFamilyParam(fontFamily: string) {
  return fontFamily.trim().replace(/\s+/g, "+");
}

function renderSectionPreview(
  section: SectionRecord,
  viewport: PreviewViewport,
  globalStyle: GlobalStyleSettings,
  sectionTemplateMap: Map<string, SectionTemplateRecord>,
  registerRuntimeStyle?: (style: RuntimeStyleEntry) => void,
  isNavbarMobileMenuOpen = false,
  onToggleNavbarMobileMenu?: (sectionId: string) => void,
  onCloseNavbarMobileMenu?: (sectionId: string) => void,
) {
  const props = (section.props ?? {}) as Record<string, unknown>;
  const title = readStringProp(props, "title", "headline", "heading");
  const subtitle = readStringProp(props, "subtitle", "description", "body");
  const body = readStringProp(props, "body", "description");
  const buttonText = readStringProp(props, "buttonText", "ctaText", "label");
  const imageUrl = readStringProp(
    props,
    "imageUrl",
    "backgroundImage",
    "src",
    "url",
  );
  const ctaObject = readObjectProp(props, "cta");
  const secondaryCtaObject = readObjectProp(props, "secondaryCta");
  const menuItems = readObjectArrayProp(props, "menuItems", "links");
  const comparePlans = readObjectArrayProp(props, "plans");
  const compareItems = readObjectArrayProp(props, "items");
  const bookingFields = readObjectArrayProp(props, "fields");

  const isMobile = viewport === "mobile";
  const styleMode =
    readStringProp(props, "styleMode") === "custom"
      ? ("custom" as SectionStyleMode)
      : ("theme" as SectionStyleMode);
  const sectionAccent = readStringProp(props, "accentColor", "primaryColor");
  const themeKey = readStringProp(props, "theme", "themePresetId");
  const presetFromSection = getThemePresetById(themeKey || globalStyle.themePresetId);
  const baseAccentColor =
    styleMode === "theme"
      ? normalizeHexColor(globalStyle.accentColor || presetFromSection.accentColor)
      : normalizeHexColor(sectionAccent || globalStyle.accentColor);
  const customAccent = readStringProp(props, "customAccentColor");
  const customTextColor = readStringProp(props, "customTextColor");
  const customFontFamily = readStringProp(props, "customFontFamily", "fontFamily");
  const accentColor =
    styleMode === "custom" && customAccent
      ? normalizeHexColor(customAccent)
      : baseAccentColor;
  const resolvedFontFamily =
    styleMode === "custom" && customFontFamily
      ? customFontFamily
      : globalStyle.fontFamily;
  const resolvedTextColor =
    styleMode === "custom" && customTextColor
      ? normalizeHexColor(customTextColor)
      : globalStyle.textColor;
  const sectionRadius = `${globalStyle.sectionRadius}px`;
  const heroBackground =
    imageUrl ||
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070";
  const mutedTextClass = "text-neutral-400";
  const sectionBaseStyle = {
    fontFamily: toFontFamilyCss(resolvedFontFamily),
    color: resolvedTextColor,
  };
  const sectionTemplateId = section.sectionTemplate?.id;
  const sectionTemplate =
    sectionTemplateId && sectionTemplateMap.has(sectionTemplateId)
      ? sectionTemplateMap.get(sectionTemplateId)
      : null;
  const activeVersion = sectionTemplate?.activeVersion;

  if (
    ENABLE_SAFE_HTML_RENDERER &&
    activeVersion?.renderMode === "SAFE_HTML" &&
    activeVersion.htmlTemplate &&
    section.type === "NAVBAR"
  ) {
    const menuAnchors = menuItems
      .map((item, index) => {
        const label = escapeHtml(String(item.label ?? `Menu ${index + 1}`));
        const href = sanitizeHref(resolveNavbarHref(item));
        return `<a href="${escapeHtml(href)}">${label}</a>`;
      })
      .join("");
    const ctaLabel = escapeHtml(
      readStringProp(ctaObject ?? {}, "label", "text") || buttonText || "Book Now",
    );
    const ctaHref = sanitizeHref(resolveNavbarHref(ctaObject ?? {}));
    const logoText =
      readStringProp(props, "logoText", "brandName", "brand", "title") || "Brand";
    const logoObject = readObjectProp(props, "logo");
    const logoUrlFromObject = readStringProp(logoObject ?? {}, "url");
    const logoUrl = logoUrlFromObject || readStringProp(props, "logo");
    const logoHtml =
      logoUrl && /^https?:\/\//i.test(logoUrl)
        ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(logoText)}" style="height:36px;width:auto;max-width:180px;object-fit:contain;" />`
        : `<span>${escapeHtml(logoText)}</span>`;
    const tokens = {
      brandName: escapeHtml(logoText),
      logoHtml,
      menuItemsHtml: menuAnchors,
      menuItemsHtmlChips: menuAnchors,
      menuItemsHtmlPill: menuAnchors,
      mobileMenuItemsHtml: menuAnchors,
      ctaHtml: `<a href="${escapeHtml(ctaHref)}">${ctaLabel}</a>`,
      ctaHtmlOutline: `<a href="${escapeHtml(ctaHref)}">${ctaLabel}</a>`,
      mobileCtaHtml: `<div class="fw-cta-mobile"><a href="${escapeHtml(ctaHref)}">${ctaLabel}</a></div>`,
      accentColor,
      textColor: resolvedTextColor,
      fontFamily: escapeHtml(toFontFamilyCss(resolvedFontFamily)),
      surfaceColor: normalizeHexColor(globalStyle.surfaceColor),
    };
    const html = sanitizeTemplateHtml(
      interpolateTemplate(activeVersion.htmlTemplate, tokens),
    );
    const wrapperClass = `fw-scope-${section.id}`;
    const rawCssTemplate = activeVersion.cssTemplate || defaultSafeNavbarCssTemplate();
    const runtimeScopeClass = `fw-safe-${hashString(
      `${sectionTemplate?.id ?? "template"}:${activeVersion.id}:${rawCssTemplate}`,
    )}`;
    const scopedCssTemplate = rawCssTemplate
      // Primary path for templates written as .__SCOPE__ .selector {...}
      .replaceAll(".__SCOPE__", `.${runtimeScopeClass}`)
      // Compatibility path for templates that use __SCOPE__ without leading dot
      .replaceAll("__SCOPE__", runtimeScopeClass);
    const runtimeCss = interpolateTemplate(scopedCssTemplate, {
      accentColor: "var(--fw-accent)",
      textColor: "var(--fw-text)",
      fontFamily: "var(--fw-font)",
      surfaceColor: "var(--fw-surface)",
    }).concat(
      `\n@media (max-width: 900px){.${runtimeScopeClass} .fw-mobile{display:none !important;}.${runtimeScopeClass}.fw-mobile-open .fw-mobile{display:block !important;}}`,
    );
    registerRuntimeStyle?.({
      key: `safe-${activeVersion.id}-${hashString(runtimeCss)}`,
      css: runtimeCss,
    });
    const safeNavbarStyle: CSSProperties = {
      ...sectionBaseStyle,
      ["--fw-accent" as string]: accentColor,
      ["--fw-text" as string]: resolvedTextColor,
      ["--fw-font" as string]: toFontFamilyCss(resolvedFontFamily),
      ["--fw-surface" as string]: normalizeHexColor(globalStyle.surfaceColor),
    };

    return (
      <section
        className={`${runtimeScopeClass} ${wrapperClass} border-b border-white/10 ${isNavbarMobileMenuOpen ? "fw-mobile-open" : ""}`}
        style={safeNavbarStyle}
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (!target) {
            return;
          }

          if (target.closest(".fw-mobile-btn")) {
            event.preventDefault();
            event.stopPropagation();
            onToggleNavbarMobileMenu?.(section.id);
            return;
          }

          if (target.closest(".fw-mobile a")) {
            onCloseNavbarMobileMenu?.(section.id);
          }
        }}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: html,
          }}
        />
      </section>
    );
  }

  switch (section.type) {
    case "NAVBAR": {
      const logoText =
        readStringProp(props, "logoText", "brandName", "brand", "title") ||
        "L'ÉCLAT";
      const logoObject = readObjectProp(props, "logo");
      const logoUrlFromObject = readStringProp(logoObject ?? {}, "url");
      const logoUrl = logoUrlFromObject || readStringProp(props, "logo");
      const logoMode = readStringProp(logoObject ?? {}, "mode") || "theme";
      const logoThemeKey = readStringProp(logoObject ?? {}, "themeKey") || "brand";
      const ctaLabel =
        readStringProp(ctaObject ?? {}, "label", "text") ||
        buttonText ||
        "Book Now";
      const ctaHref = resolveNavbarHref(ctaObject ?? {});
      const ctaNewTab = readBooleanProp(ctaObject ?? {}, "openInNewTab");
      const ctaNoFollow = readBooleanProp(ctaObject ?? {}, "noFollow");
      const renderedMenuItems =
        menuItems.length > 0
          ? menuItems
          : [
              { label: "Home", linkType: "page", pagePath: "/" },
              { label: "Our Story", linkType: "page", pagePath: "/about" },
              { label: "Menu", linkType: "page", pagePath: "/menu" },
              {
                label: "Reservations",
                linkType: "page",
                pagePath: "/reservations",
              },
            ];
      const navbarTemplateCode = section.sectionTemplate?.code || "";
      const navbarLayoutKey =
        navbarTemplateCode ||
        readStringProp(props, "navbarLayout", "templateCode", "rendererKey") ||
        "ST-NAVBAR-LUXE-01";

      const logoNode =
        logoMode === "custom" && logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={logoText} className="h-9 w-auto max-w-45 object-contain" />
        ) : (
          <span
            className={
              logoThemeKey === "light"
                ? "text-white"
                : logoThemeKey === "mono"
                  ? "text-neutral-200"
                  : ""
            }
            style={{
              color:
                logoThemeKey === "brand"
                  ? accentColor
                  : logoThemeKey === "dark"
                    ? "#111111"
                    : undefined,
            }}
          >
            {logoText}
          </span>
        );

      const renderMenuLink = (item: Record<string, unknown>, index: number, className: string) => {
        const openInNewTab = readBooleanProp(item, "openInNewTab");
        const noFollow = readBooleanProp(item, "noFollow");
        const rel = [
          openInNewTab ? "noopener noreferrer" : "",
          noFollow ? "nofollow" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <a
            key={`${String(item.label ?? "menu")}-${index}`}
            href={resolveNavbarHref(item)}
            target={openInNewTab ? "_blank" : undefined}
            rel={rel || undefined}
            onClick={() => {
              if (isMobile) {
                onCloseNavbarMobileMenu?.(section.id);
              }
            }}
            className={className}
          >
            {String(item.label ?? "Menu")}
          </a>
        );
      };

      const ctaNode = (className: string, styleMode: "solid" | "outline" = "solid") => (
        <a
          href={ctaHref}
          target={ctaNewTab ? "_blank" : undefined}
          rel={[
            ctaNewTab ? "noopener noreferrer" : "",
            ctaNoFollow ? "nofollow" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined}
          onClick={() => {
            if (isMobile) {
              onCloseNavbarMobileMenu?.(section.id);
            }
          }}
          className={className}
          style={
            styleMode === "solid"
              ? { backgroundColor: accentColor, color: "#111111" }
              : { borderColor: `${accentColor}AA`, color: accentColor }
          }
        >
          {ctaLabel}
        </a>
      );

      const mobileMenuPanel = (
        <div className="mt-4 grid grid-cols-1 gap-2">
          {renderedMenuItems.map((item, index) =>
            renderMenuLink(
              item,
              index,
              "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200",
            ),
          )}
          {ctaNode(
            "mt-1 rounded-md px-3 py-2 text-center text-xs font-bold tracking-[0.14em] uppercase",
          )}
        </div>
      );

      const mobileButton = (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleNavbarMobileMenu?.(section.id);
          }}
          className={
            isMobile
              ? "rounded-sm border border-white/20 px-3 py-1.5 text-[10px] tracking-[0.16em] text-white uppercase"
              : "hidden"
          }
        >
          Menu
        </button>
      );

      const desktopMenuClassic = (
        <nav className={isMobile ? "hidden" : "flex items-center gap-7"}>
          {renderedMenuItems.map((item, index) =>
            renderMenuLink(
              item,
              index,
              "text-xs font-semibold tracking-[0.14em] text-neutral-200 uppercase",
            ),
          )}
        </nav>
      );

      if (["ST-NAVBAR-LUXE-01", "ST-NAVBAR-01"].includes(navbarLayoutKey)) {
        return (
          <section
            className="border-b border-white/10 bg-[#040404] px-5 py-5 md:px-10"
            style={sectionBaseStyle}
          >
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xl font-bold tracking-[0.12em]" style={{ color: accentColor }}>
                  {logoNode}
                </span>
                {desktopMenuClassic}
                {isMobile ? null : ctaNode("inline-flex rounded-sm px-5 py-2 text-xs font-bold tracking-[0.14em] uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (["ST-NAVBAR-MIN-01", "ST-NAVBAR-02"].includes(navbarLayoutKey)) {
        return (
          <section
            className="border-b border-white/10 bg-[#0b0d11] px-5 py-4 md:px-10"
            style={sectionBaseStyle}
          >
            <div className="mx-auto max-w-6xl">
              <div className={isMobile ? "flex items-center justify-between" : "grid grid-cols-[1fr_auto_1fr] items-center"}>
                <span className="text-lg font-semibold tracking-[0.08em]" style={{ color: accentColor }}>
                  {logoNode}
                </span>
                <nav className={isMobile ? "hidden" : "flex items-center justify-center gap-6"}>
                  {renderedMenuItems.map((item, index) =>
                    renderMenuLink(item, index, "text-[11px] tracking-[0.18em] uppercase text-neutral-300"),
                  )}
                </nav>
                <div className={isMobile ? "hidden" : "flex justify-end"}>
                  {ctaNode("inline-flex rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.14em] uppercase", "outline")}
                </div>
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-03") {
        return (
          <section
            className="border-b border-white/10 bg-black/70 px-4 py-4 backdrop-blur-xl md:px-10"
            style={sectionBaseStyle}
          >
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold">{logoNode}</span>
                {desktopMenuClassic}
                {isMobile ? null : ctaNode("inline-flex rounded-lg px-4 py-2 text-xs font-bold uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-04") {
        return (
          <section className="border-b border-white/10 bg-[#080a0f]" style={sectionBaseStyle}>
            <div className="mx-auto max-w-6xl px-5 py-3 text-[11px] text-neutral-400 md:px-10">
              Today Offer: Complimentary Dessert for Booking
            </div>
            <div className="mx-auto max-w-6xl px-5 py-4 md:px-10">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xl font-bold">{logoNode}</span>
                {desktopMenuClassic}
                {isMobile ? null : ctaNode("inline-flex rounded-sm px-4 py-2 text-xs font-bold uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-05") {
        return (
          <section
            className="border-b border-white/10 bg-[#050607] px-5 py-5 md:px-10"
            style={sectionBaseStyle}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md border border-white/15 px-2 py-1 text-[11px] tracking-[0.2em] uppercase" style={{ color: accentColor }}>
                  FW
                </span>
                <span className="text-lg font-semibold">{logoNode}</span>
              </div>
              <nav className={isMobile ? "hidden" : "flex items-center gap-4"}>
                {renderedMenuItems.map((item, index) =>
                  renderMenuLink(item, index, "rounded-md border border-white/10 px-3 py-1.5 text-xs text-neutral-200"),
                )}
              </nav>
              {isMobile ? null : ctaNode("inline-flex rounded-md px-4 py-2 text-xs font-bold uppercase")}
              {mobileButton}
            </div>
            <div className="mx-auto max-w-6xl">
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-06") {
        return (
          <section className="border-b border-white/10 bg-[#090909] px-5 py-5 md:px-10" style={sectionBaseStyle}>
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xl font-black tracking-[0.16em]">{logoNode}</span>
                <div className={isMobile ? "hidden" : "rounded-full border border-white/10 bg-white/5 p-1"}>
                  <nav className="flex items-center gap-1">
                    {renderedMenuItems.map((item, index) =>
                      renderMenuLink(item, index, "rounded-full px-3 py-1.5 text-[11px] tracking-[0.14em] text-neutral-200 uppercase"),
                    )}
                  </nav>
                </div>
                {isMobile ? null : ctaNode("inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-07") {
        return (
          <section className="border-b border-white/10 bg-[#04070d] px-5 py-5 md:px-10" style={sectionBaseStyle}>
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-semibold">{logoNode}</span>
                <nav className={isMobile ? "hidden" : "flex items-center gap-6"}>
                  {renderedMenuItems.map((item, index) =>
                    renderMenuLink(item, index, "border-b border-transparent pb-1 text-xs tracking-[0.12em] text-neutral-300 uppercase hover:border-white/60"),
                  )}
                </nav>
                {isMobile ? null : ctaNode("inline-flex rounded-sm border px-4 py-2 text-xs font-semibold uppercase", "outline")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-08") {
        return (
          <section className="border-b border-white/10 bg-[#070707] px-5 py-4 md:px-10" style={sectionBaseStyle}>
            <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-bold">{logoNode}</span>
                {desktopMenuClassic}
                {isMobile ? null : ctaNode("inline-flex rounded-md px-4 py-2 text-xs font-bold uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-09") {
        return (
          <section className="border-b border-white/10 bg-[#050505] px-5 py-5 md:px-10" style={sectionBaseStyle}>
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
                <div className="hidden md:flex">{ctaNode("inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase", "outline")}</div>
                <span className="justify-self-center text-xl font-semibold">{logoNode}</span>
                <nav className={isMobile ? "hidden" : "flex items-center justify-end gap-6"}>
                  {renderedMenuItems.map((item, index) =>
                    renderMenuLink(item, index, "text-xs tracking-[0.14em] text-neutral-200 uppercase"),
                  )}
                </nav>
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      if (navbarLayoutKey === "ST-NAVBAR-10") {
        return (
          <section
            className="border-b border-white/10 bg-linear-to-r from-[#0b0f1a] via-[#121212] to-[#1a1208] px-5 py-5 md:px-10"
            style={sectionBaseStyle}
          >
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-lg font-bold tracking-[0.12em]">{logoNode}</span>
                <nav className={isMobile ? "hidden" : "flex items-center gap-7"}>
                  {renderedMenuItems.map((item, index) =>
                    renderMenuLink(item, index, "text-xs font-semibold tracking-[0.16em] text-neutral-100 uppercase"),
                  )}
                </nav>
                {isMobile ? null : ctaNode("inline-flex rounded-full px-5 py-2 text-xs font-bold uppercase")}
                {mobileButton}
              </div>
              {isMobile && isNavbarMobileMenuOpen ? mobileMenuPanel : null}
            </div>
          </section>
        );
      }

      return (
        <section className="border-b border-white/10 bg-[#040404] px-5 py-5 md:px-10" style={sectionBaseStyle}>
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xl font-bold tracking-[0.12em]" style={{ color: accentColor }}>
                {logoNode}
              </span>
              {desktopMenuClassic}
              {isMobile ? null : ctaNode("inline-flex rounded-sm px-5 py-2 text-xs font-bold tracking-[0.14em] uppercase")}
              {mobileButton}
            </div>
            {isMobile ? mobileMenuPanel : null}
          </div>
        </section>
      );
    }

    case "HEADER":
      return (
        <section
          className="border-b border-white/10 bg-[#070707] px-6 py-4 text-center"
          style={sectionBaseStyle}
        >
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase"
            style={{ color: accentColor }}
          >
            {title || "Curated Selection"}
          </p>
          <p className={`mt-1 text-xs ${mutedTextClass}`}>
            {subtitle || "An elevated fine dining experience in the city"}
          </p>
        </section>
      );

    case "HERO":
      return (
        <section
          className="relative overflow-hidden border-b border-white/10 px-6 py-18 text-center md:px-10 md:py-28"
          style={{
            ...sectionBaseStyle,
            backgroundImage: `linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.72)), url(${heroBackground})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <p className="text-[11px] tracking-[0.42em] text-white/75 uppercase">
            {subtitle || "Welcome to excellence"}
          </p>
          <h2
            className={`mx-auto mt-5 max-w-5xl font-semibold leading-[1.05] text-white ${isMobile ? "text-4xl" : "text-7xl"}`}
          >
            {title || "Artistic Gastronomy"}{" "}
            <span className="italic" style={{ color: accentColor }}>
              Redefined.
            </span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              className="border px-8 py-3 text-xs font-bold tracking-[0.16em] uppercase"
              style={{ borderColor: `${accentColor}AA`, color: accentColor }}
            >
              {buttonText || "View Our Menu"}
            </button>
            <button
              className="px-8 py-3 text-xs font-bold tracking-[0.16em] uppercase"
              style={{ backgroundColor: accentColor, color: "#111111" }}
            >
              {readStringProp(secondaryCtaObject ?? {}, "label", "text") ||
                "Reserve Table"}
            </button>
          </div>
        </section>
      );

    case "CONTENT":
      return (
        <section
          className="border-b border-white/10 bg-[#0b0b0d] px-6 py-14 md:px-10"
          style={sectionBaseStyle}
        >
          <div
            className={`mx-auto grid max-w-6xl items-center gap-10 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
          >
            <div className="space-y-4">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase"
                style={{ color: accentColor }}
              >
                About
              </p>
              <h3 className="text-4xl font-semibold leading-tight text-white">
                {title || "A Culinary Journey"}
              </h3>
              <p className={`text-base leading-8 ${mutedTextClass}`}>
                {body ||
                  subtitle ||
                  "ทุกจานและทุกช่วงเวลาถูกออกแบบเพื่อมอบประสบการณ์ที่ตราตรึง พร้อมให้คุณแก้ข้อความและรูปภาพได้จาก editor"}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  imageUrl ||
                  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1974"
                }
                alt={title || "Content image"}
                className="h-[360px] w-full object-cover"
              />
            </div>
          </div>
        </section>
      );

    case "PRODUCT_GRID": {
      const heading =
        readStringProp(props, "heading", "title", "headline") ||
        "Signature Dishes";
      const items = readObjectArrayProp(props, "items");
      const fallbackItems = Array.from({ length: isMobile ? 2 : 3 }).map(
        (_, index) => ({
          title: `Chef Selection ${index + 1}`,
          price: `${(index + 1) * 390} ฿`,
          body: "รายละเอียดเมนูสามารถแก้ไขได้จาก section props",
          imageUrl: [
            "https://images.unsplash.com/photo-1546039907-7fa05f864c02?auto=format&fit=crop&q=80&w=1480",
            "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2069",
            "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=1964",
          ][index % 3],
        }),
      );
      const itemLimitRaw = Number(props.itemLimit ?? 6);
      const itemLimit =
        Number.isFinite(itemLimitRaw) && itemLimitRaw > 0 ? itemLimitRaw : 6;
      const productItems = (items.length > 0 ? items : fallbackItems).slice(
        0,
        itemLimit,
      );

      return (
        <section
          className="border-b border-white/10 bg-[#090909] px-6 py-14 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-6xl">
            <p
              className="text-center text-[11px] font-semibold tracking-[0.22em] uppercase"
              style={{ color: accentColor }}
            >
              Curated Selection
            </p>
            <h3 className="mt-2 text-center text-4xl font-semibold text-white">
              {heading}
            </h3>
            <div
              className={`mt-10 grid gap-5 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
            >
              {productItems.map((item, index) => (
                (() => {
                  const itemRecord = item as Record<string, unknown>;
                  const itemTitle =
                    readStringProp(itemRecord, "title", "name") ||
                    `Item ${index + 1}`;
                  const itemImage =
                    readStringProp(itemRecord, "imageUrl", "image", "src") ||
                    fallbackItems[index % fallbackItems.length].imageUrl;
                  const itemPrice =
                    readStringProp(itemRecord, "price") ||
                    `${(index + 1) * 390} ฿`;
                  const itemBody =
                    readStringProp(itemRecord, "body", "description") ||
                    "ข้อความอธิบายสินค้า/เมนูแก้ไขได้";

                  return (
                    <article
                      key={`${itemTitle}-${index}`}
                      className="overflow-hidden rounded-xl border border-white/10 bg-[#121212]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={itemImage}
                        alt={itemTitle}
                        className="h-52 w-full object-cover"
                      />
                      <div className="space-y-2 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-white">{itemTitle}</p>
                          <p style={{ color: accentColor }}>{itemPrice}</p>
                        </div>
                        <p className={`text-sm ${mutedTextClass}`}>{itemBody}</p>
                      </div>
                    </article>
                  );
                })()
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "COMPARISON":
      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-14 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-6xl">
            <h3 className="text-center text-3xl font-semibold text-white">
              {title || "Comparison"}
            </h3>
            <div className="mt-7 overflow-hidden rounded-xl border border-white/10">
              <div
                className={`grid border-b border-white/10 bg-white/5 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
              >
                {(comparePlans.length > 0
                  ? comparePlans
                  : [
                      { title: "Classic", body: "5-course" },
                      { title: "Grand", body: "8-course" },
                    ]
                )
                  .slice(0, isMobile ? 2 : 3)
                  .map((plan, index) => (
                    <div key={`${String(plan.title)}-${index}`} className="p-4">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: accentColor }}
                      >
                        {String(plan.title ?? `Plan ${index + 1}`)}
                      </p>
                      <p className={`mt-1 text-xs ${mutedTextClass}`}>
                        {String(plan.body ?? plan.description ?? "")}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="divide-y divide-white/10 bg-black/20">
                {(compareItems.length > 0
                  ? compareItems
                  : [
                      { title: "Wine Pairing", body: "Optional / Included" },
                      { title: "Chef Table", body: "No / Yes" },
                      { title: "Duration", body: "2 hrs / 3 hrs" },
                    ]
                ).map((item, index) => (
                  <div
                    key={`${String(item.title)}-${index}`}
                    className="grid grid-cols-[1fr_1.5fr] gap-3 p-4 text-sm"
                  >
                    <p className="text-neutral-300">{String(item.title ?? "-")}</p>
                    <p className={mutedTextClass}>{String(item.body ?? "-")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );

    case "BOOKING":
      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-16 md:px-10"
          style={{
            ...sectionBaseStyle,
            backgroundImage:
              "linear-gradient(rgba(0,0,0,.82), rgba(0,0,0,.82)), url(https://images.unsplash.com/photo-1550966841-3ee7adac1661?auto=format&fit=crop&q=80&w=2070)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/75 p-6 md:p-10">
            <h3 className="text-center text-3xl font-semibold text-white">
              {title || "Make a Reservation"}
            </h3>
            <p className={`mt-2 text-center text-sm ${mutedTextClass}`}>
              {subtitle || "Book your table in advance and we will confirm soon"}
            </p>
            <div
              className={`mt-7 grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {(bookingFields.length > 0
                ? bookingFields
                : [
                    { label: "Full Name" },
                    { label: "Email Address" },
                    { label: "Guests" },
                    { label: "Date" },
                  ]
              ).map((field, index) => (
                <div key={`${String(field.label)}-${index}`} className="space-y-1">
                  <p className="text-[11px] tracking-[0.1em] text-white/60 uppercase">
                    {String(field.label ?? `Field ${index + 1}`)}
                  </p>
                  <div className="h-10 rounded-md border border-white/15 bg-black/35" />
                </div>
              ))}
            </div>
            <button
              className="mt-6 w-full rounded-md px-6 py-3 text-xs font-bold tracking-[0.18em] uppercase"
              style={{ backgroundColor: accentColor, color: "#111111" }}
            >
              {readStringProp(props, "submitLabel", "buttonText") ||
                "Submit Request"}
            </button>
          </div>
        </section>
      );

    case "FOOTER":
      return (
        <footer
          className="bg-[#030303] px-6 py-12 md:px-10"
          style={sectionBaseStyle}
        >
          <div
            className={`mx-auto max-w-6xl ${isMobile ? "space-y-7" : "grid grid-cols-3 gap-8"}`}
          >
            <div>
              <p className="text-2xl font-semibold tracking-[0.1em]" style={{ color: accentColor }}>
                {readStringProp(props, "brandName", "title") || "L'ÉCLAT"}
              </p>
              <p className={`mt-3 text-sm ${mutedTextClass}`}>
                {readStringProp(props, "description", "body") ||
                  "Fine dining destination with crafted experiences and editable sections."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
                Navigation
              </p>
              <div className="mt-3 space-y-2">
                {(menuItems.length > 0
                  ? menuItems
                  : [
                      { label: "Contact" },
                      { label: "Hours" },
                      { label: "Privacy" },
                    ]
                ).map((item, index) => (
                  <p
                    key={`${String(item.label)}-${index}`}
                    className={`text-sm ${mutedTextClass}`}
                  >
                    {String(item.label ?? "Link")}
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
                Action
              </p>
              <button
                className="mt-3 rounded-md px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: `${accentColor}1F`, color: accentColor }}
              >
                {readStringProp(ctaObject ?? {}, "label", "text") || "Instagram"}
              </button>
            </div>
          </div>
        </footer>
      );

    case "SIDEBAR":
      return (
        <section
          className="border-b border-white/10 bg-[#0a0b0f] px-6 py-12 md:px-10"
          style={sectionBaseStyle}
        >
          <div
            className={`mx-auto grid max-w-6xl gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-[280px_1fr]"}`}
          >
            <aside className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-white uppercase">
                {title || "Sidebar"}
              </p>
              <div className="mt-4 space-y-2">
                {(menuItems.length > 0
                  ? menuItems
                  : [
                      { label: "Category 1" },
                      { label: "Category 2" },
                      { label: "Category 3" },
                    ]
                ).map((item, index) => (
                  <div
                    key={`${String(item.label)}-${index}`}
                    className="rounded-md border border-white/10 px-3 py-2 text-sm text-neutral-300"
                  >
                    {String(item.label ?? "Link")}
                  </div>
                ))}
              </div>
            </aside>
            <div className="rounded-xl border border-white/10 bg-black/20 p-6">
              <h3 className="text-2xl font-semibold text-white">
                {subtitle || "Main content area"}
              </h3>
              <p className={`mt-3 leading-7 ${mutedTextClass}`}>
                {body ||
                  "คุณสามารถใช้ section นี้สำหรับหน้าเมนูสินค้า บทความ หรือรายการข่าว โดยยังแก้รายละเอียดแต่ละส่วนได้ทั้งหมด"}
              </p>
            </div>
          </div>
        </section>
      );

    case "IMAGE":
      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-12 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                imageUrl ||
                "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1974"
              }
              alt={getSectionLabel(section)}
              className={`w-full object-cover ${isMobile ? "h-64" : "h-[460px]"}`}
            />
          </div>
        </section>
      );

    case "CTA": {
      const ctaTemplate =
        readStringProp(props, "ctaTemplate", "templateVariant") === "double"
          ? "double"
          : "single";
      const primaryCta = readObjectProp(props, "primaryCta");
      const secondaryCta = readObjectProp(props, "secondaryCta");
      const primaryLabel =
        readStringProp(primaryCta ?? {}, "label", "text") ||
        buttonText ||
        "Get Started";
      const primaryHref = resolveNavbarHref(primaryCta ?? {});
      const secondaryLabel =
        readStringProp(secondaryCta ?? {}, "label", "text") || "Learn More";
      const secondaryHref = resolveNavbarHref(secondaryCta ?? {});

      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-14 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-4xl text-center">
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: accentColor }}
            >
              Call To Action
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-white">
              {title || "พร้อมเริ่มต้นหรือยัง?"}
            </h3>
            <p className={`mx-auto mt-3 max-w-2xl leading-7 ${mutedTextClass}`}>
              {subtitle ||
                "ส่วนนี้รองรับ template แบบปุ่มเดียว หรือสองปุ่ม และยังคงข้อมูลเดิมได้เมื่อสลับ"}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href={primaryHref}
                className="rounded-md px-6 py-2.5 text-xs font-semibold tracking-[0.14em] uppercase"
                style={{ backgroundColor: accentColor, color: "#111111" }}
              >
                {primaryLabel}
              </a>
              {ctaTemplate === "double" ? (
                <a
                  href={secondaryHref}
                  className="rounded-md border px-6 py-2.5 text-xs font-semibold tracking-[0.14em] uppercase"
                  style={{
                    borderColor: `${accentColor}88`,
                    color: accentColor,
                  }}
                >
                  {secondaryLabel}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    case "FORM":
    case "CONTACT":
    case "FEATURE":
    case "RICH_TEXT":
    case "ABOUT":
    case "FAQ":
      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-12 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-4xl text-center">
            <p
              className="text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: accentColor }}
            >
              {formatSectionType(section.type)}
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-white">
              {title || getSectionLabel(section)}
            </h3>
            <p className={`mx-auto mt-3 max-w-2xl leading-7 ${mutedTextClass}`}>
              {body ||
                subtitle ||
                "เนื้อหาส่วนนี้เชื่อมกับ section props โดยตรง และแก้ข้อความ/ปุ่ม/รูปได้จากแผงด้านซ้าย"}
            </p>
            {buttonText ? (
              <button
                className="mt-6 rounded-md px-6 py-2.5 text-xs font-semibold"
                style={{ backgroundColor: accentColor, color: "#111111" }}
              >
                {buttonText}
              </button>
            ) : null}
          </div>
        </section>
      );

    case "NEWS_LIST":
    case "BLOG_LIST":
      return (
        <section
          className="border-b border-white/10 bg-[#090909] px-6 py-12 md:px-10"
          style={sectionBaseStyle}
        >
          <div className="mx-auto max-w-6xl">
            <h3 className="text-3xl font-semibold text-white">
              {title || "Latest Stories"}
            </h3>
            <div
              className={`mt-6 grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
            >
              {Array.from({ length: isMobile ? 2 : 3 }).map((_, index) => (
                <article
                  key={index}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    News Headline {index + 1}
                  </p>
                  <p className={`mt-2 text-sm ${mutedTextClass}`}>
                    รองรับโหมด manual/dynamic และกำหนดจำนวนรายการได้
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      );

    default:
      return (
        <section
          className="border-b border-white/10 bg-[#0a0a0a] px-6 py-10 md:px-10"
          style={{ ...sectionBaseStyle, borderRadius: sectionRadius }}
        >
          <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-black/20 p-5">
            <p
              className="text-[11px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: accentColor }}
            >
              {formatSectionType(section.type)}
            </p>
            <p className={`mt-2 text-sm ${mutedTextClass}`}>
              {title ||
                body ||
                "Section นี้พร้อมแก้ได้จาก props และเรนเดอร์ในหน้า preview แบบเว็บไซต์จริง"}
            </p>
          </div>
        </section>
      );
  }
}

function SortableSectionItem({
  index,
  section,
  isSelected,
  isSaving,
  nameValue,
  onSelect,
  onNameChange,
  onToggleVisibility,
  onDelete,
}: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(section.id)}
      className={`group flex items-center justify-between rounded-lg border border-border/70 bg-black/10 p-3 transition ${
        isDragging ? "opacity-60" : ""
      } ${isSelected ? "ring-1 ring-primary/60" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <button
          type="button"
          aria-label={`จัดลำดับ section ${index + 1}`}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground hover:bg-black/20 focus-visible:ring-2 focus-visible:ring-primary"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              #{index + 1}
            </span>
            <Input
              value={nameValue}
              onChange={(event) => onNameChange(section, event.target.value)}
              onClick={(event) => event.stopPropagation()}
              className="h-7 text-xs"
              placeholder={formatSectionType(section.type)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {formatSectionType(section.type)}
            </span>
            {!section.isVisible ? (
              <Badge variant="secondary">ซ่อนอยู่</Badge>
            ) : null}
            {isSelected ? (
              <Badge className="bg-primary/20 text-primary">กำลังเลือก</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ml-2 flex items-center gap-2">
        {isSaving ? (
          <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
        ) : null}
        <label
          className="flex items-center gap-1 text-[10px] text-muted-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={section.isVisible}
            onCheckedChange={(checked) =>
              onToggleVisibility(section, Boolean(checked))
            }
          />
          แสดง
        </label>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(section.id);
          }}
          className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
          aria-label={`Delete section ${section.id}`}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function SiteEditorSimulator({
  site,
  onClose,
  onSaveAsTemplate,
}: SiteEditorSimulatorProps) {
  const [activePanel, setActivePanel] = useState<
    "sections" | "settings" | "global"
  >("sections");
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>("desktop");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [sectionTemplates, setSectionTemplates] = useState<SectionTemplateRecord[]>(
    [],
  );
  const [isLoadingSectionTemplates, setIsLoadingSectionTemplates] =
    useState(false);
  const [templatePickerType, setTemplatePickerType] = useState<string | null>(
    null,
  );
  const [templatePickerSectionLabel, setTemplatePickerSectionLabel] = useState("");
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [openNavbarSectionId, setOpenNavbarSectionId] = useState<string | null>(
    null,
  );
  const [nameDraftBySectionId, setNameDraftBySectionId] = useState<
    Record<string, string>
  >({});
  const [propDraftBySectionId, setPropDraftBySectionId] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [savingSectionIds, setSavingSectionIds] = useState<
    Record<string, boolean>
  >({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const defaultThemePreset = THEME_PRESETS[0];
  const [globalStyle, setGlobalStyle] = useState<GlobalStyleSettings>({
    themePresetId: defaultThemePreset.id,
    fontFamily: defaultThemePreset.fontFamily,
    accentColor: defaultThemePreset.accentColor,
    textColor: defaultThemePreset.textColor,
    surfaceColor: defaultThemePreset.surfaceColor,
    sectionRadius: 12,
    contentWidth: "normal",
    heroTone: "warm",
  });
  const [adReadySettings, setAdReadySettings] = useState<AdReadySettings>({
    facebookPixelId: "",
    googleTagId: "",
    tiktokPixelId: "",
    campaignName: "",
    autoAppendUtm: true,
  });
  const [dynamicGoogleFonts, setDynamicGoogleFonts] = useState<string[]>([
    "Kanit",
    "Playfair Display",
    "Montserrat",
    "Sarabun",
  ]);
  const [googleFontInput, setGoogleFontInput] = useState("");
  const [previewTokenDays, setPreviewTokenDays] = useState<1 | 3 | 7 | 14>(7);
  const [previewTokens, setPreviewTokens] = useState<PreviewTokenItem[]>([]);
  const [isLoadingPreviewTokens, setIsLoadingPreviewTokens] = useState(false);
  const [isSavingPreviewToken, setIsSavingPreviewToken] = useState(false);

  const renameTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const propTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  const normalizedApiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (previewViewport === "desktop") {
      setOpenNavbarSectionId(null);
    }
  }, [previewViewport]);

  const loadPreviewTokens = useCallback(async () => {
    setIsLoadingPreviewTokens(true);
    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/preview-tokens`,
      );
      if (!response.ok) {
        return;
      }
      const payloadRecord =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      const dataRecord =
        payloadRecord &&
        payloadRecord.data &&
        typeof payloadRecord.data === "object"
          ? (payloadRecord.data as Record<string, unknown>)
          : null;
      const items = Array.isArray(dataRecord?.items) ? dataRecord.items : [];
      setPreviewTokens(
        items.filter((item): item is PreviewTokenItem => {
          if (!item || typeof item !== "object") {
            return false;
          }
          const record = item as Record<string, unknown>;
          return (
            typeof record.id === "string" &&
            typeof record.token === "string" &&
            typeof record.previewUrl === "string" &&
            typeof record.apiPreviewUrl === "string" &&
            typeof record.expiresAt === "string" &&
            typeof record.createdAt === "string"
          );
        }),
      );
    } finally {
      setIsLoadingPreviewTokens(false);
    }
  }, [site.id]);

  useEffect(() => {
    void loadPreviewTokens();
  }, [loadPreviewTokens]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const editableFields = useMemo(
    () => (selectedSection ? getEditableFields(selectedSection.type) : []),
    [selectedSection],
  );
  const selectedSectionPropsDraft = useMemo(() => {
    if (!selectedSection) {
      return null;
    }

    return (
      propDraftBySectionId[selectedSection.id] ??
      ((selectedSection.props ?? {}) as Record<string, unknown>)
    );
  }, [propDraftBySectionId, selectedSection]);
  const pageLinkOptions = useMemo(
    () =>
      pages.map((page) => ({
        id: page.id,
        title: page.title,
        path: getPagePathFromRecord(page),
      })),
    [pages],
  );
  const visibleTemplatePickerItems = useMemo(() => {
    const filtered = templatePickerType
      ? sectionTemplates.filter(
          (template) => template.sectionType === templatePickerType,
        )
      : sectionTemplates;

    return [...filtered].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }, [sectionTemplates, templatePickerType]);

  const selectedSectionTemplateOptions = useMemo(() => {
    if (!selectedSection) {
      return [];
    }

    return sectionTemplates
      .filter((template) => template.sectionType === selectedSection.type)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
  }, [sectionTemplates, selectedSection]);
  const sectionTemplateMap = useMemo(
    () => new Map(sectionTemplates.map((template) => [template.id, template])),
    [sectionTemplates],
  );
  const fontOptions = useMemo(() => {
    const fromSections = sections
      .map((section) => {
        const props = (section.props ?? {}) as Record<string, unknown>;
        return (
          readStringProp(props, "customFontFamily", "fontFamily") || ""
        );
      })
      .filter(Boolean)
      .map((font) => extractPrimaryFontName(font));

    const all = [
      ...dynamicGoogleFonts,
      ...fromSections,
      extractPrimaryFontName(globalStyle.fontFamily),
    ].filter(Boolean);

    const unique = Array.from(new Set(all));
    return unique.map((font) => ({ label: font, value: font }));
  }, [dynamicGoogleFonts, globalStyle.fontFamily, sections]);

  useEffect(() => {
    const stored = readStoredAuthState();
    if (stored.apiBaseUrl) {
      setApiBaseUrl(stored.apiBaseUrl);
    }
    if (stored.accessToken) {
      setAccessToken(stored.accessToken);
    }
  }, []);

  useEffect(() => {
    const renameTimers = renameTimersRef.current;
    const propTimers = propTimersRef.current;

    return () => {
      for (const timer of Object.values(renameTimers)) {
        clearTimeout(timer);
      }
      for (const timer of Object.values(propTimers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    const fontNames = new Set<string>();

    const globalFont = extractPrimaryFontName(globalStyle.fontFamily);
    if (globalFont) {
      fontNames.add(globalFont);
    }

    for (const section of sections) {
      const props = (section.props ?? {}) as Record<string, unknown>;
      const sectionFont = extractPrimaryFontName(
        readStringProp(props, "customFontFamily", "fontFamily"),
      );
      if (sectionFont) {
        fontNames.add(sectionFont);
      }
    }

    const families = Array.from(fontNames).filter(
      (family) => /^[a-zA-Z0-9\s-]+$/.test(family) && family.length >= 2,
    );

    if (families.length === 0) {
      return;
    }

    const linkId = "finnweb-preview-google-fonts";
    const href = `https://fonts.googleapis.com/css2?${families
      .map((family) => `family=${toGoogleFamilyParam(family)}:wght@300;400;500;600;700`)
      .join("&")}&display=swap`;

    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [globalStyle.fontFamily, sections]);

  const fetchWithRefresh = useCallback(
    async (path: string, init?: RequestInit) => {
      const { response, payload, authState } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path,
        init,
      });

      if (authState.accessToken && authState.accessToken !== accessToken) {
        setAccessToken(authState.accessToken);
      }

      return { response, payload };
    },
    [accessToken, normalizedApiBaseUrl],
  );

  const patchSection = useCallback(
    async (
      sectionId: string,
      payload: Record<string, unknown>,
      successMessage: string,
      options?: { silent?: boolean },
    ) => {
      if (!selectedPageId) {
        return null;
      }

      setSavingSectionIds((current) => ({ ...current, [sectionId]: true }));
      setErrorMessage(null);

      try {
        const { response, payload: responsePayload } = await fetchWithRefresh(
          `/sites/${site.id}/pages/${selectedPageId}/sections/${sectionId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const message = resolveSectionApiErrorMessage(
            responsePayload,
            "บันทึกการแก้ไขไม่สำเร็จ",
          );
          throw new Error(message);
        }

        const updated =
          typeof responsePayload === "object" &&
          responsePayload &&
          "data" in responsePayload
            ? (responsePayload.data as SectionRecord)
            : null;

        if (updated) {
          setSections((current) =>
            current.map((section) =>
              section.id === sectionId ? { ...section, ...updated } : section,
            ),
          );

          setNameDraftBySectionId((current) => ({
            ...current,
            [sectionId]: updated.name ?? "",
          }));

          setPropDraftBySectionId((current) => ({
            ...current,
            [sectionId]: (updated.props ?? {}) as Record<string, unknown>,
          }));
        }

        if (!options?.silent) {
          setStatusMessage(successMessage);
          toast.success(successMessage);
        }
        return updated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "บันทึกการแก้ไขไม่สำเร็จ";
        if (!options?.silent) {
          setErrorMessage(message);
          toast.error(message);
        }
        return null;
      } finally {
        setSavingSectionIds((current) => {
          const next = { ...current };
          delete next[sectionId];
          return next;
        });
      }
    },
    [fetchWithRefresh, selectedPageId, site.id],
  );

  useEffect(() => {
    async function loadPages() {
      if (!accessToken || !site.id) {
        return;
      }

      setIsLoadingPages(true);
      setErrorMessage(null);

      try {
        const { response, payload } = await fetchWithRefresh(
          `/sites/${site.id}/pages`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดหน้าของเว็บไซต์ได้");
        }

        const nextPages =
          typeof payload === "object" &&
          payload &&
          "data" in payload &&
          Array.isArray(payload.data)
            ? (payload.data as PageRecord[])
            : [];

        setPages(nextPages);

        if (nextPages.length > 0) {
          setSelectedPageId((current) =>
            current && nextPages.some((page) => page.id === current)
              ? current
              : nextPages[0].id,
          );
        } else {
          setSelectedPageId("");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "โหลดหน้าเว็บไม่สำเร็จ",
        );
      } finally {
        setIsLoadingPages(false);
      }
    }

    void loadPages();
  }, [accessToken, site.id, fetchWithRefresh]);

  useEffect(() => {
    async function loadSectionTemplates() {
      if (!accessToken) {
        return;
      }

      setIsLoadingSectionTemplates(true);
      try {
        const { response, payload } = await fetchWithRefresh(
          "/section-templates?scope=all",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("ไม่สามารถโหลด section templates ได้");
        }

        const nextTemplates =
          typeof payload === "object" &&
          payload &&
          "data" in payload &&
          Array.isArray(payload.data)
            ? (payload.data as SectionTemplateRecord[])
            : [];

        setSectionTemplates(nextTemplates);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "โหลด section templates ไม่สำเร็จ";
        setErrorMessage(message);
      } finally {
        setIsLoadingSectionTemplates(false);
      }
    }

    void loadSectionTemplates();
  }, [accessToken, fetchWithRefresh]);

  useEffect(() => {
    async function loadSections() {
      if (!accessToken || !site.id || !selectedPageId) {
        setSections([]);
        return;
      }

      setIsLoadingSections(true);
      setErrorMessage(null);

      try {
        const { response, payload } = await fetchWithRefresh(
          `/sites/${site.id}/pages/${selectedPageId}/sections`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดส่วนเนื้อหาได้");
        }

        const nextSections =
          typeof payload === "object" &&
          payload &&
          "data" in payload &&
          Array.isArray(payload.data)
            ? (payload.data as SectionRecord[])
            : [];

        setSections(nextSections);
        setNameDraftBySectionId(() => {
          const nextDrafts: Record<string, string> = {};
          for (const section of nextSections) {
            nextDrafts[section.id] = section.name ?? "";
          }
          return nextDrafts;
        });

        setPropDraftBySectionId(() => {
          const nextDrafts: Record<string, Record<string, unknown>> = {};
          for (const section of nextSections) {
            nextDrafts[section.id] = (section.props ?? {}) as Record<
              string,
              unknown
            >;
          }
          return nextDrafts;
        });

        const firstThemedProps = nextSections
          .map((section) => (section.props ?? {}) as Record<string, unknown>)
          .find((props) => Object.keys(props).length > 0);

        if (firstThemedProps) {
          const presetId =
            readStringProp(firstThemedProps, "themePresetId", "theme") ||
            defaultThemePreset.id;
          const preset = getThemePresetById(presetId);
          const incomingFont =
            extractPrimaryFontName(
              readStringProp(firstThemedProps, "fontFamily"),
            ) || preset.fontFamily;

          setGlobalStyle((current) => ({
            ...current,
            themePresetId: preset.id,
            fontFamily: incomingFont,
            accentColor: normalizeHexColor(
              readStringProp(firstThemedProps, "accentColor") ||
                preset.accentColor,
            ),
            textColor: normalizeHexColor(
              readStringProp(firstThemedProps, "textColor") || preset.textColor,
            ),
          }));

          setDynamicGoogleFonts((current) => {
            if (!incomingFont) {
              return current;
            }

            const exists = current.some(
              (font) => font.toLowerCase() === incomingFont.toLowerCase(),
            );
            if (exists) {
              return current;
            }
            return [...current, incomingFont];
          });
        }

        setSelectedSectionId((current) => {
          if (
            current &&
            nextSections.some((section) => section.id === current)
          ) {
            return current;
          }
          return nextSections[0]?.id ?? null;
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "โหลดส่วนเนื้อหาไม่สำเร็จ",
        );
      } finally {
        setIsLoadingSections(false);
      }
    }

    void loadSections();
  }, [
    accessToken,
    fetchWithRefresh,
    selectedPageId,
    site.id,
  ]);

  async function handleAddSectionFromTemplate(template: SectionTemplateRecord) {
    if (!selectedPageId) {
      setErrorMessage("เลือกหน้าที่ต้องการแก้ไขก่อน");
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/pages/${selectedPageId}/sections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sectionTemplateId: template.id,
            name: templatePickerSectionLabel || template.name,
          }),
        },
      );

      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "เพิ่มส่วนเนื้อหาไม่สำเร็จ",
        );
        throw new Error(message);
      }

      const created =
        typeof payload === "object" && payload && "data" in payload
          ? (payload.data as SectionRecord)
          : null;

      if (created) {
        setSections((current) => [...current, created]);
        setNameDraftBySectionId((current) => ({
          ...current,
          [created.id]: created.name ?? "",
        }));
        setPropDraftBySectionId((current) => ({
          ...current,
          [created.id]: (created.props ?? {}) as Record<string, unknown>,
        }));
        setSelectedSectionId(created.id);
      }

      setStatusMessage("เพิ่มส่วนเนื้อหาเรียบร้อยแล้ว");
      toast.success("เพิ่มส่วนเนื้อหาเรียบร้อยแล้ว");
      setTemplatePickerType(null);
      setTemplatePickerSectionLabel("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "เพิ่มส่วนเนื้อหาไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    }
  }

  function handleOpenTemplatePicker(
    sectionType: string,
    suggestedName: string,
  ) {
    setTemplatePickerType(sectionType);
    setTemplatePickerSectionLabel(suggestedName);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  async function handleSwitchSelectedSectionTemplate(sectionTemplateId: string) {
    if (!selectedSection || !selectedPageId) {
      return;
    }

    if (!sectionTemplateId) {
      return;
    }

    if (selectedSection.sectionTemplate?.id === sectionTemplateId) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    const { response, payload } = await fetchWithRefresh(
      `/sites/${site.id}/pages/${selectedPageId}/sections/${selectedSection.id}/template`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionTemplateId,
        }),
      },
    );

    if (!response.ok) {
      const message = resolveSectionApiErrorMessage(
        payload,
        "เปลี่ยน template ของ section ไม่สำเร็จ",
      );
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    const updated =
      typeof payload === "object" && payload && "data" in payload
        ? (payload.data as SectionRecord)
        : null;

    if (!updated) {
      return;
    }

    setSections((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setPropDraftBySectionId((current) => ({
      ...current,
      [updated.id]: (updated.props ?? {}) as Record<string, unknown>,
    }));
    setSelectedSectionId(updated.id);
    setStatusMessage("เปลี่ยน section template เรียบร้อยแล้ว");
    toast.success("เปลี่ยน section template เรียบร้อยแล้ว");
  }

  async function handleDeleteSection(sectionId: string) {
    if (!selectedPageId) {
      return;
    }

    const confirmed = window.confirm("ลบส่วนเนื้อหานี้ใช่หรือไม่?");
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/pages/${selectedPageId}/sections/${sectionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "ลบส่วนเนื้อหาไม่สำเร็จ",
        );
        throw new Error(message);
      }

      setSections((current) =>
        current.filter((section) => section.id !== sectionId),
      );
      setNameDraftBySectionId((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
      setPropDraftBySectionId((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
      setSelectedSectionId((current) =>
        current === sectionId ? null : current,
      );
      setStatusMessage("ลบส่วนเนื้อหาเรียบร้อยแล้ว");
      toast.success("ลบส่วนเนื้อหาเรียบร้อยแล้ว");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ลบส่วนเนื้อหาไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    }
  }

  function scheduleRenameAutoSave(section: SectionRecord, nextName: string) {
    setNameDraftBySectionId((current) => ({
      ...current,
      [section.id]: nextName,
    }));

    const existingTimer = renameTimersRef.current[section.id];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    renameTimersRef.current[section.id] = setTimeout(() => {
      const normalizedNext = nextName.trim();
      const normalizedCurrent = section.name?.trim() ?? "";

      if (normalizedNext === normalizedCurrent) {
        return;
      }

      void patchSection(
        section.id,
        { name: normalizedNext || null },
        "บันทึกชื่อ section แล้ว",
      );
    }, 550);
  }

  function schedulePropsAutoSave(
    sectionId: string,
    nextProps: Record<string, unknown>,
  ) {
    const existingTimer = propTimersRef.current[sectionId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    propTimersRef.current[sectionId] = setTimeout(() => {
      void patchSection(
        sectionId,
        { props: nextProps },
        "บันทึกเนื้อหา section แล้ว",
      );
    }, 650);
  }

  function applySectionProps(
    section: SectionRecord,
    nextProps: Record<string, unknown>,
  ) {
    setPropDraftBySectionId((current) => ({
      ...current,
      [section.id]: nextProps,
    }));

    setSections((current) =>
      current.map((item) =>
        item.id === section.id
          ? {
              ...item,
              props: nextProps,
            }
          : item,
      ),
    );

    schedulePropsAutoSave(section.id, nextProps);
  }

  function handlePropFieldChange(
    section: SectionRecord,
    key: string,
    value: string,
  ) {
    const currentDraft =
      propDraftBySectionId[section.id] ?? section.props ?? {};
    const nextProps: Record<string, unknown> = {
      ...(currentDraft as Record<string, unknown>),
      [key]: value,
    };

    applySectionProps(section, nextProps);
  }

  function handleNavbarLogoModeChange(section: SectionRecord, mode: "theme" | "custom") {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentLogo = readObjectProp(currentDraft, "logo") ?? {};

    const nextLogo: Record<string, unknown> =
      mode === "custom"
        ? {
            mode: "custom",
            url: readStringProp(currentLogo, "url"),
          }
        : {
            mode: "theme",
            themeKey: readStringProp(currentLogo, "themeKey") || "brand",
          };

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      logo: nextLogo,
    };
    applySectionProps(section, nextProps);
  }

  function handleNavbarMenuItemChange(
    section: SectionRecord,
    index: number,
    key: string,
    value: string | boolean,
  ) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentItems = readObjectArrayProp(currentDraft, "menuItems");
    const nextItems =
      currentItems.length > 0
        ? currentItems.map((item) => ({ ...item }))
        : [{ label: "Home", linkType: "page", pagePath: "/" }];

    const currentItem = nextItems[index] ?? {};
    const nextItem = { ...currentItem, [key]: value };
    if (key === "linkType" && typeof value === "string") {
      if (value === "section") {
        delete nextItem.pageId;
        delete nextItem.pagePath;
        delete nextItem.url;
        nextItem.sectionId = readStringProp(currentItem, "sectionId") || "hero";
      } else if (value === "page") {
        delete nextItem.sectionId;
        delete nextItem.url;
        const firstPage = pageLinkOptions[0];
        nextItem.pageId =
          readStringProp(currentItem, "pageId") || firstPage?.id || "";
        nextItem.pagePath =
          readStringProp(currentItem, "pagePath") || firstPage?.path || "/";
      } else if (value === "external") {
        delete nextItem.sectionId;
        delete nextItem.pageId;
        delete nextItem.pagePath;
        nextItem.url = readStringProp(currentItem, "url") || "https://";
      }
    }
    if (key === "pageId" && typeof value === "string") {
      const selectedPage = pageLinkOptions.find((page) => page.id === value);
      if (selectedPage) {
        nextItem.pageId = selectedPage.id;
        nextItem.pagePath = selectedPage.path;
      }
    }
    nextItems[index] = nextItem;

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      menuItems: nextItems,
    };
    applySectionProps(section, nextProps);
  }

  function handleNavbarAddMenuItem(section: SectionRecord) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentItems = readObjectArrayProp(currentDraft, "menuItems");
    const nextItems = [
      ...currentItems,
      {
        label: `Menu ${currentItems.length + 1}`,
        linkType: "page",
        pageId: pageLinkOptions[0]?.id || "",
        pagePath: pageLinkOptions[0]?.path || "/",
      },
    ];

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      menuItems: nextItems,
    };
    applySectionProps(section, nextProps);
  }

  function handleNavbarRemoveMenuItem(section: SectionRecord, index: number) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentItems = readObjectArrayProp(currentDraft, "menuItems");
    const nextItems = currentItems.filter((_, itemIndex) => itemIndex !== index);
    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      menuItems: nextItems,
    };
    applySectionProps(section, nextProps);
  }

  function handleNavbarCtaFieldChange(
    section: SectionRecord,
    key: string,
    value: string | boolean,
  ) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentCta = readObjectProp(currentDraft, "cta") ?? {};
    const nextCta: Record<string, unknown> = {
      ...currentCta,
      [key]: value,
    };

    if (key === "linkType" && typeof value === "string") {
      if (value === "section") {
        delete nextCta.pageId;
        delete nextCta.pagePath;
        delete nextCta.url;
        nextCta.sectionId = readStringProp(currentCta, "sectionId") || "booking";
      } else if (value === "page") {
        delete nextCta.sectionId;
        delete nextCta.url;
        const firstPage = pageLinkOptions[0];
        nextCta.pageId = readStringProp(currentCta, "pageId") || firstPage?.id || "";
        nextCta.pagePath =
          readStringProp(currentCta, "pagePath") || firstPage?.path || "/";
      } else if (value === "external") {
        delete nextCta.sectionId;
        delete nextCta.pageId;
        delete nextCta.pagePath;
        nextCta.url = readStringProp(currentCta, "url") || "https://";
      }
    }
    if (key === "pageId" && typeof value === "string") {
      const selectedPage = pageLinkOptions.find((page) => page.id === value);
      if (selectedPage) {
        nextCta.pageId = selectedPage.id;
        nextCta.pagePath = selectedPage.path;
      }
    }

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      cta: nextCta,
    };
    applySectionProps(section, nextProps);
  }

  function handleCtaTemplateChange(
    section: SectionRecord,
    template: "single" | "double",
  ) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentPrimary = readObjectProp(currentDraft, "primaryCta") ?? {};
    const currentSecondary = readObjectProp(currentDraft, "secondaryCta") ?? {};

    const primaryLabel =
      readStringProp(currentPrimary, "label", "text") ||
      readStringProp(currentDraft, "buttonText") ||
      "Get Started";
    const primaryHref = resolveNavbarHref(currentPrimary);
    const secondaryLabel =
      readStringProp(currentSecondary, "label", "text") || "Learn More";
    const secondaryHref = resolveNavbarHref(currentSecondary);

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      ctaTemplate: template,
      buttonText: primaryLabel,
      primaryCta: {
        ...(currentPrimary as Record<string, unknown>),
        label: primaryLabel,
        href: primaryHref,
      },
      secondaryCta: {
        ...(currentSecondary as Record<string, unknown>),
        label: secondaryLabel,
        href: secondaryHref,
      },
    };

    applySectionProps(section, nextProps);
  }

  function handleCtaButtonFieldChange(
    section: SectionRecord,
    target: "primaryCta" | "secondaryCta",
    key: "label" | "href",
    value: string,
  ) {
    const currentDraft =
      (propDraftBySectionId[section.id] ?? section.props ?? {}) as Record<
        string,
        unknown
      >;
    const currentTarget = readObjectProp(currentDraft, target) ?? {};
    const nextTarget = {
      ...currentTarget,
      [key]: value,
    };

    const nextProps: Record<string, unknown> = {
      ...currentDraft,
      [target]: nextTarget,
    };

    if (target === "primaryCta" && key === "label") {
      nextProps.buttonText = value;
    }

    applySectionProps(section, nextProps);
  }

  async function handleApplyThemeToThemeSections() {
    if (sections.length === 0) {
      setStatusMessage("ยังไม่มี section ให้บันทึกธีม");
      return;
    }

    let updatedCount = 0;
    let failedCount = 0;

    for (const section of sections) {
      const currentProps =
        propDraftBySectionId[section.id] ?? (section.props ?? {});
      const styleMode =
        readStringProp(currentProps as Record<string, unknown>, "styleMode") ||
        "theme";

      if (styleMode === "custom") {
        continue;
      }

      const nextProps: Record<string, unknown> = {
        ...(currentProps as Record<string, unknown>),
        styleMode: "theme",
        themePresetId: globalStyle.themePresetId,
        theme: globalStyle.themePresetId,
        fontFamily: globalStyle.fontFamily,
        accentColor: globalStyle.accentColor,
        textColor: globalStyle.textColor,
      };

      setPropDraftBySectionId((current) => ({
        ...current,
        [section.id]: nextProps,
      }));
      setSections((current) =>
        current.map((item) =>
          item.id === section.id
            ? {
                ...item,
                props: nextProps,
              }
            : item,
        ),
      );

      const saved = await patchSection(
        section.id,
        { props: nextProps },
        "บันทึกธีมเว็บสำเร็จ",
        { silent: true },
      );

      if (saved) {
        updatedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    if (failedCount > 0) {
      setErrorMessage(
        `บันทึกธีมได้ ${updatedCount} section และมีข้อผิดพลาด ${failedCount} section`,
      );
      toast.error("บันทึกธีมบางส่วนไม่สำเร็จ");
      return;
    }

    setStatusMessage(`บันทึกธีมให้ ${updatedCount} section แล้ว`);
    toast.success(`บันทึกธีมให้ ${updatedCount} section แล้ว`);
  }

  function handleAddGoogleFont() {
    const normalized = googleFontInput.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return;
    }

    if (!/^[a-zA-Z0-9\s-]{2,60}$/.test(normalized)) {
      setErrorMessage("ชื่อฟอนต์ไม่ถูกต้อง (ใช้ a-z, 0-9, space, -)");
      return;
    }

    setDynamicGoogleFonts((current) => {
      const exists = current.some(
        (font) => font.toLowerCase() === normalized.toLowerCase(),
      );
      if (exists) {
        return current;
      }
      return [...current, normalized];
    });

    setGlobalStyle((current) => ({
      ...current,
      fontFamily: normalized,
    }));
    setGoogleFontInput("");
    setErrorMessage(null);
    setStatusMessage(`เพิ่ม Google Font: ${normalized}`);
  }

  async function handleToggleVisibility(
    section: SectionRecord,
    checked: boolean,
  ) {
    setSections((current) =>
      current.map((item) =>
        item.id === section.id ? { ...item, isVisible: checked } : item,
      ),
    );

    const updated = await patchSection(
      section.id,
      { isVisible: checked },
      checked ? "เปิดการแสดงผลแล้ว" : "ซ่อน section แล้ว",
    );

    if (!updated) {
      setSections((current) =>
        current.map((item) =>
          item.id === section.id
            ? { ...item, isVisible: section.isVisible }
            : item,
        ),
      );
    }
  }

  async function persistSectionOrder(nextSections: SectionRecord[]) {
    if (!selectedPageId) {
      return;
    }

    setIsSavingOrder(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const sectionIds = nextSections.map((section) => section.id);

      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/pages/${selectedPageId}/sections/reorder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sectionIds }),
        },
      );

      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "บันทึกลำดับส่วนเนื้อหาไม่สำเร็จ",
        );
        throw new Error(message);
      }

      setStatusMessage("บันทึกลำดับส่วนเนื้อหาแล้ว");
      toast.success("บันทึกลำดับส่วนเนื้อหาแล้ว");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "บันทึกลำดับส่วนเนื้อหาไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingOrder(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = sections.findIndex(
      (section) => section.id === String(active.id),
    );
    const toIndex = sections.findIndex(
      (section) => section.id === String(over.id),
    );

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const reordered = arrayMove(sections, fromIndex, toIndex).map(
      (section, index) => ({
        ...section,
        sortOrder: index,
      }),
    );

    setSections(reordered);
    void persistSectionOrder(reordered);
  }

  async function handlePublishSite() {
    setIsPublishing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/publish`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "เผยแพร่เว็บไซต์ไม่สำเร็จ",
        );
        throw new Error(message);
      }

      const payloadRecord =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      const dataRecord =
        payloadRecord && payloadRecord.data && typeof payloadRecord.data === "object"
          ? (payloadRecord.data as Record<string, unknown>)
          : null;
      const publicUrl = dataRecord ? String(dataRecord.publicUrl ?? "") : "";
      const message = publicUrl
        ? `เผยแพร่แล้ว: ${publicUrl}`
        : "เผยแพร่เว็บไซต์แล้ว";

      setStatusMessage(message);
      toast.success(message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "เผยแพร่เว็บไซต์ไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCreatePreviewToken() {
    setIsSavingPreviewToken(true);
    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/preview-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expiresInDays: previewTokenDays,
          }),
        },
      );

      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "สร้าง preview token ไม่สำเร็จ",
        );
        throw new Error(message);
      }

      await loadPreviewTokens();
      setStatusMessage("สร้าง preview token แล้ว");
      toast.success("สร้าง preview token แล้ว");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "สร้าง preview token ไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingPreviewToken(false);
    }
  }

  async function handleRevokePreviewToken(previewTokenId: string) {
    setIsSavingPreviewToken(true);
    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/preview-tokens/${previewTokenId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "ยกเลิก preview token ไม่สำเร็จ",
        );
        throw new Error(message);
      }
      await loadPreviewTokens();
      setStatusMessage("ยกเลิก preview token แล้ว");
      toast.success("ยกเลิก preview token แล้ว");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ยกเลิก preview token ไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingPreviewToken(false);
    }
  }

  async function handleRefreshPreviewToken(previewTokenId: string) {
    setIsSavingPreviewToken(true);
    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${site.id}/preview-tokens/${previewTokenId}/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expiresInDays: previewTokenDays,
          }),
        },
      );
      if (!response.ok) {
        const message = resolveSectionApiErrorMessage(
          payload,
          "รีเฟรช preview token ไม่สำเร็จ",
        );
        throw new Error(message);
      }
      await loadPreviewTokens();
      setStatusMessage("รีเฟรช preview token แล้ว");
      toast.success("รีเฟรช preview token แล้ว");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "รีเฟรช preview token ไม่สำเร็จ";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSavingPreviewToken(false);
    }
  }

  const visibleSections = useMemo(
    () => sections.filter((section) => section.isVisible),
    [sections],
  );
  const previewCompilation = useMemo(() => {
    const runtimeStyleMap = new Map<string, string>();
    const renderedSections = visibleSections.map((section) => {
      const rendered = renderSectionPreview(
        section,
        previewViewport,
        globalStyle,
        sectionTemplateMap,
        (entry) => {
          if (!runtimeStyleMap.has(entry.key)) {
            runtimeStyleMap.set(entry.key, entry.css);
          }
        },
        openNavbarSectionId === section.id,
        (sectionId) => {
          setOpenNavbarSectionId((current) =>
            current === sectionId ? null : sectionId,
          );
        },
        (sectionId) => {
          setOpenNavbarSectionId((current) =>
            current === sectionId ? null : current,
          );
        },
      );

      return { section, rendered };
    });

    return {
      renderedSections,
      runtimeStyles: Array.from(runtimeStyleMap.entries()).map(([key, css]) => ({
        key,
        css,
      })),
    };
  }, [
    globalStyle,
    openNavbarSectionId,
    previewViewport,
    sectionTemplateMap,
    visibleSections,
  ]);

  const adReadyCount = useMemo(() => {
    let count = 0;

    if (adReadySettings.facebookPixelId.trim()) {
      count += 1;
    }
    if (adReadySettings.googleTagId.trim()) {
      count += 1;
    }
    if (adReadySettings.tiktokPixelId.trim()) {
      count += 1;
    }

    return count;
  }, [
    adReadySettings.facebookPixelId,
    adReadySettings.googleTagId,
    adReadySettings.tiktokPixelId,
  ]);

  return (
    <div className="fixed inset-0 z-120 flex flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border/70 bg-card/80 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="ย้อนกลับ"
          >
            <ChevronLeftIcon />
          </Button>
          <div className="h-7 w-px bg-border/70" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{site.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              โหมดแก้ไขหน้าเว็บไซต์
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-lg border border-border/70 bg-black/10 p-1 md:flex">
            <Button
              variant="ghost"
              size="icon"
              className={`size-8 ${previewViewport === "mobile" ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => setPreviewViewport("mobile")}
            >
              <SmartphoneIcon />
            </Button>
            <Button
              variant={previewViewport === "desktop" ? "default" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setPreviewViewport("desktop")}
            >
              <MonitorIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={() => setPreviewViewport("desktop")}
            >
              <GlobeIcon />
            </Button>
          </div>

          <Button
            variant="outline"
            className="border-border/70 bg-black/10"
            disabled
          >
            <SaveIcon data-icon="inline-start" />
            บันทึกอัตโนมัติ
          </Button>
          <Button
            className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
            onClick={() => void handlePublishSite()}
            disabled={isPublishing}
          >
            <RocketIcon data-icon="inline-start" />
            {isPublishing ? "กำลังเผยแพร่..." : "เผยแพร่"}
          </Button>
          {onSaveAsTemplate ? (
            <Button
              variant="outline"
              className="border-border/70 bg-black/10"
              onClick={() => onSaveAsTemplate(site)}
            >
              บันทึกเป็นเทมเพลต
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-90 flex-col border-r border-border/70 bg-card/85 lg:flex">
          <div className="grid grid-cols-3 border-b border-border/70">
            <button
              type="button"
              onClick={() => setActivePanel("sections")}
              className={`py-4 text-xs font-semibold tracking-wider uppercase transition ${
                activePanel === "sections"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              ส่วนเนื้อหา
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("settings")}
              className={`py-4 text-xs font-semibold tracking-wider uppercase transition ${
                activePanel === "settings"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              ตั้งค่า
            </button>
            <button
              type="button"
              onClick={() => setActivePanel("global")}
              className={`py-4 text-xs font-semibold tracking-wider uppercase transition ${
                activePanel === "global"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Global
            </button>
          </div>

          <div className="border-b border-border/70 p-3">
            <label className="text-[11px] text-muted-foreground">
              เลือกหน้า
            </label>
            <select
              value={selectedPageId}
              onChange={(event) => setSelectedPageId(event.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
            >
              {isLoadingPages ? (
                <option>กำลังโหลด...</option>
              ) : pages.length === 0 ? (
                <option value="">ยังไม่มีหน้า</option>
              ) : (
                pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {activePanel === "sections" ? (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                    เพิ่มส่วนใหม่
                  </p>

                  {SECTION_LIBRARY.map((item) => (
                    (() => {
                      const Icon =
                        SECTION_LIBRARY_ICON_MAP[item.iconKey] ?? LayersIcon;

                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() =>
                            handleOpenTemplatePicker(item.type, item.label)
                          }
                          className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-black/10 p-3 text-left text-sm transition hover:border-primary/50 hover:bg-black/20"
                        >
                          <span
                            className={`flex size-8 items-center justify-center rounded-lg bg-black/20 ${item.tone}`}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })()
                  ))}
                </div>

                {templatePickerType ? (
                  <div className="space-y-2 rounded-xl border border-border/70 bg-black/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        เลือก template สำหรับ {templatePickerType}
                      </p>
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setTemplatePickerType(null);
                          setTemplatePickerSectionLabel("");
                        }}
                      >
                        ปิด
                      </button>
                    </div>
                    <Input
                      value={templatePickerSectionLabel}
                      onChange={(event) =>
                        setTemplatePickerSectionLabel(event.target.value)
                      }
                      className="h-8 text-xs"
                      placeholder="ชื่อ section"
                    />
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {isLoadingSectionTemplates ? (
                        <p className="text-xs text-muted-foreground">
                          กำลังโหลด templates...
                        </p>
                      ) : visibleTemplatePickerItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          ยังไม่มี template ประเภทนี้
                        </p>
                      ) : (
                        visibleTemplatePickerItems.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className="w-full rounded-lg border border-border/70 bg-black/20 p-2 text-left text-xs transition hover:border-primary/50"
                            onClick={() =>
                              void handleAddSectionFromTemplate(template)
                            }
                          >
                            <p className="font-semibold">{template.name}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {template.sectionType} • {template.code}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 border-t border-border/70 pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                      ลำดับส่วนเนื้อหา
                    </p>
                    {isSavingOrder ? (
                      <Badge variant="secondary">กำลังบันทึกลำดับ...</Badge>
                    ) : null}
                  </div>

                  {isLoadingSections ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-black/10 p-3 text-xs text-muted-foreground">
                      หน้านี้ยังไม่มี section กดปุ่มด้านบนเพื่อเพิ่มได้ทันที
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sections.map((section) => section.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sections.map((section, index) => (
                            <SortableSectionItem
                              key={section.id}
                              index={index}
                              section={section}
                              isSelected={selectedSectionId === section.id}
                              isSaving={Boolean(savingSectionIds[section.id])}
                              nameValue={nameDraftBySectionId[section.id] ?? ""}
                              onSelect={setSelectedSectionId}
                              onNameChange={scheduleRenameAutoSave}
                              onToggleVisibility={(target, checked) => {
                                void handleToggleVisibility(target, checked);
                              }}
                              onDelete={(sectionId) => {
                                void handleDeleteSection(sectionId);
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </>
            ) : activePanel === "settings" ? (
              <div className="space-y-4">
                <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  ตั้งค่า section
                </p>

                {!selectedSection ? (
                  <Card className="border-border/70 bg-black/10">
                    <CardContent className="p-3 text-xs text-muted-foreground">
                      เลือก section จากรายการด้านซ้ายเพื่อแก้ไขเนื้อหา
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/70 bg-black/10">
                    <CardContent className="space-y-3 p-3">
                      <div className="rounded-md border border-border/60 bg-black/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                        ประเภท: {formatSectionType(selectedSection.type)}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Section Template
                        </label>
                        <select
                          value={selectedSection.sectionTemplate?.id ?? ""}
                          onChange={(event) =>
                            void handleSwitchSelectedSectionTemplate(
                              event.target.value,
                            )
                          }
                          className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                        >
                          {selectedSectionTemplateOptions.length === 0 ? (
                            <option value="">ไม่พบ template สำหรับประเภทนี้</option>
                          ) : null}
                          {selectedSectionTemplateOptions.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground">
                          same-type switch พร้อมย้ายข้อมูล common ให้อัตโนมัติ
                        </p>
                      </div>

                      {selectedSection.customData &&
                      Object.keys(selectedSection.customData).length > 0 ? (
                        <div className="rounded-md border border-amber-600/40 bg-amber-950/20 px-2 py-1.5 text-[10px] text-amber-200">
                          มีข้อมูลเดิมบางส่วนที่ไม่ตรง schema ของ template ใหม่
                          ระบบเก็บไว้ใน fallback แล้ว
                        </div>
                      ) : null}

                      {editableFields.map((field) => {
                        const value = readStringProp(
                          (selectedSectionPropsDraft ??
                            {}) as Record<string, unknown>,
                          field.key,
                        );

                        return (
                          <div key={field.key} className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              {field.label}
                            </label>
                            {field.multiline ? (
                              <textarea
                                rows={3}
                                value={value}
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    field.key,
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-border/70 bg-black/20 p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                                placeholder={field.placeholder}
                              />
                            ) : (
                              <Input
                                value={value}
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    field.key,
                                    event.target.value,
                                  )
                                }
                                className="h-8 text-xs"
                                placeholder={field.placeholder}
                              />
                            )}
                          </div>
                        );
                      })}

                      {selectedSection.type === "NAVBAR" ? (
                        (() => {
                          const propsDraft =
                            (selectedSectionPropsDraft ??
                              {}) as Record<string, unknown>;
                          const logoDraft = readObjectProp(propsDraft, "logo") ?? {};
                          const logoMode =
                            readStringProp(logoDraft, "mode") === "custom"
                              ? "custom"
                              : "theme";
                          const menuDraft = readObjectArrayProp(
                            propsDraft,
                            "menuItems",
                          );
                          const ctaDraft = readObjectProp(propsDraft, "cta") ?? {};
                          const ctaLinkType =
                            readStringProp(ctaDraft, "linkType") || "page";

                          return (
                            <>
                              <div className="h-px bg-border/60" />

                              <div className="space-y-1">
                                <label className="text-[11px] text-muted-foreground">
                                  ชื่อแบรนด์ (Navbar)
                                </label>
                                <Input
                                  value={readStringProp(propsDraft, "brandName")}
                                  onChange={(event) =>
                                    handlePropFieldChange(
                                      selectedSection,
                                      "brandName",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 text-xs"
                                  placeholder="เช่น L'ÉCLAT"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[11px] text-muted-foreground">
                                  โหมดโลโก้
                                </label>
                                <select
                                  value={logoMode}
                                  onChange={(event) =>
                                    handleNavbarLogoModeChange(
                                      selectedSection,
                                      event.target.value as "theme" | "custom",
                                    )
                                  }
                                  className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                >
                                  <option value="theme">โลโก้จาก Theme</option>
                                  <option value="custom">โลโก้แบบกำหนดเอง</option>
                                </select>
                              </div>

                              {logoMode === "theme" ? (
                                <div className="space-y-1">
                                  <label className="text-[11px] text-muted-foreground">
                                    Theme Logo Key
                                  </label>
                                  <select
                                    value={
                                      readStringProp(logoDraft, "themeKey") || "brand"
                                    }
                                    onChange={(event) => {
                                      const nextLogo = {
                                        ...logoDraft,
                                        mode: "theme",
                                        themeKey: event.target.value,
                                      };
                                      applySectionProps(selectedSection, {
                                        ...propsDraft,
                                        logo: nextLogo,
                                      });
                                    }}
                                    className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                  >
                                    <option value="brand">brand</option>
                                    <option value="light">light</option>
                                    <option value="dark">dark</option>
                                    <option value="mono">mono</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-[11px] text-muted-foreground">
                                    Logo URL
                                  </label>
                                  <Input
                                    value={readStringProp(logoDraft, "url")}
                                    onChange={(event) => {
                                      const nextLogo = {
                                        ...logoDraft,
                                        mode: "custom",
                                        url: event.target.value,
                                      };
                                      applySectionProps(selectedSection, {
                                        ...propsDraft,
                                        logo: nextLogo,
                                      });
                                    }}
                                    className="h-8 text-xs"
                                    placeholder="https://... หรือ /logo.svg"
                                  />
                                </div>
                              )}

                              <div className="h-px bg-border/60" />

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] text-muted-foreground">
                                    เมนู Navbar
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-7 border-border/70 bg-black/20 px-2 text-[11px]"
                                    onClick={() => handleNavbarAddMenuItem(selectedSection)}
                                  >
                                    เพิ่มเมนู
                                  </Button>
                                </div>

                                {menuDraft.length === 0 ? (
                                  <div className="rounded-md border border-dashed border-border/70 bg-black/10 p-2 text-[11px] text-muted-foreground">
                                    ยังไม่มีเมนู กด “เพิ่มเมนู”
                                  </div>
                                ) : (
                                  menuDraft.map((menuItem, index) => {
                                    const linkType =
                                      readStringProp(menuItem, "linkType") || "page";
                                    return (
                                      <div
                                        key={`nav-menu-${index}`}
                                        className="space-y-2 rounded-md border border-border/70 bg-black/10 p-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <p className="text-[11px] text-muted-foreground">
                                            เมนู #{index + 1}
                                          </p>
                                          <button
                                            type="button"
                                            className="text-[11px] text-red-300 hover:text-red-200"
                                            onClick={() =>
                                              handleNavbarRemoveMenuItem(
                                                selectedSection,
                                                index,
                                              )
                                            }
                                          >
                                            ลบ
                                          </button>
                                        </div>
                                        <Input
                                          value={readStringProp(menuItem, "label")}
                                          onChange={(event) =>
                                            handleNavbarMenuItemChange(
                                              selectedSection,
                                              index,
                                              "label",
                                              event.target.value,
                                            )
                                          }
                                          className="h-8 text-xs"
                                          placeholder="ชื่อเมนู"
                                        />
                                        <select
                                          value={linkType}
                                          onChange={(event) =>
                                            handleNavbarMenuItemChange(
                                              selectedSection,
                                              index,
                                              "linkType",
                                              event.target.value,
                                            )
                                          }
                                          className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                        >
                                          <option value="section">Section</option>
                                          <option value="page">Page</option>
                                          <option value="external">External</option>
                                        </select>
                                        {linkType === "section" ? (
                                          <Input
                                            value={readStringProp(menuItem, "sectionId")}
                                            onChange={(event) =>
                                              handleNavbarMenuItemChange(
                                                selectedSection,
                                                index,
                                                "sectionId",
                                                event.target.value.replace(/^#/, ""),
                                              )
                                            }
                                            className="h-8 text-xs"
                                            placeholder="section id เช่น hero"
                                          />
                                        ) : null}
                                        {linkType === "page" ? (
                                          <div className="space-y-1">
                                            <select
                                              value={
                                                readStringProp(menuItem, "pageId") ||
                                                pageLinkOptions.find(
                                                  (page) =>
                                                    page.path ===
                                                    readStringProp(menuItem, "pagePath"),
                                                )?.id ||
                                                ""
                                              }
                                              onChange={(event) =>
                                                handleNavbarMenuItemChange(
                                                  selectedSection,
                                                  index,
                                                  "pageId",
                                                  event.target.value,
                                                )
                                              }
                                              className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                            >
                                              <option value="">
                                                เลือกหน้าในเว็บไซต์
                                              </option>
                                              {pageLinkOptions.map((page) => (
                                                <option key={page.id} value={page.id}>
                                                  {page.title} ({page.path})
                                                </option>
                                              ))}
                                            </select>
                                            <p className="text-[10px] text-muted-foreground">
                                              path:{" "}
                                              {readStringProp(menuItem, "pagePath") || "/"}
                                            </p>
                                          </div>
                                        ) : null}
                                        {linkType === "external" ? (
                                          <Input
                                            value={readStringProp(menuItem, "url")}
                                            onChange={(event) =>
                                              handleNavbarMenuItemChange(
                                                selectedSection,
                                                index,
                                                "url",
                                                event.target.value,
                                              )
                                            }
                                            className="h-8 text-xs"
                                            placeholder="https://example.com"
                                          />
                                        ) : null}
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              <div className="h-px bg-border/60" />

                              <div className="space-y-2 rounded-md border border-border/70 bg-black/10 p-2">
                                <p className="text-[11px] text-muted-foreground">
                                  ปุ่ม CTA
                                </p>
                                <Input
                                  value={readStringProp(ctaDraft, "label")}
                                  onChange={(event) =>
                                    handleNavbarCtaFieldChange(
                                      selectedSection,
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 text-xs"
                                  placeholder="Book Now"
                                />
                                <select
                                  value={ctaLinkType}
                                  onChange={(event) =>
                                    handleNavbarCtaFieldChange(
                                      selectedSection,
                                      "linkType",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                >
                                  <option value="section">Section</option>
                                  <option value="page">Page</option>
                                  <option value="external">External</option>
                                </select>
                                {ctaLinkType === "section" ? (
                                  <Input
                                    value={readStringProp(ctaDraft, "sectionId")}
                                    onChange={(event) =>
                                      handleNavbarCtaFieldChange(
                                        selectedSection,
                                        "sectionId",
                                        event.target.value.replace(/^#/, ""),
                                      )
                                    }
                                    className="h-8 text-xs"
                                    placeholder="booking"
                                  />
                                ) : null}
                                {ctaLinkType === "page" ? (
                                  <div className="space-y-1">
                                    <select
                                      value={
                                        readStringProp(ctaDraft, "pageId") ||
                                        pageLinkOptions.find(
                                          (page) =>
                                            page.path ===
                                            readStringProp(ctaDraft, "pagePath"),
                                        )?.id ||
                                        ""
                                      }
                                      onChange={(event) =>
                                        handleNavbarCtaFieldChange(
                                          selectedSection,
                                          "pageId",
                                          event.target.value,
                                        )
                                      }
                                      className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                    >
                                      <option value="">เลือกหน้าในเว็บไซต์</option>
                                      {pageLinkOptions.map((page) => (
                                        <option key={page.id} value={page.id}>
                                          {page.title} ({page.path})
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground">
                                      path: {readStringProp(ctaDraft, "pagePath") || "/"}
                                    </p>
                                  </div>
                                ) : null}
                                {ctaLinkType === "external" ? (
                                  <Input
                                    value={readStringProp(ctaDraft, "url")}
                                    onChange={(event) =>
                                      handleNavbarCtaFieldChange(
                                        selectedSection,
                                        "url",
                                        event.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                    placeholder="https://example.com/book"
                                  />
                                ) : null}
                                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <Checkbox
                                    checked={readBooleanProp(ctaDraft, "openInNewTab")}
                                    onCheckedChange={(checked) =>
                                      handleNavbarCtaFieldChange(
                                        selectedSection,
                                        "openInNewTab",
                                        Boolean(checked),
                                      )
                                    }
                                  />
                                  เปิดลิงก์ CTA ในแท็บใหม่
                                </label>
                              </div>
                            </>
                          );
                        })()
                      ) : null}

                      {selectedSection.type === "CTA" ? (
                        (() => {
                          const propsDraft =
                            (selectedSectionPropsDraft ??
                              {}) as Record<string, unknown>;
                          const ctaTemplate =
                            readStringProp(
                              propsDraft,
                              "ctaTemplate",
                              "templateVariant",
                            ) === "double"
                              ? "double"
                              : "single";
                          const primaryCta =
                            readObjectProp(propsDraft, "primaryCta") ?? {};
                          const secondaryCta =
                            readObjectProp(propsDraft, "secondaryCta") ?? {};

                          return (
                            <>
                              <div className="h-px bg-border/60" />

                              <div className="space-y-1">
                                <label className="text-[11px] text-muted-foreground">
                                  CTA Template
                                </label>
                                <select
                                  value={ctaTemplate}
                                  onChange={(event) =>
                                    handleCtaTemplateChange(
                                      selectedSection,
                                      event.target.value as "single" | "double",
                                    )
                                  }
                                  className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                                >
                                  <option value="single">Single CTA</option>
                                  <option value="double">Double CTA (2 Buttons)</option>
                                </select>
                              </div>

                              <div className="space-y-1 rounded-md border border-border/70 bg-black/10 p-2">
                                <p className="text-[11px] text-muted-foreground">
                                  Primary CTA
                                </p>
                                <Input
                                  value={readStringProp(primaryCta, "label", "text")}
                                  onChange={(event) =>
                                    handleCtaButtonFieldChange(
                                      selectedSection,
                                      "primaryCta",
                                      "label",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 text-xs"
                                  placeholder="ข้อความปุ่มหลัก"
                                />
                                <Input
                                  value={
                                    readStringProp(primaryCta, "href") ||
                                    readStringProp(primaryCta, "url") ||
                                    "#"
                                  }
                                  onChange={(event) =>
                                    handleCtaButtonFieldChange(
                                      selectedSection,
                                      "primaryCta",
                                      "href",
                                      event.target.value,
                                    )
                                  }
                                  className="h-8 text-xs"
                                  placeholder="ลิงก์ปุ่มหลัก เช่น /contact หรือ #booking"
                                />
                              </div>

                              {ctaTemplate === "double" ? (
                                <div className="space-y-1 rounded-md border border-border/70 bg-black/10 p-2">
                                  <p className="text-[11px] text-muted-foreground">
                                    Secondary CTA
                                  </p>
                                  <Input
                                    value={readStringProp(secondaryCta, "label", "text")}
                                    onChange={(event) =>
                                      handleCtaButtonFieldChange(
                                        selectedSection,
                                        "secondaryCta",
                                        "label",
                                        event.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                    placeholder="ข้อความปุ่มรอง"
                                  />
                                  <Input
                                    value={
                                      readStringProp(secondaryCta, "href") ||
                                      readStringProp(secondaryCta, "url") ||
                                      "#"
                                    }
                                    onChange={(event) =>
                                      handleCtaButtonFieldChange(
                                        selectedSection,
                                        "secondaryCta",
                                        "href",
                                        event.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                    placeholder="ลิงก์ปุ่มรอง"
                                  />
                                </div>
                              ) : null}
                            </>
                          );
                        })()
                      ) : null}

                      <div className="h-px bg-border/60" />

                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          โหมดสไตล์ของ Section
                        </label>
                        <select
                          value={
                            readStringProp(
                              (selectedSectionPropsDraft ??
                                {}) as Record<string, unknown>,
                              "styleMode",
                            ) === "custom"
                              ? "custom"
                              : "theme"
                          }
                          onChange={(event) =>
                            handlePropFieldChange(
                              selectedSection,
                              "styleMode",
                              event.target.value,
                            )
                          }
                          className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                        >
                          <option value="theme">ใช้ค่าจาก Website Theme</option>
                          <option value="custom">กำหนด Custom เฉพาะ Section</option>
                        </select>
                      </div>

                      {readStringProp(
                        (selectedSectionPropsDraft ??
                          {}) as Record<string, unknown>,
                        "styleMode",
                      ) === "custom" ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              ฟอนต์ของ Section
                            </label>
                            <select
                              value={
                                extractPrimaryFontName(
                                  readStringProp(
                                    (selectedSectionPropsDraft ??
                                      {}) as Record<string, unknown>,
                                    "customFontFamily",
                                  ),
                                ) || extractPrimaryFontName(globalStyle.fontFamily)
                              }
                              onChange={(event) =>
                                handlePropFieldChange(
                                  selectedSection,
                                  "customFontFamily",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                            >
                              {fontOptions.map((option) => (
                                <option key={option.label} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              สี Accent ของ Section
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={normalizeHexColor(
                                  readStringProp(
                                    (selectedSectionPropsDraft ??
                                      {}) as Record<string, unknown>,
                                    "customAccentColor",
                                  ) || globalStyle.accentColor,
                                )}
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    "customAccentColor",
                                    event.target.value,
                                  )
                                }
                                className="h-8 w-9 cursor-pointer rounded border border-border/70 bg-transparent p-0"
                              />
                              <Input
                                value={
                                  readStringProp(
                                    (selectedSectionPropsDraft ??
                                      {}) as Record<string, unknown>,
                                    "customAccentColor",
                                  ) || globalStyle.accentColor
                                }
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    "customAccentColor",
                                    event.target.value,
                                  )
                                }
                                className="h-8 text-xs"
                                placeholder="#D4AF37"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">
                              สีข้อความหลักของ Section
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={normalizeHexColor(
                                  readStringProp(
                                    (selectedSectionPropsDraft ??
                                      {}) as Record<string, unknown>,
                                    "customTextColor",
                                  ) || globalStyle.textColor,
                                )}
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    "customTextColor",
                                    event.target.value,
                                  )
                                }
                                className="h-8 w-9 cursor-pointer rounded border border-border/70 bg-transparent p-0"
                              />
                              <Input
                                value={
                                  readStringProp(
                                    (selectedSectionPropsDraft ??
                                      {}) as Record<string, unknown>,
                                    "customTextColor",
                                  ) || globalStyle.textColor
                                }
                                onChange={(event) =>
                                  handlePropFieldChange(
                                    selectedSection,
                                    "customTextColor",
                                    event.target.value,
                                  )
                                }
                                className="h-8 text-xs"
                                placeholder="#F9FAFB"
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  Phase 4: Global Style
                </p>

                <Card className="border-border/70 bg-black/10">
                  <CardContent className="space-y-3 p-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Website Theme Preset
                      </label>
                      <select
                        value={globalStyle.themePresetId}
                        onChange={(event) => {
                          const preset = getThemePresetById(event.target.value);
                          setGlobalStyle((current) => ({
                            ...current,
                            themePresetId: preset.id,
                            accentColor: preset.accentColor,
                            textColor: preset.textColor,
                            surfaceColor: preset.surfaceColor,
                            fontFamily: preset.fontFamily,
                          }));
                        }}
                        className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                      >
                        {THEME_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Default Font Family
                      </label>
                      <select
                        value={globalStyle.fontFamily}
                        onChange={(event) =>
                          setGlobalStyle((current) => ({
                            ...current,
                            fontFamily: event.target.value,
                          }))
                        }
                        className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                      >
                        {fontOptions.map((option) => (
                          <option key={option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={googleFontInput}
                          onChange={(event) =>
                            setGoogleFontInput(event.target.value)
                          }
                          className="h-8 text-xs"
                          placeholder="เพิ่ม Google Font เช่น Cinzel"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 border-border/70 bg-black/20 px-3 text-xs"
                          onClick={handleAddGoogleFont}
                        >
                          เพิ่มฟอนต์
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-full border-border/70 bg-black/20 text-xs"
                      onClick={() => void handleApplyThemeToThemeSections()}
                    >
                      <SaveIcon data-icon="inline-start" />
                      บันทึก Theme ให้ทุก Section (โหมด Theme)
                    </Button>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(globalStyle.accentColor)}
                          onChange={(event) =>
                            setGlobalStyle((current) => ({
                              ...current,
                              accentColor: event.target.value,
                            }))
                          }
                          className="h-8 w-9 cursor-pointer rounded border border-border/70 bg-transparent p-0"
                          aria-label="เลือกสีหลัก"
                        />
                        <Input
                          value={globalStyle.accentColor}
                          onChange={(event) =>
                            setGlobalStyle((current) => ({
                              ...current,
                              accentColor: event.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                          placeholder="#FF8C00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Text Color (Theme)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHexColor(globalStyle.textColor)}
                          onChange={(event) =>
                            setGlobalStyle((current) => ({
                              ...current,
                              textColor: event.target.value,
                            }))
                          }
                          className="h-8 w-9 cursor-pointer rounded border border-border/70 bg-transparent p-0"
                          aria-label="เลือกสีข้อความธีม"
                        />
                        <Input
                          value={globalStyle.textColor}
                          onChange={(event) =>
                            setGlobalStyle((current) => ({
                              ...current,
                              textColor: event.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                          placeholder="#F9FAFB"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Section Radius ({globalStyle.sectionRadius}px)
                      </label>
                      <input
                        type="range"
                        min={6}
                        max={24}
                        value={globalStyle.sectionRadius}
                        onChange={(event) =>
                          setGlobalStyle((current) => ({
                            ...current,
                            sectionRadius: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-primary"
                        aria-label="ปรับความมนของ section"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Hero Tone
                      </label>
                      <select
                        value={globalStyle.heroTone}
                        onChange={(event) =>
                          setGlobalStyle((current) => ({
                            ...current,
                            heroTone: event.target
                              .value as GlobalStyleSettings["heroTone"],
                          }))
                        }
                        className="flex h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="warm">Warm (แนะนำ)</option>
                        <option value="neutral">Neutral</option>
                        <option value="contrast">High Contrast</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Content Width
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            globalStyle.contentWidth === "normal"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setGlobalStyle((current) => ({
                              ...current,
                              contentWidth: "normal",
                            }))
                          }
                        >
                          Normal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            globalStyle.contentWidth === "wide"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setGlobalStyle((current) => ({
                              ...current,
                              contentWidth: "wide",
                            }))
                          }
                        >
                          Wide
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  Phase 4: Ad Ready
                </p>

                <Card className="border-border/70 bg-black/10">
                  <CardContent className="space-y-3 p-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Facebook Pixel ID
                      </label>
                      <Input
                        value={adReadySettings.facebookPixelId}
                        onChange={(event) =>
                          setAdReadySettings((current) => ({
                            ...current,
                            facebookPixelId: event.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                        placeholder="เช่น 123456789012345"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Google Tag ID
                      </label>
                      <Input
                        value={adReadySettings.googleTagId}
                        onChange={(event) =>
                          setAdReadySettings((current) => ({
                            ...current,
                            googleTagId: event.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                        placeholder="เช่น G-XXXXXXX"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        TikTok Pixel ID
                      </label>
                      <Input
                        value={adReadySettings.tiktokPixelId}
                        onChange={(event) =>
                          setAdReadySettings((current) => ({
                            ...current,
                            tiktokPixelId: event.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                        placeholder="เช่น CXXXXXX"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Campaign Name
                      </label>
                      <Input
                        value={adReadySettings.campaignName}
                        onChange={(event) =>
                          setAdReadySettings((current) => ({
                            ...current,
                            campaignName: event.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                        placeholder="เช่น summer-sale-2026"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={adReadySettings.autoAppendUtm}
                        onCheckedChange={(checked) =>
                          setAdReadySettings((current) => ({
                            ...current,
                            autoAppendUtm: Boolean(checked),
                          }))
                        }
                      />
                      เปิดใช้งาน UTM auto append
                    </label>

                    <div className="rounded-md border border-border/60 bg-black/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                      Tracking connected: {adReadyCount}/3
                    </div>
                  </CardContent>
                </Card>

                <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                  Preview Token
                </p>

                <Card className="border-border/70 bg-black/10">
                  <CardContent className="space-y-3 p-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Token Expiry
                      </label>
                      <select
                        value={previewTokenDays}
                        onChange={(event) =>
                          setPreviewTokenDays(Number(event.target.value) as 1 | 3 | 7 | 14)
                        }
                        className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                      >
                        <option value={1}>1 day</option>
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleCreatePreviewToken()}
                        disabled={isSavingPreviewToken}
                      >
                        Create
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void loadPreviewTokens()}
                        disabled={isLoadingPreviewTokens}
                      >
                        Reload
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {previewTokens.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          ยังไม่มี preview token ที่ active
                        </p>
                      ) : (
                        previewTokens.map((tokenItem) => (
                          <div
                            key={tokenItem.id}
                            className="space-y-2 rounded-md border border-border/60 bg-black/20 p-2"
                          >
                            <p className="text-[10px] text-muted-foreground">
                              Expires: {new Date(tokenItem.expiresAt).toLocaleString()}
                            </p>
                            <p className="truncate text-[11px] text-foreground">
                              {tokenItem.previewUrl}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px]"
                                onClick={async () => {
                                  const origin = window.location.origin;
                                  await navigator.clipboard.writeText(
                                    `${origin}${tokenItem.previewUrl}`,
                                  );
                                  toast.success("คัดลอกลิงก์แล้ว");
                                }}
                              >
                                Copy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px]"
                                disabled={isSavingPreviewToken}
                                onClick={() =>
                                  void handleRefreshPreviewToken(tokenItem.id)
                                }
                              >
                                Refresh
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 border-red-800/60 text-[10px] text-red-300 hover:bg-red-950/30"
                                disabled={isSavingPreviewToken}
                                onClick={() =>
                                  void handleRevokePreviewToken(tokenItem.id)
                                }
                              >
                                Revoke
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {errorMessage ? (
              <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-200">
                {errorMessage}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                {statusMessage}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 overflow-y-auto bg-[#0f1118] p-4 md:p-6 lg:p-8">
          <div
            className={`mx-auto w-full rounded-2xl border border-slate-800 bg-[#07090f] p-3 shadow-2xl transition-all md:p-5 ${
              previewViewport === "mobile"
                ? "max-w-97.5"
                : globalStyle.contentWidth === "wide"
                  ? "max-w-6xl"
                  : "max-w-5xl"
            }`}
            style={{ fontFamily: toFontFamilyCss(globalStyle.fontFamily) }}
          >
            <div
              className="relative overflow-hidden rounded-xl border border-slate-800 text-[#F5F5F5]"
              style={{
                backgroundColor: globalStyle.surfaceColor,
                color: globalStyle.textColor,
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b0d11] px-4 py-3 text-[11px]">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-red-500/70" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                </div>
                <span className="font-semibold tracking-[0.12em] text-slate-300 uppercase">
                  {pages.find((page) => page.id === selectedPageId)?.title ??
                    "Home"}{" "}
                  ·{" "}
                  {previewViewport === "mobile" ? "Mobile Preview" : "Desktop Preview"}
                </span>
                <span className="text-slate-500">finnweb live canvas</span>
              </div>

              <div className="space-y-0 p-0">
                {previewCompilation.runtimeStyles.map((styleEntry) => (
                  <style key={styleEntry.key}>{styleEntry.css}</style>
                ))}
                {visibleSections.length === 0 ? (
                  <div className="m-5 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-300">
                    <p>ยังไม่มี section ที่เปิดแสดงในหน้านี้</p>
                    <Button
                      type="button"
                      className="mt-4 bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                      onClick={() =>
                        handleOpenTemplatePicker("HERO", "ส่วนหัวเริ่มต้น")
                      }
                    >
                      <PlusCircleIcon data-icon="inline-start" />
                      เพิ่ม Section แรก
                    </Button>
                  </div>
                ) : (
                  previewCompilation.renderedSections.map(({ section, rendered }) => (
                    <div
                      key={section.id}
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setActivePanel("settings");
                        setOpenNavbarSectionId((current) =>
                          current && current !== section.id ? null : current,
                        );
                      }}
                      className={`relative cursor-pointer transition ${
                        selectedSectionId === section.id
                          ? "z-10 ring-2 ring-[#ff8c00]/70 ring-offset-0"
                          : ""
                      }`}
                    >
                      {rendered}
                      {selectedSectionId === section.id ? (
                        <div
                          className="pointer-events-none absolute right-3 top-3 rounded-md border border-black/20 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase"
                          style={{
                            backgroundColor: normalizeHexColor(
                              globalStyle.accentColor,
                            ),
                          }}
                        >
                          กำลังเลือก {getSectionLabel(section)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden h-full w-86 shrink-0 border-l border-border/70 bg-card/70 xl:flex xl:flex-col">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Edit Panel
            </p>
            <p className="text-sm font-semibold">Section Settings</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {!selectedSection ? (
              <Card className="border-border/70 bg-black/10">
                <CardContent className="p-3 text-xs text-muted-foreground">
                  เลือก section จากฝั่งซ้ายหรือบน canvas เพื่อแก้ไข
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-border/70 bg-black/10">
                  <CardContent className="space-y-3 p-3">
                    <div className="rounded-md border border-border/60 bg-black/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                      ประเภท: {formatSectionType(selectedSection.type)}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">
                        Section Template
                      </label>
                      <select
                        value={selectedSection.sectionTemplate?.id ?? ""}
                        onChange={(event) =>
                          void handleSwitchSelectedSectionTemplate(
                            event.target.value,
                          )
                        }
                        className="h-8 w-full rounded-md border border-border/70 bg-black/20 px-2 text-xs"
                      >
                        {selectedSectionTemplateOptions.length === 0 ? (
                          <option value="">ไม่พบ template สำหรับประเภทนี้</option>
                        ) : null}
                        {selectedSectionTemplateOptions.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editableFields.map((field) => {
                      const value = readStringProp(
                        (selectedSectionPropsDraft ??
                          {}) as Record<string, unknown>,
                        field.key,
                      );

                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">
                            {field.label}
                          </label>
                          {field.multiline ? (
                            <textarea
                              rows={3}
                              value={value}
                              onChange={(event) =>
                                handlePropFieldChange(
                                  selectedSection,
                                  field.key,
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-md border border-border/70 bg-black/20 p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                              placeholder={field.placeholder}
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={(event) =>
                                handlePropFieldChange(
                                  selectedSection,
                                  field.key,
                                  event.target.value,
                                )
                              }
                              className="h-8 border-border/70 bg-black/20 text-xs"
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </aside>

        <button
          type="button"
          onClick={() => {
            setActivePanel((current) => {
              if (current === "sections") {
                return "settings";
              }

              if (current === "settings") {
                return "global";
              }

              return "sections";
            });
          }}
          className="fixed bottom-5 right-5 rounded-full border border-border/70 bg-card p-3 text-muted-foreground shadow-lg transition hover:text-foreground lg:hidden"
          aria-label="Toggle editor panel"
        >
          <SettingsIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
