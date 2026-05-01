"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  Edit3Icon,
  ExternalLinkIcon,
  FlameIcon,
  GlobeIcon,
  MousePointer2Icon,
  PlusIcon,
  TrendingUpIcon,
  UsersIcon,
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

type SiteRecord = {
  id: string;
  name: string;
  slug: string;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
};

type LeadItem = {
  id: string;
  createdAt: string;
  form: {
    id: string;
    name: string;
  };
  page: {
    id: string;
    title: string;
    slug: string;
    path: string | null;
  } | null;
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    message: string | null;
  };
};

type LeadsResponse = {
  total: number;
  items: LeadItem[];
};

type PlanUsageResponse = {
  limits: {
    maxSites: number;
    allowAnalytics: boolean;
    lineOaMonthlyQuota: number | null;
    lineOaUnlimited: boolean;
    supportTier: string;
    trackingLevel: string;
    analyticsLevel: string;
  };
  usage: {
    sites: number;
    lineOaMonthlyUsed: number;
    lineOaMonthlyRemaining: number | null;
    lineOaQuotaReached: boolean;
  };
};

type SubscriptionResponse = {
  planCode: string;
  planName: string;
  status: string;
};

type SiteLeadSummary = {
  siteId: string;
  total: number;
};

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "-";
  }

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return `${seconds} วินาทีที่แล้ว`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} นาทีที่แล้ว`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ชั่วโมงที่แล้ว`;
  }

  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function computeTrend(totalLeads: number, recentCount: number) {
  if (totalLeads <= 0) {
    return "+0%";
  }

  const ratio = Math.round((recentCount / totalLeads) * 100);
  return `+${ratio}%`;
}

export function DashboardHomeContent() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [userName, setUserName] = useState("ผู้ใช้งาน");
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadItem[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [siteLeadSummary, setSiteLeadSummary] = useState<SiteLeadSummary[]>([]);
  const [planUsage, setPlanUsage] = useState<PlanUsageResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedApiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );

  useEffect(() => {
    const stored = readStoredAuthState();

    if (stored.apiBaseUrl) {
      setApiBaseUrl(stored.apiBaseUrl);
    }
    if (stored.accessToken) {
      setAccessToken(stored.accessToken);
    }
    if (stored.workspaceId) {
      setWorkspaceId(stored.workspaceId);
    }
    if (stored.siteId) {
      setSelectedSiteId(stored.siteId);
    }
    if (stored.user?.name) {
      setUserName(stored.user.name);
    }
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const sitesRequest = await fetchApiWithTokenRefresh<{
          data?: SiteRecord[];
        }>({
          apiBaseUrl: normalizedApiBaseUrl,
          path: "/sites",
          init: {
            cache: "no-store",
          },
        });

        if (!sitesRequest.response.ok) {
          throw new Error("ไม่สามารถโหลดรายการเว็บไซต์ได้");
        }

        if (
          sitesRequest.authState.accessToken &&
          sitesRequest.authState.accessToken !== accessToken
        ) {
          setAccessToken(sitesRequest.authState.accessToken);
        }

        const nextSites = Array.isArray(sitesRequest.payload?.data)
          ? sitesRequest.payload.data
          : [];
        setSites(nextSites);

        const activeSite =
          nextSites.find((site) => site.id === selectedSiteId) ??
          nextSites[0] ??
          null;
        const nextSiteId = activeSite?.id ?? "";
        const nextWorkspaceId = activeSite?.workspace?.id ?? workspaceId;

        if (nextSiteId && nextSiteId !== selectedSiteId) {
          setSelectedSiteId(nextSiteId);
        }

        if (nextWorkspaceId && nextWorkspaceId !== workspaceId) {
          setWorkspaceId(nextWorkspaceId);
        }

        const requests: Array<Promise<void>> = [];

        if (nextSiteId) {
          requests.push(
            (async () => {
              const leadsRequest =
                await fetchApiWithTokenRefresh<LeadsResponse>({
                  apiBaseUrl: normalizedApiBaseUrl,
                  path: `/sites/${nextSiteId}/leads?limit=5`,
                  init: {
                    cache: "no-store",
                  },
                });

              if (!leadsRequest.response.ok) {
                throw new Error("ไม่สามารถโหลดรายชื่อลูกค้าล่าสุดได้");
              }

              if (
                leadsRequest.authState.accessToken &&
                leadsRequest.authState.accessToken !== accessToken
              ) {
                setAccessToken(leadsRequest.authState.accessToken);
              }

              const items = Array.isArray(leadsRequest.payload.items)
                ? leadsRequest.payload.items
                : [];
              setRecentLeads(items);
              setTotalLeads(
                typeof leadsRequest.payload.total === "number"
                  ? leadsRequest.payload.total
                  : items.length,
              );
            })(),
          );
        } else {
          setRecentLeads([]);
          setTotalLeads(0);
        }

        if (nextWorkspaceId) {
          requests.push(
            (async () => {
              const usageRequest =
                await fetchApiWithTokenRefresh<PlanUsageResponse>({
                  apiBaseUrl: normalizedApiBaseUrl,
                  path: `/billing/plan-usage?workspaceId=${nextWorkspaceId}`,
                  init: {
                    cache: "no-store",
                  },
                });

              if (usageRequest.response.ok) {
                setPlanUsage(usageRequest.payload);
              }

              const subscriptionRequest =
                await fetchApiWithTokenRefresh<SubscriptionResponse>({
                  apiBaseUrl: normalizedApiBaseUrl,
                  path: `/billing/subscription?workspaceId=${nextWorkspaceId}`,
                  init: {
                    cache: "no-store",
                  },
                });

              if (subscriptionRequest.response.ok) {
                setSubscription(subscriptionRequest.payload);
              }
            })(),
          );
        } else {
          setPlanUsage(null);
          setSubscription(null);
        }

        requests.push(
          (async () => {
            const summaries = await Promise.all(
              nextSites.slice(0, 3).map(async (site) => {
                const response = await fetchApiWithTokenRefresh<LeadsResponse>({
                  apiBaseUrl: normalizedApiBaseUrl,
                  path: `/sites/${site.id}/leads?limit=1`,
                  init: {
                    cache: "no-store",
                  },
                });

                return {
                  siteId: site.id,
                  total:
                    response.response.ok &&
                    typeof response.payload.total === "number"
                      ? response.payload.total
                      : 0,
                };
              }),
            );

            setSiteLeadSummary(summaries);
          })(),
        );

        await Promise.all(requests);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูล",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [accessToken, normalizedApiBaseUrl, selectedSiteId, workspaceId]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId);

  const insightText = useMemo(() => {
    const ranked = [...siteLeadSummary].sort(
      (left, right) => right.total - left.total,
    );
    const topSite = ranked[0];

    if (!topSite) {
      return "เพิ่มหน้า Landing Page พร้อมฟอร์มติดต่อเพื่อเริ่มเก็บลีดได้ทันที";
    }

    const siteInfo = sites.find((site) => site.id === topSite.siteId);
    if (!siteInfo) {
      return "กำลังเตรียม insight สำหรับเว็บไซต์ของคุณ";
    }

    return `เว็บไซต์ "${siteInfo.name}" มีลีดสะสม ${topSite.total} ราย แนะนำเพิ่ม CTA ที่เด่นขึ้นในหน้าแรกเพื่อเร่ง conversion`;
  }, [siteLeadSummary, sites]);

  const stats = useMemo(() => {
    const leadChange = computeTrend(totalLeads, recentLeads.length);
    const siteLimitText = planUsage?.limits.maxSites
      ? `${planUsage.usage.sites}/${planUsage.limits.maxSites}`
      : `${sites.length}`;

    return [
      {
        label: "รายชื่อลูกค้าทั้งหมด",
        value: totalLeads.toLocaleString("th-TH"),
        change: leadChange,
        icon: UsersIcon,
        toneClass: "text-sky-400",
      },
      {
        label: "จำนวนผู้เข้าชม",
        value: "-",
        change: "รอ endpoint",
        icon: MousePointer2Icon,
        toneClass: "text-amber-400",
      },
      {
        label: "เว็บไซต์ที่เปิดใช้งาน",
        value: siteLimitText,
        change: `${sites.length} เว็บไซต์`,
        icon: GlobeIcon,
        toneClass: "text-emerald-400",
      },
      {
        label: "สถานะแผนปัจจุบัน",
        value: subscription?.planName ?? "FREE",
        change: subscription?.status ?? "-",
        icon: TrendingUpIcon,
        toneClass: "text-fuchsia-400",
      },
    ];
  }, [totalLeads, recentLeads.length, planUsage, sites.length, subscription]);

  const capabilitySummary = useMemo(() => {
    if (!planUsage) {
      return null;
    }

    const supportTierLabel: Record<string, string> = {
      HELP_CENTER: "Help Center",
      STANDARD: "Standard Support",
      PRIORITY: "Priority Support",
      EXCLUSIVE_ADVISOR: "Exclusive Advisor",
    };

    return {
      lineOa: planUsage.limits.lineOaUnlimited
        ? "LINE OA: ไม่จำกัด"
        : `LINE OA: ${planUsage.usage.lineOaMonthlyUsed}/${planUsage.limits.lineOaMonthlyQuota ?? 0} ครั้ง/เดือน`,
      supportTier:
        supportTierLabel[planUsage.limits.supportTier] ??
        planUsage.limits.supportTier,
      trackingLevel: planUsage.limits.trackingLevel,
      analyticsLevel: planUsage.limits.analyticsLevel,
    };
  }, [planUsage]);

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">
            สวัสดีตอนนี้, {userName.split(" ")[0] ?? "ผู้ใช้งาน"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            นี่คือภาพรวมธุรกิจของคุณในวันนี้
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 p-1">
            <Button size="sm" variant="ghost">
              7 วันล่าสุด
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              30 วันล่าสุด
            </Button>
            <Button size="sm" variant="ghost">
              ทั้งหมด
            </Button>
          </div>
          <Button
            className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
            onClick={() => window.location.assign("/sites")}
          >
            <PlusIcon data-icon="inline-start" />
            สร้างเว็บไซต์ใหม่
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-border/70 bg-card/85 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35"
          >
            <CardHeader>
              <CardDescription className="text-xs uppercase tracking-wider">
                {stat.label}
              </CardDescription>
              <div className="flex items-start justify-between gap-3">
                {isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <CardTitle className="text-2xl md:text-3xl">
                    {stat.value}
                  </CardTitle>
                )}
                <span
                  className={`rounded-xl bg-black/15 p-2 ${stat.toneClass}`}
                >
                  <stat.icon className="size-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-5 w-20 rounded-full" />
              ) : (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-black/20 text-xs text-foreground"
                >
                  {stat.change}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>รายชื่อลูกค้าล่าสุด</CardTitle>
                <CardDescription>
                  {selectedSite
                    ? `จากเว็บไซต์ ${selectedSite.name}`
                    : "เลือกเว็บไซต์เพื่อดูรายชื่อลูกค้า"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary"
                onClick={() => window.location.assign("/dashboard/leads")}
              >
                ดูทั้งหมด
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array.from({ length: 4 })].map((_, index) => (
                  <div
                    key={`lead-skeleton-${index}`}
                    className="grid grid-cols-4 gap-3 rounded-lg border border-border/40 px-3 py-3"
                  >
                    <Skeleton className="h-4 w-26" />
                    <Skeleton className="h-4 w-22" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
                <p>ยังไม่มีรายชื่อลูกค้าในช่วงเวลานี้</p>
                <Button
                  variant="outline"
                  className="border-dashed"
                  onClick={() => window.location.assign("/sites")}
                >
                  ไปสร้างฟอร์มรับลีด
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-170 text-left text-sm">
                  <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ชื่อลูกค้า</th>
                      <th className="px-6 py-4 font-semibold">แหล่งที่มา</th>
                      <th className="px-6 py-4 font-semibold">สถานะ</th>
                      <th className="px-6 py-4 font-semibold">เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-border/40 last:border-0 transition hover:bg-black/10"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold">
                            {lead.contact.name ?? "Unknown contact"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.contact.email ?? "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {lead.page?.title ?? "Unknown page"}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="rounded-full bg-primary/20 text-primary hover:bg-primary/20">
                            New
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {formatRelativeTime(lead.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="border-b border-border/60">
              <CardTitle>เว็บไซต์ที่เปิดใช้งาน</CardTitle>
              <CardDescription>3 เว็บไซต์ที่มีลีดล่าสุด</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                [...Array.from({ length: 3 })].map((_, index) => (
                  <div
                    key={`site-skeleton-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-black/10 p-3"
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))
              ) : sites.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-black/10 p-4 text-sm text-muted-foreground">
                  ยังไม่มีเว็บไซต์ในระบบ เริ่มต้นสร้างเว็บแรกของคุณได้ทันที
                </div>
              ) : (
                sites.slice(0, 3).map((site) => {
                  const leadInfo = siteLeadSummary.find(
                    (entry) => entry.siteId === site.id,
                  );

                  return (
                    <div
                      key={site.id}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-black/10 p-3 transition hover:border-primary/35"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-black/20 text-muted-foreground">
                        <GlobeIcon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {site.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {site.slug}.finnweb.co
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            window.location.assign(`/sites?siteId=${site.id}`)
                          }
                          aria-label={`Edit ${site.name}`}
                        >
                          <Edit3Icon />
                        </Button>
                        <p className="text-xs font-semibold text-primary">
                          {leadInfo?.total ?? 0} leads
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            window.location.assign(`/sites?siteId=${site.id}`)
                          }
                          className="text-muted-foreground transition hover:text-foreground"
                          aria-label={`Open ${site.name}`}
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => window.location.assign("/sites")}
              >
                + สร้างโปรเจกต์ใหม่
              </Button>
            </CardContent>
          </Card>

          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-[#ff4500] p-6 text-white shadow-[0_22px_45px_-30px_rgba(255,140,0,0.95)]">
            <FlameIcon className="absolute -top-4 -right-4 size-20 text-white/15" />
            <p className="text-xs uppercase tracking-[0.2em]">AI Insight</p>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {insightText}
            </p>
            {capabilitySummary ? (
              <div className="mt-3 space-y-1 text-xs text-white/85">
                <p>{capabilitySummary.lineOa}</p>
                <p>Support: {capabilitySummary.supportTier}</p>
                <p>Tracking: {capabilitySummary.trackingLevel}</p>
                <p>Analytics: {capabilitySummary.analyticsLevel}</p>
              </div>
            ) : null}
            <Button
              size="sm"
              className="mt-4 bg-white text-primary hover:bg-white/90"
              onClick={() => window.location.assign("/dashboard/leads")}
            >
              เปิดใช้งานเลย
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
