"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GlobeIcon,
  HammerIcon,
  LayoutDashboardIcon,
  PaletteIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import {
  persistAuthState,
  readStoredAuthState,
  type StoredAuthState,
} from "@/lib/auth-storage";
import { resolveSectionApiErrorMessage } from "@/lib/section-error-messages";

type SiteRecord = {
  id: string;
  name: string;
  slug: string;
  status?: string;
  themeConfig?: Record<string, unknown> | null;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  templateInstalls?: Array<{
    id: string;
    createdAt?: string;
    template?: {
      id: string;
      name: string;
      slug: string;
      tags?: Record<string, unknown> | null;
    } | null;
    version?: {
      id: string;
      version: number;
    } | null;
  }>;
};

type SiteThemeConfig = {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
};

const DEFAULT_SITE_THEME: SiteThemeConfig = {
  primaryColor: "#FF8C00",
  accentColor: "#FFD700",
  backgroundColor: "#FFFFFF",
  surfaceColor: "#F9FAFB",
  textColor: "#1A1C23",
  fontFamily: "Kanit",
};

function getSiteStatusLabel(status?: string) {
  return status?.toUpperCase() === "PUBLISHED"
    ? "เผยแพร่แล้ว"
    : "แบบร่าง";
}

function isPublished(site: SiteRecord) {
  return site.status?.toUpperCase() === "PUBLISHED";
}

function getSiteInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildPublicSiteUrl(site: SiteRecord) {
  return `https://${site.slug}.finnweb.site`;
}

function getAttachedTemplate(site: SiteRecord) {
  return site.templateInstalls?.[0] ?? null;
}

export default function SitesPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<StoredAuthState>({});
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
  const [themeDraft, setThemeDraft] =
    useState<SiteThemeConfig>(DEFAULT_SITE_THEME);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    const stored = readStoredAuthState();
    setAuthState(stored);
    setSelectedSiteId(stored.siteId ?? "");
  }, []);

  const apiBaseUrl = useMemo(
    () => authState.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    [authState.apiBaseUrl],
  );
  const accessToken = authState.accessToken ?? "";
  const workspaceId = authState.workspaceId ?? "";

  const loadSites = useCallback(
    async (preferredSiteId?: string) => {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const {
          response,
          payload,
          authState: nextAuthState,
        } = await fetchApiWithTokenRefresh({
          apiBaseUrl,
          path: "/sites",
          init: {
            cache: "no-store",
          },
        });

        if (
          nextAuthState.accessToken !== authState.accessToken ||
          nextAuthState.refreshToken !== authState.refreshToken
        ) {
          setAuthState((current) => ({
            ...current,
            accessToken: nextAuthState.accessToken,
            refreshToken: nextAuthState.refreshToken,
          }));
        }

        if (response.status === 401 && !nextAuthState.refreshToken) {
          setAuthState({});
        }

        if (!response.ok) {
          throw new Error(
            resolveSectionApiErrorMessage(
              payload,
              `Request failed with status ${response.status}`,
            ),
          );
        }

        const nextSites =
          typeof payload === "object" &&
          payload &&
          "data" in payload &&
          Array.isArray(payload.data)
            ? (payload.data as SiteRecord[])
            : [];

        setSites(nextSites);

        const targetSiteId = preferredSiteId ?? selectedSiteId;
        const nextSelectedSite =
          nextSites.find((site) => site.id === targetSiteId) ?? nextSites[0];

        if (nextSelectedSite) {
          setSelectedSiteId(nextSelectedSite.id);
          persistSelectedSite(nextSelectedSite);
        } else {
          setSelectedSiteId("");
          persistAuthState({
            apiBaseUrl,
            siteId: "",
            workspaceId: workspaceId || undefined,
          });
          setAuthState((current) => ({
            ...current,
            apiBaseUrl,
            siteId: "",
          }));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "โหลดเว็บไซต์ไม่สำเร็จ",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      accessToken,
      apiBaseUrl,
      authState.accessToken,
      authState.refreshToken,
      selectedSiteId,
      workspaceId,
    ],
  );

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId);
  const filteredSites = sites.filter((site) => {
    const searchText = `${site.name} ${site.slug} ${site.workspace?.name ?? ""}`;
    return searchText.toLowerCase().includes(query.trim().toLowerCase());
  });
  const publishedCount = sites.filter(isPublished).length;
  const draftCount = sites.length - publishedCount;

  useEffect(() => {
    setThemeDraft(normalizeSiteThemeConfig(selectedSite?.themeConfig));
  }, [selectedSite?.id, selectedSite?.themeConfig]);

  function persistSelectedSite(site: SiteRecord) {
    persistAuthState({
      apiBaseUrl,
      siteId: site.id,
      workspaceId: site.workspace?.id ?? workspaceId,
    });

    setAuthState((current) => ({
      ...current,
      apiBaseUrl,
      siteId: site.id,
      workspaceId: site.workspace?.id ?? current.workspaceId,
    }));
  }

  function handleSelectSite(site: SiteRecord) {
    setSelectedSiteId(site.id);
    setStatusMessage(`เลือก ${site.name} เป็นเว็บไซต์หลักแล้ว`);
    setErrorMessage(null);
    persistSelectedSite(site);
  }

  function openBuilder(site: SiteRecord) {
    handleSelectSite(site);
    router.push(`/sites/${site.id}/builder`);
  }

  function openLeads(site: SiteRecord) {
    handleSelectSite(site);
    router.push(`/sites/${site.id}/leads`);
  }

  function openPublicSite(site: SiteRecord) {
    window.open(buildPublicSiteUrl(site), "_blank", "noopener,noreferrer");
  }

  function updateThemeField(key: keyof SiteThemeConfig, value: string) {
    setThemeDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveThemeConfig(site: SiteRecord) {
    if (!accessToken) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนบันทึก Theme");
      return;
    }

    const nextTheme = toThemePayload(themeDraft);
    setIsSavingTheme(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: `/sites/${site.id}/theme`,
        init: {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            themeConfig: nextTheme,
          }),
        },
      });

      if (!response.ok) {
        throw new Error(
          resolveSectionApiErrorMessage(payload, "บันทึก Theme ไม่สำเร็จ"),
        );
      }

      const updatedSite =
        typeof payload === "object" &&
        payload &&
        "data" in payload &&
        payload.data &&
        typeof payload.data === "object"
          ? (payload.data as SiteRecord)
          : { ...site, themeConfig: nextTheme };

      setSites((currentSites) =>
        currentSites.map((currentSite) =>
          currentSite.id === site.id ? updatedSite : currentSite,
        ),
      );
      setThemeDraft(normalizeSiteThemeConfig(updatedSite.themeConfig));
      setStatusMessage(`บันทึก Theme ของ ${site.name} แล้ว`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "บันทึก Theme ไม่สำเร็จ",
      );
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function handleDeleteSite(site: SiteRecord) {
    if (!accessToken) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนลบเว็บไซต์");
      return;
    }

    const confirmed = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบเว็บไซต์ "${site.name}"?\nการลบนี้ไม่สามารถย้อนกลับได้`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSiteId(site.id);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: `/sites/${site.id}/delete`,
        init: {
          method: "POST",
        },
      });

      if (!response.ok) {
        throw new Error(
          resolveSectionApiErrorMessage(payload, "ลบเว็บไซต์ไม่สำเร็จ"),
        );
      }

      setStatusMessage(`ลบเว็บไซต์ ${site.name} เรียบร้อยแล้ว`);
      await loadSites(site.id === selectedSiteId ? undefined : selectedSiteId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "ลบเว็บไซต์ไม่สำเร็จ",
      );
    } finally {
      setDeletingSiteId(null);
    }
  }

  return (
    <AppPageShell
      title="เว็บไซต์ของฉัน"
      description="เลือกเว็บหลัก เปิด builder ดู lead และจัดการเว็บไซต์ทั้งหมด"
      actions={
        <Button
          className="w-full bg-linear-to-r from-primary to-[#ff4500] font-semibold text-primary-foreground sm:w-auto"
          onClick={() => router.push("/sites/create")}
        >
          <PlusIcon data-icon="inline-start" />
          สร้างเว็บไซต์
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 lg:px-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
          <Card className="overflow-hidden border-border/70 bg-card/85">
            <CardContent className="relative p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,140,0,0.2),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(255,215,0,0.11),transparent_30%)]" />
              <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-[#FFD700]">
                    <LayoutDashboardIcon className="size-3.5" />
                    Site control center
                  </div>
                  <h2 className="font-kanit text-2xl font-semibold text-foreground md:text-3xl">
                    {selectedSite
                      ? selectedSite.name
                      : "พร้อมสร้างเว็บไซต์แรกของคุณ"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {selectedSite
                      ? `${selectedSite.slug}.finnweb.site พร้อมเปิดแก้ไข เผยแพร่ และติดตาม lead ได้จากที่นี่`
                      : "สร้างเว็บไซต์จากเทมเพลต แล้วเปิด builder เพื่อปรับเนื้อหาและเผยแพร่ได้ทันที"}
                  </p>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    {selectedSite ? (
                      <>
                        <Button
                          className="bg-primary font-semibold text-primary-foreground"
                          onClick={() => openBuilder(selectedSite)}
                        >
                          <HammerIcon data-icon="inline-start" />
                          เปิด builder
                        </Button>
                        <Button
                          variant="outline"
                          className="border-border/70 bg-background/30"
                          onClick={() => openLeads(selectedSite)}
                        >
                          <BarChart3Icon data-icon="inline-start" />
                          ดู lead
                        </Button>
                        <Button
                          variant="outline"
                          className="border-border/70 bg-background/30"
                          onClick={() => openPublicSite(selectedSite)}
                        >
                          <ExternalLinkIcon data-icon="inline-start" />
                          เปิดเว็บจริง
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="bg-primary font-semibold text-primary-foreground"
                        onClick={() => router.push("/sites/create")}
                      >
                        <PlusIcon data-icon="inline-start" />
                        เริ่มสร้างเว็บ
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid min-w-52 grid-cols-3 gap-3 md:grid-cols-1">
                  <DashboardMetric label="ทั้งหมด" value={sites.length} />
                  <DashboardMetric label="เผยแพร่" value={publishedCount} />
                  <DashboardMetric label="แบบร่าง" value={draftCount} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2Icon className="size-4 text-[#FFD700]" />
                เว็บไซต์ที่ใช้งานอยู่
              </CardTitle>
              <CardDescription>
                เว็บนี้จะถูกจำไว้เป็น context หลักของ dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedSite ? (
                <div className="rounded-lg border border-border/70 bg-background/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {selectedSite.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {selectedSite.slug}.finnweb.site
                      </p>
                    </div>
                    <SiteStatusBadge site={selectedSite} />
                  </div>
                  <Button
                    className="mt-4 w-full bg-primary font-semibold text-primary-foreground"
                    onClick={() => openBuilder(selectedSite)}
                  >
                    แก้ไขเว็บไซต์นี้
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/25 p-4 text-sm text-muted-foreground">
                  ยังไม่ได้เลือกเว็บไซต์
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {selectedSite ? (
          <ThemeConfigPanel
            site={selectedSite}
            theme={themeDraft}
            isSaving={isSavingTheme}
            onChange={updateThemeField}
            onReset={() =>
              setThemeDraft(normalizeSiteThemeConfig(selectedSite.themeConfig))
            }
            onSave={() => void saveThemeConfig(selectedSite)}
          />
        ) : null}

        {errorMessage ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-4 text-sm text-destructive">
              {errorMessage}
            </CardContent>
          </Card>
        ) : null}

        {statusMessage ? (
          <Card className="border-emerald-900/60 bg-emerald-950/40">
            <CardContent className="py-4 text-sm text-emerald-200">
              {statusMessage}
            </CardContent>
          </Card>
        ) : null}

        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-kanit text-xl font-semibold">
              รายการเว็บไซต์
            </h2>
            <p className="text-sm text-muted-foreground">
              เลือกเว็บเพื่อแก้ไข ดู lead หรือเปิดหน้า public
            </p>
          </div>
          <label className="relative w-full md:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อเว็บหรือ slug"
              className="pl-9"
              aria-label="ค้นหาเว็บไซต์"
            />
          </label>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card
                  key={`site-skeleton-${index}`}
                  className="border-border/70 bg-card/85"
                >
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-36 w-full rounded-xl" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            : filteredSites.map((site) => {
                const active = selectedSiteId === site.id;

                return (
                  <Card
                    key={site.id}
                    className={`group overflow-hidden border transition-all duration-300 ${
                      active
                        ? "border-primary/60 bg-card/95 shadow-[0_22px_48px_-32px_rgba(255,140,0,0.95)]"
                        : "border-border/70 bg-card/85 hover:border-primary/35"
                    }`}
                  >
                    <CardContent className="p-0">
                      <div className="relative h-36 overflow-hidden border-b border-border/60 bg-[#1f2330]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(255,140,0,0.28),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_55%)]" />
                        <div className="absolute left-4 top-4 flex size-14 items-center justify-center rounded-xl border border-white/10 bg-white/10 font-kanit text-xl font-semibold text-white shadow-xl">
                          {getSiteInitials(site.name)}
                        </div>
                        <div className="absolute right-3 top-3">
                          <SiteStatusBadge site={site} />
                        </div>
                        {active ? (
                          <Badge className="absolute bottom-3 left-3 bg-primary text-primary-foreground">
                            ใช้งานอยู่
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-4 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold">
                            {site.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <GlobeIcon className="size-3.5" />
                            {site.slug}.finnweb.site
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            className="bg-primary font-semibold text-primary-foreground"
                            onClick={() => openBuilder(site)}
                          >
                            <HammerIcon data-icon="inline-start" />
                            Builder
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border/70 bg-background/30"
                            onClick={() => handleSelectSite(site)}
                          >
                            เลือก
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border/70 bg-background/30"
                            onClick={() => openLeads(site)}
                          >
                            <BarChart3Icon data-icon="inline-start" />
                            Lead
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border/70 bg-background/30"
                            onClick={() => openPublicSite(site)}
                          >
                            <ExternalLinkIcon data-icon="inline-start" />
                            เปิดเว็บ
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full border border-red-900/60 bg-red-950/20 text-red-300 hover:bg-red-900/40 hover:text-red-100"
                          onClick={() => void handleDeleteSite(site)}
                          disabled={deletingSiteId === site.id}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          {deletingSiteId === site.id ? "กำลังลบ" : "ลบเว็บไซต์"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </section>

        {!isLoading && filteredSites.length === 0 ? (
          <Card className="border-border/70 bg-card/85">
            <CardContent className="flex flex-col items-start gap-3 p-5 text-sm text-muted-foreground">
              <p>
                {sites.length === 0
                  ? "ยังไม่มีเว็บไซต์ สร้างเว็บแรกจากเทมเพลตได้เลย"
                  : "ไม่พบเว็บไซต์ที่ตรงกับคำค้นหา"}
              </p>
              {sites.length === 0 ? (
                <Button
                  className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                  onClick={() => router.push("/sites/create")}
                >
                  <PlusIcon data-icon="inline-start" />
                  สร้างเว็บไซต์
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppPageShell>
  );
}

function DashboardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/30 p-3">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SiteStatusBadge({ site }: { site: SiteRecord }) {
  const published = isPublished(site);

  return (
    <Badge
      className={
        published ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"
      }
    >
      {getSiteStatusLabel(site.status)}
    </Badge>
  );
}

function ThemeConfigPanel({
  site,
  theme,
  isSaving,
  onChange,
  onReset,
  onSave,
}: {
  site: SiteRecord;
  theme: SiteThemeConfig;
  isSaving: boolean;
  onChange: (key: keyof SiteThemeConfig, value: string) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const attachedTemplate = getAttachedTemplate(site);
  const attachedTheme = normalizeSiteThemeConfig(
    attachedTemplate?.template?.tags &&
      typeof attachedTemplate.template.tags === "object" &&
      "theme" in attachedTemplate.template.tags
      ? attachedTemplate.template.tags.theme
      : null,
  );
  const hasAttachedTheme = Boolean(attachedTemplate?.template?.tags);

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PaletteIcon className="size-4 text-[#FFD700]" />
              Theme config
            </CardTitle>
            <CardDescription>
              ตั้งค่าสีและฟอนต์หลักของ {site.name} สำหรับ template และ publish artifact
            </CardDescription>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-border/70 bg-background/30 px-2.5 py-1 text-muted-foreground">
                Template: {attachedTemplate?.template?.name ?? "ยังไม่ได้ attach"}
              </span>
              {attachedTemplate?.version ? (
                <span className="rounded-lg border border-border/70 bg-background/30 px-2.5 py-1 text-muted-foreground">
                  Version {attachedTemplate.version.version}
                </span>
              ) : null}
              <span className="rounded-lg border border-border/70 bg-background/30 px-2.5 py-1 text-muted-foreground">
                Theme source: {hasAttachedTheme ? "template" : "site custom"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border/70 bg-background/30"
              onClick={onReset}
              disabled={isSaving}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
            <Button
              type="button"
              className="bg-primary font-semibold text-primary-foreground"
              onClick={onSave}
              disabled={isSaving}
            >
              <SaveIcon data-icon="inline-start" />
              {isSaving ? "Saving" : "Save theme"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ThemeColorInput
            label="Primary"
            value={theme.primaryColor}
            onChange={(value) => onChange("primaryColor", value)}
          />
          <ThemeColorInput
            label="Accent"
            value={theme.accentColor}
            onChange={(value) => onChange("accentColor", value)}
          />
          <ThemeColorInput
            label="Background"
            value={theme.backgroundColor}
            onChange={(value) => onChange("backgroundColor", value)}
          />
          <ThemeColorInput
            label="Surface"
            value={theme.surfaceColor}
            onChange={(value) => onChange("surfaceColor", value)}
          />
          <ThemeColorInput
            label="Text"
            value={theme.textColor}
            onChange={(value) => onChange("textColor", value)}
          />
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Font
            </span>
            <Input
              value={theme.fontFamily}
              onChange={(event) => onChange("fontFamily", event.target.value)}
              placeholder="Kanit"
            />
          </label>
        </div>

        <div className="space-y-3">
          <ThemePreviewCard site={site} theme={theme} label="Site theme" />
          {attachedTemplate ? (
            <div className="rounded-lg border border-border/70 bg-background/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Attached template
              </p>
              <p className="mt-2 font-semibold">
                {attachedTemplate.template?.name ?? "Unknown template"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Theme tokens are copied into this site when the template is applied.
              </p>
              {hasAttachedTheme ? (
                <div className="mt-3 flex gap-1.5">
                  {[
                    attachedTheme.primaryColor,
                    attachedTheme.accentColor,
                    attachedTheme.backgroundColor,
                    attachedTheme.surfaceColor,
                    attachedTheme.textColor,
                  ].map((color) => (
                    <span
                      key={color}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ThemePreviewCard({
  site,
  theme,
  label,
}: {
  site: SiteRecord;
  theme: SiteThemeConfig;
  label: string;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: theme.backgroundColor,
        borderColor: theme.surfaceColor,
        color: theme.textColor,
        fontFamily: `${theme.fontFamily}, system-ui, sans-serif`,
      }}
    >
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: theme.surfaceColor }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          {label}
        </p>
        <h3 className="mt-2 text-xl font-semibold">{site.name}</h3>
        <p className="mt-2 text-sm opacity-75">
          สีนี้จะเป็น token หลักให้ template และ renderer ใช้ต่อ
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: theme.primaryColor,
            color: theme.backgroundColor,
          }}
        >
          Primary action
        </button>
        <span
          className="ml-3 inline-flex rounded-lg px-3 py-2 text-sm font-semibold"
          style={{ color: theme.accentColor }}
        >
          Accent
        </span>
      </div>
    </div>
  );
}

function ThemeColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          type="color"
          value={normalizeColorInput(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-11 shrink-0 rounded-lg border border-border bg-background p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function normalizeSiteThemeConfig(value: unknown): SiteThemeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SITE_THEME;
  }

  const theme = value as Record<string, unknown>;

  return {
    primaryColor:
      readThemeString(theme, "primaryColor") ||
      readThemeString(theme, "--color-primary") ||
      DEFAULT_SITE_THEME.primaryColor,
    accentColor:
      readThemeString(theme, "accentColor") ||
      readThemeString(theme, "--color-primary-light") ||
      DEFAULT_SITE_THEME.accentColor,
    backgroundColor:
      readThemeString(theme, "backgroundColor") ||
      readThemeString(theme, "--color-background") ||
      DEFAULT_SITE_THEME.backgroundColor,
    surfaceColor:
      readThemeString(theme, "surfaceColor") ||
      readThemeString(theme, "--color-surface") ||
      DEFAULT_SITE_THEME.surfaceColor,
    textColor:
      readThemeString(theme, "textColor") ||
      readThemeString(theme, "--color-text-base") ||
      DEFAULT_SITE_THEME.textColor,
    fontFamily:
      readThemeString(theme, "fontFamily") || DEFAULT_SITE_THEME.fontFamily,
  };
}

function toThemePayload(theme: SiteThemeConfig) {
  return {
    primaryColor: normalizeColorInput(theme.primaryColor),
    accentColor: normalizeColorInput(theme.accentColor),
    backgroundColor: normalizeColorInput(theme.backgroundColor),
    surfaceColor: normalizeColorInput(theme.surfaceColor),
    textColor: normalizeColorInput(theme.textColor),
    fontFamily: theme.fontFamily.trim() || DEFAULT_SITE_THEME.fontFamily,
    "--color-primary": normalizeColorInput(theme.primaryColor),
    "--color-primary-light": normalizeColorInput(theme.accentColor),
    "--color-background": normalizeColorInput(theme.backgroundColor),
    "--color-surface": normalizeColorInput(theme.surfaceColor),
    "--color-text-base": normalizeColorInput(theme.textColor),
  };
}

function readThemeString(theme: Record<string, unknown>, key: string) {
  const value = theme[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function normalizeColorInput(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : DEFAULT_SITE_THEME.primaryColor;
}
