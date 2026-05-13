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
  PlusIcon,
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
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
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
