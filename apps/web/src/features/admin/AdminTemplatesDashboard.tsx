"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BoxesIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  FileCode2Icon,
  GaugeIcon,
  Globe2Icon,
  Layers3Icon,
  LockIcon,
  LineChartIcon,
  RefreshCwIcon,
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

type TemplateRecord = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description: string | null;
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
    sections: Array<{
      id: string;
      type: string;
      isVisible: boolean;
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

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  toneClass: string;
};

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
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

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
                <table className="w-full min-w-210 text-left text-sm">
                  <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Template</th>
                      <th className="px-5 py-4 font-semibold">Coverage</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Usage</th>
                      <th className="px-5 py-4 font-semibold">Updated</th>
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
              This UI is admin-facing, but backend role enforcement is still the
              next required hardening step.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <LineChartIcon className="size-5 text-sky-300" />
            <CardTitle>Operator next actions</CardTitle>
            <CardDescription>
              Add approve/unpublish endpoints, template QA scoring, seed status,
              and support-impact metrics.
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
            onClick={() => window.location.assign("/help")}
          >
            Plan next admin APIs
          </Button>
        </div>
      </div>
    </div>
  );
}
