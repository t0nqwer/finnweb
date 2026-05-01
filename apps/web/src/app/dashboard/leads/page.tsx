"use client";

import { useEffect, useMemo, useState } from "react";
import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";

type SiteRecord = {
  id: string;
  name: string;
  slug: string;
};

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  path: string | null;
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
  data: Record<string, unknown>;
};

type LeadsResponse = {
  total: number;
  items: LeadItem[];
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardLeadsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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

    if (stored.siteId) {
      setSelectedSiteId(stored.siteId);
    }
  }, []);

  useEffect(() => {
    async function loadSites() {
      if (!accessToken) {
        setIsLoadingSites(false);
        return;
      }

      setIsLoadingSites(true);
      setErrorMessage(null);

      try {
        const { response, payload, authState } =
          await fetchApiWithTokenRefresh<{
            data?: SiteRecord[];
          }>({
            apiBaseUrl: normalizedApiBaseUrl,
            path: "/sites",
            init: {
              cache: "no-store",
            },
          });

        if (authState.accessToken && authState.accessToken !== accessToken) {
          setAccessToken(authState.accessToken);
        }

        if (!response.ok) {
          throw new Error("Unable to load sites.");
        }

        const nextSites = Array.isArray(payload?.data) ? payload.data : [];
        setSites(nextSites);

        if (!selectedSiteId && nextSites[0]) {
          setSelectedSiteId(nextSites[0].id);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load sites.",
        );
      } finally {
        setIsLoadingSites(false);
      }
    }

    void loadSites();
  }, [accessToken, normalizedApiBaseUrl, selectedSiteId]);

  useEffect(() => {
    async function loadPagesAndLeads() {
      if (!accessToken || !selectedSiteId) {
        setPages([]);
        setLeads([]);
        return;
      }

      setIsLoadingLeads(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const pagesRequest = await fetchApiWithTokenRefresh<{
          data?: PageRecord[];
        }>({
          apiBaseUrl: normalizedApiBaseUrl,
          path: `/sites/${selectedSiteId}/pages`,
          init: {
            cache: "no-store",
          },
        });

        if (!pagesRequest.response.ok) {
          throw new Error("Unable to load pages for selected site.");
        }

        const nextPages = Array.isArray(pagesRequest.payload?.data)
          ? pagesRequest.payload.data
          : [];

        setPages(nextPages);

        if (
          selectedPageId &&
          !nextPages.some((page) => page.id === selectedPageId)
        ) {
          setSelectedPageId("");
        }

        const params = new URLSearchParams();
        if (selectedPageId) {
          params.set("pageId", selectedPageId);
        }
        if (fromDate) {
          params.set("from", fromDate);
        }
        if (toDate) {
          params.set("to", toDate);
        }

        const leadsRequest = await fetchApiWithTokenRefresh<LeadsResponse>({
          apiBaseUrl: normalizedApiBaseUrl,
          path: `/sites/${selectedSiteId}/leads${params.toString() ? `?${params.toString()}` : ""}`,
          init: {
            cache: "no-store",
          },
        });

        if (leadsRequest.authState.accessToken) {
          setAccessToken(leadsRequest.authState.accessToken);
        }

        if (!leadsRequest.response.ok) {
          const message =
            typeof leadsRequest.payload === "object" &&
            leadsRequest.payload &&
            "message" in leadsRequest.payload
              ? String(leadsRequest.payload.message)
              : "Unable to load leads.";
          throw new Error(message);
        }

        const items = Array.isArray(leadsRequest.payload?.items)
          ? leadsRequest.payload.items
          : [];

        setLeads(items);
        setStatusMessage(`Loaded ${items.length} lead(s).`);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load leads.",
        );
      } finally {
        setIsLoadingLeads(false);
      }
    }

    void loadPagesAndLeads();
  }, [
    accessToken,
    normalizedApiBaseUrl,
    selectedSiteId,
    selectedPageId,
    fromDate,
    toDate,
  ]);

  const selectedSite = sites.find((site) => site.id === selectedSiteId);

  return (
    <AppPageShell
      title="รายชื่อลูกค้า"
      description="กรองและติดตามลีดล่าสุดจากแต่ละเว็บไซต์ได้ในหน้าเดียว"
      actions={
        <Button
          className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
          onClick={() => window.location.assign("/sites")}
        >
          จัดการเว็บไซต์
        </Button>
      }
    >
      <div className="mx-auto grid w-full max-w-350 gap-6 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="border-b border-border/60">
            <CardTitle>ตัวกรองรายชื่อลูกค้า</CardTitle>
            <CardDescription>
              เลือกเว็บไซต์, หน้า และช่วงเวลา เพื่อดูลีดที่ต้องโฟกัส
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="siteId" className="text-sm font-medium">
                เว็บไซต์
              </label>
              <select
                id="siteId"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                disabled={isLoadingSites}
                className="flex h-10 w-full rounded-lg border border-border/70 bg-black/10 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                <option value="">เลือกเว็บไซต์</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="pageId" className="text-sm font-medium">
                หน้าเว็บไซต์
              </label>
              <select
                id="pageId"
                value={selectedPageId}
                onChange={(event) => setSelectedPageId(event.target.value)}
                className="flex h-10 w-full rounded-lg border border-border/70 bg-black/10 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">ทุกหน้า</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title} ({page.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fromDate" className="text-sm font-medium">
                  จากวันที่
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border/70 bg-black/10 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="toDate" className="text-sm font-medium">
                  ถึงวันที่
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border/70 bg-black/10 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-black/10 p-3">
                <p className="font-medium text-foreground">เว็บไซต์ที่เลือก</p>
                <p className="text-muted-foreground">
                  {selectedSite?.name ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-black/10 p-3">
                <p className="font-medium text-foreground">จำนวนลีดที่แสดง</p>
                <p className="text-muted-foreground">
                  {isLoadingLeads ? "กำลังโหลด..." : leads.length}
                </p>
              </div>
            </div>

            {(statusMessage || errorMessage) && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  errorMessage
                    ? "border-red-900/60 bg-red-950/40 text-red-200"
                    : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
                }`}
              >
                {errorMessage ?? statusMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="border-b border-border/60">
            <CardTitle>รายชื่อลูกค้าล่าสุด</CardTitle>
            <CardDescription>
              ดูข้อมูลติดต่อและแหล่งที่มาของลีดได้อย่างรวดเร็ว
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLeads ? (
              <div className="space-y-3">
                {[...Array.from({ length: 3 })].map((_, index) => (
                  <div
                    key={`lead-loading-${index}`}
                    className="h-28 animate-pulse rounded-xl border border-border/60 bg-black/10"
                  />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-black/10 p-5 text-sm text-muted-foreground">
                ยังไม่พบลีดในเงื่อนไขนี้ ลองเปลี่ยนช่วงวันหรือเลือกหน้าอื่น
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <article
                    key={lead.id}
                    className="rounded-xl border border-border/70 bg-black/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {lead.contact.name ?? "Unknown contact"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(lead.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/20 px-2 py-1 text-xs text-primary">
                        {lead.form.name}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-foreground/90 sm:grid-cols-2">
                      <p>Email: {lead.contact.email ?? "-"}</p>
                      <p>Phone: {lead.contact.phone ?? "-"}</p>
                    </div>

                    {lead.contact.message && (
                      <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-sm text-muted-foreground">
                        {lead.contact.message}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-muted-foreground">
                      Page: {lead.page?.title ?? "Unknown page"}
                      {lead.page?.path ? ` (${lead.page.path})` : ""}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
