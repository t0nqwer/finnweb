"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageCrudDashboard from "@/app/page-crud-dashboard";
import { AppPageShell } from "@/components/app-page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import {
  persistAuthState,
  readStoredAuthState,
  type StoredAuthState,
} from "@/lib/auth-storage";

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

export default function SitesPage() {
  const [authState, setAuthState] = useState<StoredAuthState>({});
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteSlug, setNewSiteSlug] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            typeof payload === "object" && payload && "message" in payload
              ? String(payload.message)
              : `Request failed with status ${response.status}`,
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
          persistAuthState({
            apiBaseUrl,
            siteId: nextSelectedSite.id,
            workspaceId: nextSelectedSite.workspace?.id ?? workspaceId,
          });
          setAuthState((current) => ({
            ...current,
            apiBaseUrl,
            siteId: nextSelectedSite.id,
            workspaceId: nextSelectedSite.workspace?.id ?? current.workspaceId,
          }));
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load sites.",
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

  function handleSelectSite(site: SiteRecord) {
    setSelectedSiteId(site.id);
    setStatusMessage(`Selected ${site.name}.`);
    setErrorMessage(null);

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

  async function handleCreateSite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setErrorMessage("Sign in first to create a site.");
      return;
    }

    if (!newSiteName.trim()) {
      setErrorMessage("Site name is required.");
      return;
    }

    setIsCreating(true);
    setStatusMessage(null);
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newSiteName.trim(),
            slug: newSiteSlug.trim() || undefined,
            workspaceId: workspaceId || undefined,
          }),
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

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const createdSite =
        typeof payload === "object" && payload && "data" in payload
          ? (payload.data as SiteRecord)
          : null;

      setStatusMessage(
        createdSite
          ? `Created ${createdSite.name}.`
          : "Site created successfully.",
      );
      setNewSiteName("");
      setNewSiteSlug("");
      await loadSites(createdSite?.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create site.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const selectedSite = sites.find((site) => site.id === selectedSiteId);

  return (
    <AppPageShell
      title="Sites & pages"
      description="Choose a site, create a new one, and manage pages without leaving the workspace."
      actions={
        <Link
          href="/billing"
          className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
        >
          Review plan limits
        </Link>
      }
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace site manager</CardTitle>
            <CardDescription>
              Load your sites from the API, pick the active site, and keep the
              page manager in sync with your session.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!accessToken ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sign in first to load your workspace sites.
                <div className="mt-3">
                  <Link
                    href="/login"
                    className="font-medium text-orange-600 hover:underline"
                  >
                    Go to login
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="activeSite">Active site</Label>
                  <select
                    id="activeSite"
                    value={selectedSiteId}
                    onChange={(event) => {
                      const site = sites.find(
                        (item) => item.id === event.target.value,
                      );

                      if (site) {
                        handleSelectSite(site);
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800"
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} ({site.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Workspace</p>
                    <p>
                      {selectedSite?.workspace?.name ??
                        workspaceId ??
                        "Not linked yet"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium text-foreground">Sites loaded</p>
                    <p>{isLoading ? "Loading..." : sites.length}</p>
                  </div>
                </div>

                {sites.length === 0 && !isLoading && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    ยังไม่มีเว็บไซต์ใน workspace นี้
                    เริ่มต้นโดยสร้างเว็บไซต์แรกด้านล่าง
                  </div>
                )}

                <form className="space-y-3" onSubmit={handleCreateSite}>
                  <div>
                    <p className="text-sm font-medium">Create a new site</p>
                    <p className="text-sm text-muted-foreground">
                      This uses the live `POST /sites` endpoint from the API.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site name</Label>
                      <Input
                        id="siteName"
                        value={newSiteName}
                        onChange={(event) => setNewSiteName(event.target.value)}
                        placeholder="My first landing page"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteSlug">Slug</Label>
                      <Input
                        id="siteSlug"
                        value={newSiteSlug}
                        onChange={(event) => setNewSiteSlug(event.target.value)}
                        placeholder="my-first-landing-page"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full sm:w-auto"
                  >
                    {isCreating ? "Creating site..." : "Create site"}
                  </Button>
                </form>
              </>
            )}

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
            <CardTitle>Current site</CardTitle>
            <CardDescription>
              Your page manager below will follow the selected site context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedSite ? (
              <>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">{selectedSite.name}</p>
                  <p className="text-muted-foreground">
                    Slug: {selectedSite.slug}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-muted-foreground">
                  <p>Site ID: {selectedSite.id}</p>
                  <p>
                    Workspace:{" "}
                    {selectedSite.workspace?.name ?? "Current workspace"}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-muted-foreground">
                Pick a site to start managing pages.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        {accessToken && selectedSiteId ? (
          <PageCrudDashboard
            apiBaseUrl={apiBaseUrl}
            token={accessToken}
            siteId={selectedSiteId}
            showConnectionFields={false}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Page manager</CardTitle>
              <CardDescription>
                Sign in and select a site to load page CRUD tools here.
              </CardDescription>
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Tip: เลือก active site ด้านบนก่อน จากนั้นเครื่องมือจัดการหน้า
                (create/edit/delete/publish) จะโหลดอัตโนมัติ
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </AppPageShell>
  );
}
