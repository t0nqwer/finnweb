"use client";

import type { ChangeEvent, ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArchiveIcon,
  BoxesIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileCode2Icon,
  GaugeIcon,
  Globe2Icon,
  Layers3Icon,
  LockIcon,
  LineChartIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SquarePenIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import { PublicSectionRenderer } from "@/features/site-renderer/PublicSectionRenderer";

type TemplateRecord = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
  customCss?: string | null;
  status: string;
  visibility: string;
  isOfficial: boolean;
  isFree: boolean;
  installCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  businessTypes: string[];
  goals: string[];
  styles: string[];
  languages: string[];
  keywords: string[];
  category: {
    name: string;
    slug: string;
  } | null;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    path: string | null;
    pageType: string;
    isHomePage: boolean;
    isPublished: boolean;
    sortOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    ogImageUrl: string | null;
    sections: Array<{
      id: string;
      type: string;
      name: string | null;
      sortOrder: number;
      isVisible: boolean;
      props: Record<string, unknown>;
    }>;
  }>;
  updatedAt: string;
};

type SectionTemplateRecord = {
  id: string;
  code: string;
  name: string;
  sectionType: string;
  isOfficial: boolean;
  isPublished: boolean;
  activeVersion: {
    version: number;
    renderMode: string;
    htmlTemplate: string | null;
    cssTemplate: string | null;
  } | null;
  updatedAt: string;
};

type AdminOverviewResponse = {
  success?: boolean;
  data?: {
    templates?: TemplateRecord[];
    sectionTemplates?: SectionTemplateRecord[];
  };
};

type TemplateValidationIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

type TemplateValidationResult = {
  valid: boolean;
  summary: {
    errorCount: number;
    warningCount: number;
    pageCount: number;
    sectionCount: number;
  };
  issues: TemplateValidationIssue[];
};

type TemplateValidationResponse = {
  success?: boolean;
  data?: TemplateValidationResult;
};

type TemplateImportDraftResponse = {
  success?: boolean;
  data?: {
    template?: Record<string, unknown>;
    validation?: TemplateValidationResult;
    confidence?: number;
    warnings?: string[];
    source?: {
      url: string;
      extractedPageCount: number;
      extractedSectionCount: number;
    };
  };
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  toneClass: string;
};

type PreviewTemplate = {
  name: string;
  customCss?: string;
  pages: Array<{
    title?: string;
    slug?: string;
    isHomePage?: boolean;
    sections?: Array<{
      type?: string;
      name?: string;
      isVisible?: boolean;
      props?: Record<string, unknown>;
    }>;
  }>;
};

function scopeCssToPreview(css: string) {
  const source = css.trim();
  if (!source) {
    return "";
  }

  const scopedBlocks = source
    .split("}")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [selectorsPart, ...bodyParts] = block.split("{");
      if (!selectorsPart || bodyParts.length === 0) {
        return null;
      }
      const selectors = selectorsPart.trim();
      const body = bodyParts.join("{").trim();
      if (!body) {
        return null;
      }

      if (selectors.startsWith("@")) {
        return `${selectors}{${body}}`;
      }

      const scopedSelectors = selectors
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean)
        .map((selector) =>
          selector.startsWith(".fw-template-preview")
            ? selector
            : `.fw-template-preview ${selector}`,
        )
        .join(", ");

      return `${scopedSelectors}{${body}}`;
    })
    .filter((item): item is string => Boolean(item));

  return scopedBlocks.join("\n");
}

const starterTemplateJson = JSON.stringify(
  {
    name: "Restaurant lead template",
    slug: "restaurant-lead-template",
    code: "restaurant-lead-template",
    description: "Official lead generation template for Thai restaurants.",
    category: "Restaurant",
    businessTypes: ["restaurant"],
    goals: ["lead"],
    styles: ["modern"],
    languages: ["th"],
    keywords: ["restaurant", "booking", "line oa"],
    pages: [
      {
        title: "Home",
        slug: "home",
        path: "/",
        pageType: "LANDING",
        isHomePage: true,
        isPublished: true,
        sections: [
          {
            type: "NAVBAR",
            name: "Main navigation",
            props: {
              menuItems: [
                { label: "หน้าแรก", href: "/" },
                { label: "ติดต่อ", href: "#contact" },
              ],
            },
          },
          {
            type: "HERO",
            name: "Hero",
            props: {
              title: "ร้านอาหารของคุณ",
              subtitle: "รับจองโต๊ะและเก็บลูกค้าผ่าน LINE OA",
            },
          },
          {
            type: "CONTACT",
            name: "Contact",
            props: {
              title: "ติดต่อเรา",
              lineId: "@finnweb",
            },
          },
        ],
      },
    ],
  },
  null,
  2,
);

const starterCaptureJson = JSON.stringify(
  {
    sourceUrl: "https://example.com",
    name: "Example Brand",
    language: "thai",
    industry: "service",
    goals: ["leads"],
    styleKeywords: ["modern"],
    pages: [
      {
        url: "https://example.com/",
        title: "Example Brand",
        metaDescription: "High-conversion services website.",
        headings: ["Example Brand", "Services", "Contact"],
        textBlocks: [
          "We help customers understand the offer and contact the team quickly.",
          "Fast launch",
          "Clear conversion path",
        ],
        links: [
          { label: "Services", href: "#services" },
          { label: "Contact", href: "#contact" },
        ],
        images: [
          {
            url: "https://example.com/hero.jpg",
            alt: "Example Brand hero",
            width: 1600,
            height: 900,
          },
        ],
        forms: [
          {
            id: "contact-form",
            title: "Contact",
            action: "#contact",
            fields: ["name", "email", "phone"],
          },
        ],
        colorSamples: ["#1A1C23", "#2D2F39", "#FF8C00"],
        fontFamilies: ["Kanit"],
      },
    ],
  },
  null,
  2,
);

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function uniqueCount(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function getTemplateRisk(template: TemplateRecord) {
  const risks: string[] = [];

  if (template.pages.length === 0) {
    risks.push("No pages");
  }

  const sectionCount = template.pages.reduce(
    (total, page) => total + page.sections.length,
    0,
  );

  if (sectionCount < 5) {
    risks.push("Thin content");
  }

  if (template.businessTypes.length === 0 || template.goals.length === 0) {
    risks.push("Missing matching tags");
  }

  if (!template.description) {
    risks.push("No description");
  }

  return risks;
}

function getRenderModeSummary(sectionTemplates: SectionTemplateRecord[]) {
  return sectionTemplates.reduce<Record<string, number>>((summary, item) => {
    const mode = item.activeVersion?.renderMode ?? "UNKNOWN";
    summary[mode] = (summary[mode] ?? 0) + 1;
    return summary;
  }, {});
}

export function AdminTemplatesDashboard() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [sectionTemplates, setSectionTemplates] = useState<
    SectionTemplateRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [templateJson, setTemplateJson] = useState(starterTemplateJson);
  const [captureJson, setCaptureJson] = useState(starterCaptureJson);
  const [importUrl, setImportUrl] = useState("");
  const [importZipName, setImportZipName] = useState("");
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [validationResult, setValidationResult] =
    useState<TemplateValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [updatingTemplateId, setUpdatingTemplateId] = useState<string | null>(
    null,
  );

  const apiBaseUrl = useMemo(() => {
    const stored = readStoredAuthState();
    return normalizeApiBaseUrl(stored.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  }, []);

  async function loadAdminData() {
    const stored = readStoredAuthState();

    if (!stored.accessToken) {
      setIsLoading(false);
      setIsForbidden(false);
      setErrorMessage("Please log in before opening the admin dashboard.");
      return;
    }

    setIsLoading(true);
    setIsForbidden(false);
    setErrorMessage(null);

    try {
      const overviewRequest =
        await fetchApiWithTokenRefresh<AdminOverviewResponse>({
          apiBaseUrl,
          path: "/admin/templates/overview",
          init: { cache: "no-store" },
        });

      if (overviewRequest.response.status === 403) {
        setIsForbidden(true);
        setErrorMessage("This dashboard is available to FinnWeb admins only.");
        setTemplates([]);
        setSectionTemplates([]);
        return;
      }

      if (!overviewRequest.response.ok) {
        throw new Error("Could not load admin template overview.");
      }

      setTemplates(
        Array.isArray(overviewRequest.payload.data?.templates)
          ? overviewRequest.payload.data.templates
          : [],
      );
      setSectionTemplates(
        Array.isArray(overviewRequest.payload.data?.sectionTemplates)
          ? overviewRequest.payload.data.sectionTemplates
          : [],
      );
      setLastLoadedAt(new Date().toISOString());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Admin dashboard data could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, []);

  function parseTemplateJson() {
    try {
      return JSON.parse(templateJson) as Record<string, unknown>;
    } catch {
      throw new Error("Template JSON is not valid.");
    }
  }

  function parseCaptureJson() {
    try {
      return JSON.parse(captureJson) as Record<string, unknown>;
    } catch {
      throw new Error("Capture JSON is not valid.");
    }
  }

  function loadTemplateForEdit(template: TemplateRecord) {
    setEditingTemplateId(template.id);
    setValidationResult(null);
    setActionMessage(`Editing ${template.name}. Save will create a new active version.`);
    setTemplateJson(
      JSON.stringify(
        {
          name: template.name,
          slug: template.slug,
          code: template.code,
          description: template.description ?? undefined,
          category: template.category?.name,
          businessTypes: template.businessTypes,
          goals: template.goals,
          styles: template.styles,
          languages: template.languages,
          keywords: template.keywords,
          customCss: template.customCss ?? undefined,
          pages: template.pages.map((page) => ({
            title: page.title,
            slug: page.slug,
            path: page.path ?? undefined,
            pageType: page.pageType,
            isHomePage: page.isHomePage,
            isPublished: page.isPublished,
            sortOrder: page.sortOrder,
            seoTitle: page.seoTitle ?? undefined,
            seoDescription: page.seoDescription ?? undefined,
            seoKeywords: page.seoKeywords ?? undefined,
            ogImageUrl: page.ogImageUrl ?? undefined,
            sections: page.sections.map((section) => ({
              type: section.type,
              name: section.name ?? undefined,
              sortOrder: section.sortOrder,
              isVisible: section.isVisible,
              props: section.props ?? {},
            })),
          })),
        },
        null,
        2,
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function validateTemplateDraft() {
    const payload = parseTemplateJson();

    setIsValidating(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchApiWithTokenRefresh<TemplateValidationResponse>({
        apiBaseUrl,
        path: "/admin/templates/validate",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      });

      if (!response.response.ok || !response.payload.data) {
        throw new Error("Template validation failed.");
      }

      setValidationResult(response.payload.data);
      setActionMessage(
        response.payload.data.valid
          ? "Template structure is usable."
          : "Template has validation errors.",
      );
      return response.payload.data;
    } finally {
      setIsValidating(false);
    }
  }

  async function generateTemplateDraftFromCapture() {
    const payload = parseCaptureJson();

    setIsGeneratingDraft(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchApiWithTokenRefresh<TemplateImportDraftResponse>({
        apiBaseUrl,
        path: "/admin/templates/import-draft",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      });

      const data = response.payload.data;
      if (!response.response.ok || !data?.template || !data.validation) {
        throw new Error("Could not generate template draft.");
      }

      setEditingTemplateId(null);
      setTemplateJson(JSON.stringify(data.template, null, 2));
      setValidationResult(data.validation);
      setActionMessage(
        `Generated draft with ${Math.round((data.confidence ?? 0) * 100)}% confidence.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not generate template draft.",
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function generateTemplateDraftFromUrl() {
    const url = importUrl.trim();
    if (!url) {
      setErrorMessage("Please enter a website URL.");
      return;
    }

    setIsImportingUrl(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchApiWithTokenRefresh<TemplateImportDraftResponse>({
        apiBaseUrl,
        path: "/admin/templates/import-from-url",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        },
      });

      const data = response.payload.data;
      if (!response.response.ok || !data?.template || !data.validation) {
        throw new Error("Could not import from URL.");
      }

      setEditingTemplateId(null);
      setTemplateJson(JSON.stringify(data.template, null, 2));
      setValidationResult(data.validation);
      setActionMessage(
        `Imported from URL with ${Math.round((data.confidence ?? 0) * 100)}% confidence.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not import from URL.",
      );
    } finally {
      setIsImportingUrl(false);
    }
  }

  async function importTemplateZip(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImportingZip(true);
    setActionMessage(null);
    setErrorMessage(null);
    setImportZipName(file.name);

    try {
      const raw = await file.arrayBuffer();
      const bytes = new Uint8Array(raw);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i] ?? 0);
      }
      const zipBase64 = window.btoa(binary);

      const response = await fetchApiWithTokenRefresh<TemplateImportDraftResponse>({
        apiBaseUrl,
        path: "/admin/templates/import-from-zip",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            zipBase64,
          }),
        },
      });

      const data = response.payload.data;
      if (!response.response.ok || !data?.template || !data.validation) {
        throw new Error("Could not import ZIP.");
      }

      setEditingTemplateId(null);
      setTemplateJson(JSON.stringify(data.template, null, 2));
      setValidationResult(data.validation);
      setActionMessage(
        `Imported ZIP with ${Math.round((data.confidence ?? 0) * 100)}% confidence.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not import ZIP.",
      );
    } finally {
      event.target.value = "";
      setIsImportingZip(false);
    }
  }

  async function saveOfficialTemplate() {
    setIsSavingTemplate(true);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const validation = await validateTemplateDraft();
      if (!validation.valid) {
        return;
      }

      const payload = parseTemplateJson();
      const response = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: editingTemplateId
          ? `/admin/templates/${editingTemplateId}`
          : "/admin/templates",
        init: {
          method: editingTemplateId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      });

      if (!response.response.ok) {
        throw new Error("Could not save official template.");
      }

      setActionMessage(
        editingTemplateId
          ? "Template edits saved as a new active version."
          : "Official template saved and published.",
      );
      setEditingTemplateId(null);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save template.",
      );
    } finally {
      setIsSavingTemplate(false);
    }
  }

  const parsedPreview = useMemo(() => {
    try {
      const payload = JSON.parse(templateJson) as Record<string, unknown>;
      const rawPages = Array.isArray(payload.pages) ? payload.pages : [];
      const pages = rawPages
        .filter((page): page is Record<string, unknown> => Boolean(page) && typeof page === "object")
        .map((page) => {
          const rawSections = Array.isArray(page.sections) ? page.sections : [];
          const sections = rawSections
            .filter(
              (section): section is Record<string, unknown> =>
                Boolean(section) && typeof section === "object",
            )
            .map((section) => ({
              type: typeof section.type === "string" ? section.type : "CONTENT",
              name: typeof section.name === "string" ? section.name : undefined,
              isVisible:
                typeof section.isVisible === "boolean"
                  ? section.isVisible
                  : undefined,
              props:
                section.props && typeof section.props === "object"
                  ? (section.props as Record<string, unknown>)
                  : {},
            }));

          return {
            title: typeof page.title === "string" ? page.title : undefined,
            slug: typeof page.slug === "string" ? page.slug : undefined,
            isHomePage:
              typeof page.isHomePage === "boolean" ? page.isHomePage : false,
            sections,
          };
        });

      return {
        name:
          typeof payload.name === "string" ? payload.name : "Untitled template",
        customCss:
          typeof payload.customCss === "string" ? payload.customCss : undefined,
        pages,
      } satisfies PreviewTemplate;
    } catch {
      return null;
    }
  }, [templateJson]);

  const visualPreviewSections = useMemo(() => {
    if (!parsedPreview) {
      return [];
    }

    const targetPage =
      parsedPreview.pages.find((page) => page.isHomePage) ??
      parsedPreview.pages[0];

    if (!targetPage?.sections?.length) {
      return [];
    }

    return targetPage.sections
      .filter((section) => section.isVisible !== false)
      .map((section, index) => ({
        id: `preview-${index + 1}`,
        type: section.type ?? "CONTENT",
        name: section.name ?? null,
        isVisible: true,
        props: section.props ?? {},
      }));
  }, [parsedPreview]);

  async function updateTemplateStatus(
    templateId: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  ) {
    setUpdatingTemplateId(templateId);
    setActionMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: `/admin/templates/${templateId}/status`,
        init: {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      });

      if (!response.response.ok) {
        throw new Error("Could not update template status.");
      }

      setActionMessage(
        status === "PUBLISHED"
          ? "Template is now usable."
          : status === "DRAFT"
            ? "Template is marked not used."
            : "Template archived.",
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not update template status.",
      );
    } finally {
      setUpdatingTemplateId(null);
    }
  }

  const officialTemplates = templates.filter((item) => item.isOfficial);
  const customTemplates = templates.filter((item) => !item.isOfficial);
  const publishedTemplates = templates.filter(
    (item) => item.status === "PUBLISHED",
  );
  const templateRisks = templates
    .map((template) => ({
      template,
      risks: getTemplateRisk(template),
    }))
    .filter((item) => item.risks.length > 0);
  const renderModeSummary = getRenderModeSummary(sectionTemplates);
  const sectionTypes = uniqueCount(
    sectionTemplates.map((item) => item.sectionType),
  );

  const stats: DashboardStat[] = [
    {
      label: "Website templates",
      value: templates.length.toLocaleString("th-TH"),
      detail: `${officialTemplates.length} official, ${customTemplates.length} custom`,
      icon: BoxesIcon,
      toneClass: "text-orange-300",
    },
    {
      label: "Published library",
      value: publishedTemplates.length.toLocaleString("th-TH"),
      detail: `${templates.length - publishedTemplates.length} draft or hidden`,
      icon: CheckCircle2Icon,
      toneClass: "text-emerald-300",
    },
    {
      label: "Section templates",
      value: sectionTemplates.length.toLocaleString("th-TH"),
      detail: `${sectionTypes} section types covered`,
      icon: Layers3Icon,
      toneClass: "text-sky-300",
    },
    {
      label: "Review flags",
      value: templateRisks.length.toLocaleString("th-TH"),
      detail: "Quality, metadata, or content checks",
      icon: AlertTriangleIcon,
      toneClass: templateRisks.length > 0 ? "text-amber-300" : "text-emerald-300",
    },
  ];

  const controlAreas = [
    {
      title: "Template publishing",
      description:
        "Review official templates, matching tags, page coverage, and section density before they appear in create-site flow.",
      status: `${publishedTemplates.length}/${templates.length || 0} live`,
      icon: Globe2Icon,
    },
    {
      title: "Section renderer safety",
      description:
        "Track SAFE_HTML versus structured render modes so the builder stays stable while the library scales.",
      status: Object.entries(renderModeSummary)
        .map(([mode, count]) => `${mode}: ${count}`)
        .join("  ") || "No versions",
      icon: FileCode2Icon,
    },
    {
      title: "Plan and quota control",
      description:
        "Keep Free, Basic, Business, and Pro limits aligned with template creation, LINE OA quota, and site caps.",
      status: "Uses billing plan usage APIs",
      icon: GaugeIcon,
    },
    {
      title: "Release readiness",
      description:
        "Admin should watch staging deploy status, template seed health, public rendering, leads, and support impact.",
      status: "Checklist driven",
      icon: ActivityIcon,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-primary/18 text-primary hover:bg-primary/18">
              Admin control room
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-black/20">
              Templates V1
            </Badge>
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">
            Manage the template engine that controls FinnWeb
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            One place for admins to watch official templates, reusable section
            templates, launch quality, and the operational controls that affect
            every customer site.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {lastLoadedAt ? (
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(lastLoadedAt)}
            </span>
          ) : null}
          <Button
            variant="outline"
            className="border-border/70 bg-black/10"
            onClick={() => void loadAdminData()}
            disabled={isLoading}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card
          className={
            isForbidden
              ? "border-amber-500/40 bg-amber-950/25"
              : "border-destructive/50 bg-destructive/10"
          }
        >
          <CardContent
            className={
              isForbidden
                ? "flex items-center gap-3 py-4 text-sm text-amber-100"
                : "py-4 text-sm text-destructive"
            }
          >
            {isForbidden ? <LockIcon className="size-4 shrink-0" /> : null}
            <span>{errorMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      {actionMessage ? (
        <Card className="border-emerald-500/35 bg-emerald-950/25">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-emerald-100">
            <CheckCircle2Icon className="size-4 shrink-0" />
            <span>{actionMessage}</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/70 bg-card/85">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="text-xs uppercase tracking-wider">
                  {stat.label}
                </CardDescription>
                <span className={`rounded-lg bg-black/20 p-2 ${stat.toneClass}`}>
                  <stat.icon className="size-4" />
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-5 w-36" />
              ) : (
                <p className="text-sm text-muted-foreground">{stat.detail}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/85">
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Template import workspace</CardTitle>
              <CardDescription>
                {editingTemplateId
                  ? "Review the draft, validate it, then save a new official version."
                  : "Import a site, review the preview, then save only when it is ready."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {validationResult ? (
                <Badge
                  className={
                    validationResult.valid
                      ? "rounded-full bg-emerald-600 text-white"
                      : "rounded-full bg-red-600 text-white"
                  }
                >
                  {validationResult.valid ? "Valid" : "Needs fixes"}
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full bg-black/20">
                  Not validated
                </Badge>
              )}
              <Button
                variant="outline"
                className="border-border/70 bg-black/10"
                disabled={isValidating || isSavingTemplate}
                onClick={() =>
                  void validateTemplateDraft().catch((error) =>
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Template validation failed.",
                    ),
                  )
                }
              >
                <CheckCircle2Icon data-icon="inline-start" />
                {isValidating ? "Validating" : "Validate"}
              </Button>
              <Button
                className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                disabled={isSavingTemplate || isValidating}
                onClick={() => void saveOfficialTemplate()}
              >
                <SaveIcon data-icon="inline-start" />
                {isSavingTemplate
                  ? "Saving"
                  : editingTemplateId
                    ? "Save version"
                    : "Save official"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.55fr)]">
            <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">1. Import source</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    URL is the fastest path. ZIP keeps local HTML, CSS, and animation assets together.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTemplateJson(starterTemplateJson);
                    setEditingTemplateId(null);
                    setValidationResult(null);
                  }}
                >
                  <PlusIcon data-icon="inline-start" />
                  Reset
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  value={importUrl}
                  onChange={(event) => setImportUrl(event.target.value)}
                  placeholder="https://your-site.com"
                  className="h-11 rounded-lg border border-border/70 bg-background/60 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                  aria-label="Import from website URL"
                />
                <Button
                  className="h-11 bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                  disabled={
                    isImportingUrl ||
                    isGeneratingDraft ||
                    isImportingZip ||
                    isSavingTemplate
                  }
                  onClick={() => void generateTemplateDraftFromUrl()}
                >
                  <Globe2Icon data-icon="inline-start" />
                  {isImportingUrl ? "Importing" : "Import URL"}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label
                  htmlFor="template-zip-input"
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-black/10 px-3 text-sm transition hover:bg-black/20"
                >
                  <FileCode2Icon className="size-4" />
                  {isImportingZip ? "Importing ZIP" : "Import ZIP"}
                </label>
                <input
                  id="template-zip-input"
                  type="file"
                  accept=".zip,application/zip"
                  className="sr-only"
                  onChange={(event) => {
                    void importTemplateZip(event);
                  }}
                />
                <span className="text-xs leading-5 text-muted-foreground">
                  {importZipName || "Accepts HTML, CSS, JS, Lottie, image, and video assets."}
                </span>
              </div>

              <details className="mt-4 rounded-lg border border-border/60 bg-background/35">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  Advanced: capture JSON
                </summary>
                <div className="border-t border-border/60 p-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/70 bg-black/10"
                      disabled={isGeneratingDraft}
                      onClick={() => {
                        setCaptureJson(starterCaptureJson);
                      }}
                    >
                      <FileCode2Icon data-icon="inline-start" />
                      Example
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border/70 bg-black/10"
                      disabled={
                        isGeneratingDraft ||
                        isSavingTemplate ||
                        isValidating ||
                        isImportingUrl ||
                        isImportingZip
                      }
                      onClick={() => void generateTemplateDraftFromCapture()}
                    >
                      <SparklesIcon data-icon="inline-start" />
                      {isGeneratingDraft ? "Generating" : "Generate draft"}
                    </Button>
                  </div>
                  <textarea
                    value={captureJson}
                    onChange={(event) => {
                      setCaptureJson(event.target.value);
                    }}
                    spellCheck={false}
                    className="min-h-48 w-full resize-y rounded-lg border border-border/70 bg-black/25 p-3 font-mono text-xs leading-6 text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                    aria-label="Website capture JSON"
                  />
                </div>
              </details>
            </div>

            <div className="rounded-lg border border-border/70 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">2. Draft controls</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Most review happens in preview. Open JSON only for precise edits.
                  </p>
                </div>
                {parsedPreview?.customCss?.trim() ? (
                  <Badge className="rounded-full bg-primary/18 text-primary hover:bg-primary/18">
                    Custom CSS
                  </Badge>
                ) : null}
              </div>

              <details className="mt-4 rounded-lg border border-border/60 bg-background/35">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  Advanced: template JSON editor
                </summary>
                <div className="border-t border-border/60 p-3">
                  <textarea
                    value={templateJson}
                    onChange={(event) => {
                      setTemplateJson(event.target.value);
                      setValidationResult(null);
                    }}
                    spellCheck={false}
                    className="min-h-105 w-full resize-y rounded-lg border border-border/70 bg-black/20 p-4 font-mono text-xs leading-6 text-foreground outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
                    aria-label="Template JSON"
                  />
                </div>
              </details>
            </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-black/10 p-4">
              <p className="font-semibold">Validation result</p>
              {validationResult ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-muted-foreground">Errors</p>
                      <p className="mt-1 text-xl font-bold text-red-200">
                        {validationResult.summary.errorCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-muted-foreground">Warnings</p>
                      <p className="mt-1 text-xl font-bold text-amber-200">
                        {validationResult.summary.warningCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-muted-foreground">Pages</p>
                      <p className="mt-1 text-xl font-bold">
                        {validationResult.summary.pageCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="text-muted-foreground">Sections</p>
                      <p className="mt-1 text-xl font-bold">
                        {validationResult.summary.sectionCount}
                      </p>
                    </div>
                  </div>
                  <div className="max-h-86 space-y-2 overflow-y-auto pr-1">
                    {validationResult.issues.length === 0 ? (
                      <div className="rounded-lg border border-emerald-500/35 bg-emerald-950/25 p-3 text-sm text-emerald-100">
                        Structure is valid and ready to save.
                      </div>
                    ) : (
                      validationResult.issues.map((issue) => (
                        <div
                          key={`${issue.code}-${issue.path}-${issue.message}`}
                          className={
                            issue.severity === "error"
                              ? "rounded-lg border border-red-500/35 bg-red-950/25 p-3"
                              : "rounded-lg border border-amber-500/35 bg-amber-950/25 p-3"
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{issue.code}</p>
                            <Badge
                              className={
                                issue.severity === "error"
                                  ? "rounded-full bg-red-600 text-white"
                                  : "rounded-full bg-amber-600 text-white"
                              }
                            >
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {issue.path}
                          </p>
                          <p className="mt-2 text-sm">{issue.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Validate after importing or editing. Save stays available for admins, but invalid drafts will be rejected by the API.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-black/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold">3. Review preview</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Desktop-size canvas for checking layout, imported CSS, and the generated home page.
                </p>
              </div>
              {parsedPreview ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="w-fit rounded-full bg-black/20">
                    {parsedPreview.pages.length} pages
                  </Badge>
                  <Badge variant="secondary" className="w-fit rounded-full bg-black/20">
                    1280px desktop
                  </Badge>
                </div>
              ) : null}
            </div>

            {parsedPreview ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-muted-foreground">Template</p>
                    <p className="mt-1 truncate font-semibold">{parsedPreview.name}</p>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-muted-foreground">Pages</p>
                    <p className="mt-1 font-semibold">{parsedPreview.pages.length}</p>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-muted-foreground">Sections</p>
                    <p className="mt-1 font-semibold">
                      {parsedPreview.pages.reduce(
                        (total, page) => total + (page.sections?.length ?? 0),
                        0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-muted-foreground">CSS</p>
                    <p className="mt-1 font-semibold">
                      {parsedPreview.customCss?.trim() ? "Imported" : "None"}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/70 bg-[#11131a] p-3">
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-200">
                      Live visual preview
                    </p>
                    <span className="text-xs text-slate-400">Home page</span>
                  </div>
                  {visualPreviewSections.length > 0 ? (
                    <div className="mx-auto mt-3 w-[1280px] max-w-none overflow-hidden rounded-md bg-white shadow-2xl shadow-black/35">
                      <div className="flex h-8 items-center gap-2 border-b border-slate-200 bg-slate-100 px-3">
                        <span className="size-2.5 rounded-full bg-red-400" />
                        <span className="size-2.5 rounded-full bg-amber-400" />
                        <span className="size-2.5 rounded-full bg-emerald-400" />
                        <span className="ml-3 truncate text-xs text-slate-500">
                          {parsedPreview.name}
                        </span>
                      </div>
                      <div className="fw-template-preview max-h-[720px] overflow-y-auto">
                      {parsedPreview.customCss?.trim() ? (
                        <style>{scopeCssToPreview(parsedPreview.customCss)}</style>
                      ) : null}
                      <PublicSectionRenderer
                        sections={visualPreviewSections}
                        siteId="template-preview"
                        pageId="template-preview-home"
                      />
                      </div>
                    </div>
                  ) : (
                    <p className="px-3 py-8 text-sm text-muted-foreground">
                      No visible sections to render yet.
                    </p>
                  )}
                </div>

                <details className="rounded-lg border border-border/60 bg-background/35">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                    Page structure
                  </summary>
                  <div className="max-h-52 space-y-2 overflow-y-auto border-t border-border/60 p-3">
                    {parsedPreview.pages.map((page, pageIndex) => (
                      <div
                        key={`${page.title ?? "page"}-${pageIndex}`}
                        className="rounded-lg border border-border/70 bg-black/10 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {page.title ?? `Page ${pageIndex + 1}`}
                          </p>
                          {page.isHomePage ? (
                            <Badge className="rounded-full bg-primary/18 text-primary hover:bg-primary/18">
                              Home
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(page.sections ?? []).map((section, sectionIndex) => (
                            <Badge
                              key={`${section.type ?? "section"}-${sectionIndex}`}
                              variant="secondary"
                              className={
                                section.isVisible === false
                                  ? "rounded-full bg-black/20 text-muted-foreground"
                                  : "rounded-full bg-black/30"
                              }
                            >
                              {section.type ?? "UNKNOWN"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-red-500/35 bg-red-950/25 p-3 text-sm text-red-100">
                JSON cannot be previewed until syntax is valid.
              </p>
            )}

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Template inventory</CardTitle>
                <CardDescription>
                  Official and custom templates visible through the template API.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full bg-black/20">
                {templates.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-18 w-full rounded-lg" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No templates found. Seed official templates before opening this
                surface to operators.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-250 text-left text-sm">
                  <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Template</th>
                      <th className="px-5 py-4 font-semibold">Coverage</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Usage</th>
                      <th className="px-5 py-4 font-semibold">Updated</th>
                      <th className="px-5 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => {
                      const sectionCount = template.pages.reduce(
                        (total, page) => total + page.sections.length,
                        0,
                      );
                      const risks = getTemplateRisk(template);

                      return (
                        <tr
                          key={template.id}
                          className="border-b border-border/40 last:border-0 hover:bg-black/10"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold">{template.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {template.slug} · {template.category?.name ?? "No category"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(template.businessTypes.length
                                ? template.businessTypes
                                : ["no-business-tag"]
                              )
                                .slice(0, 3)
                                .map((tag) => (
                                  <Badge
                                    key={`${template.id}-${tag}`}
                                    variant="secondary"
                                    className="rounded-full bg-black/20 text-[11px]"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            <p>{template.pages.length} pages</p>
                            <p>{sectionCount} sections</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-start gap-2">
                              <Badge
                                className={
                                  template.status === "PUBLISHED"
                                    ? "rounded-full bg-emerald-600 text-white"
                                    : "rounded-full bg-amber-600 text-white"
                                }
                              >
                                {template.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {template.visibility}
                              </span>
                              {risks.length > 0 ? (
                                <span className="text-xs text-amber-200">
                                  {risks.join(", ")}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            <p>{template.installCount} installs</p>
                            <p>
                              {template.ratingAvg
                                ? `${template.ratingAvg.toFixed(1)} rating`
                                : "No rating"}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            {formatDate(template.updatedAt)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-border/70 bg-black/10"
                                disabled={updatingTemplateId === template.id}
                                onClick={() => loadTemplateForEdit(template)}
                              >
                                <SquarePenIcon data-icon="inline-start" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-emerald-500/35 bg-emerald-950/20 text-emerald-100"
                                disabled={
                                  updatingTemplateId === template.id ||
                                  template.status === "PUBLISHED"
                                }
                                onClick={() =>
                                  void updateTemplateStatus(
                                    template.id,
                                    "PUBLISHED",
                                  )
                                }
                              >
                                <PlayCircleIcon data-icon="inline-start" />
                                Use
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-amber-500/35 bg-amber-950/20 text-amber-100"
                                disabled={
                                  updatingTemplateId === template.id ||
                                  template.status === "DRAFT"
                                }
                                onClick={() =>
                                  void updateTemplateStatus(template.id, "DRAFT")
                                }
                              >
                                <PauseCircleIcon data-icon="inline-start" />
                                Not use
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-red-500/35 bg-red-950/20 text-red-100"
                                disabled={
                                  updatingTemplateId === template.id ||
                                  template.status === "ARCHIVED"
                                }
                                onClick={() =>
                                  window.confirm(
                                    `Archive template "${template.name}"? It will disappear from customer template selection.`,
                                  ) &&
                                  void updateTemplateStatus(
                                    template.id,
                                    "ARCHIVED",
                                  )
                                }
                              >
                                <ArchiveIcon data-icon="inline-start" />
                                Archive
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border/70 bg-card/85">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Admin controls map</CardTitle>
              <CardDescription>
                What the app controller should keep an eye on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {controlAreas.map((area) => (
                <div
                  key={area.title}
                  className="rounded-lg border border-border/70 bg-black/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-black/25 p-2 text-primary">
                      <area.icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{area.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {area.description}
                      </p>
                      <Badge
                        variant="secondary"
                        className="mt-3 rounded-full bg-black/20"
                      >
                        {area.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Section template renderer</CardTitle>
              <CardDescription>
                Version and render-mode visibility for reusable sections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                [0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-14 w-full rounded-lg" />
                ))
              ) : sectionTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  No section templates found.
                </div>
              ) : (
                sectionTemplates.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-black/10 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.sectionType} · v{item.activeVersion?.version ?? "-"}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0 rounded-full bg-primary/18 text-primary hover:bg-primary/18"
                    >
                      {item.activeVersion?.renderMode ?? "UNKNOWN"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <DatabaseIcon className="size-5 text-primary" />
            <CardTitle>Source of truth</CardTitle>
            <CardDescription>
              `project-context/tasks.json`, Prisma seeds, and template API data
              must stay aligned.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <ShieldCheckIcon className="size-5 text-emerald-300" />
            <CardTitle>Access boundary</CardTitle>
            <CardDescription>
              Admin APIs are protected by platform role checks and do not rely
              on sidebar visibility.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <LineChartIcon className="size-5 text-sky-300" />
            <CardTitle>Operator next actions</CardTitle>
            <CardDescription>
              Add visual preview QA, seed status, install analytics, and support
              impact metrics.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <SparklesIcon className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Admin dashboard baseline is ready.</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                It exposes the data admins need today and makes the missing
                control endpoints visible instead of hiding them in the codebase.
              </p>
            </div>
          </div>
          <Button
            className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Add another template
          </Button>
        </div>
      </div>
    </div>
  );
}
