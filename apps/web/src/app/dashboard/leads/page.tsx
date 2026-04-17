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
      title="Leads"
      description="View latest leads by site with quick filters for page and date range."
      actions={
        <Button onClick={() => window.location.assign("/sites")}>
          Manage sites
        </Button>
      }
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead filters</CardTitle>
            <CardDescription>
              Filter by site, page, and date to focus on the right
              opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="siteId" className="text-sm font-medium">
                Site
              </label>
              <select
                id="siteId"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                disabled={isLoadingSites}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 dark:border-slate-800"
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="pageId" className="text-sm font-medium">
                Page
              </label>
              <select
                id="pageId"
                value={selectedPageId}
                onChange={(event) => setSelectedPageId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800"
              >
                <option value="">All pages</option>
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
                  From date
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="toDate" className="text-sm font-medium">
                  To date
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Selected site
                </p>
                <p>{selectedSite?.name ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Leads shown
                </p>
                <p>{isLoadingLeads ? "Loading..." : leads.length}</p>
              </div>
            </div>

            {(statusMessage || errorMessage) && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  errorMessage
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                }`}
              >
                {errorMessage ?? statusMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest leads</CardTitle>
            <CardDescription>
              See key contact fields and page context at a glance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLeads ? (
              <p className="text-sm text-slate-500">Loading leads...</p>
            ) : leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                No leads found for this filter. Try changing date range or page.
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <article
                    key={lead.id}
                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {lead.contact.name ?? "Unknown contact"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(lead.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {lead.form.name}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                      <p>Email: {lead.contact.email ?? "-"}</p>
                      <p>Phone: {lead.contact.phone ?? "-"}</p>
                    </div>

                    {lead.contact.message && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {lead.contact.message}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
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
