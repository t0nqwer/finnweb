"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3Icon,
  ExternalLinkIcon,
  GlobeIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { AppPageShell } from "@/components/app-page-shell";
import { SiteEditorSimulator } from "@/components/site-editor-simulator";
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
  if (!status) {
    return "แบบร่าง";
  }

  return status.toUpperCase() === "PUBLISHED" ? "เผยแพร่แล้ว" : "แบบร่าง";
}

export default function SitesPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<StoredAuthState>({});
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);
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

  function handleSelectSite(site: SiteRecord) {
    setSelectedSiteId(site.id);
    setStatusMessage(`กำลังใช้งานเว็บไซต์ ${site.name}`);
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

  async function handleDeleteSite(site: SiteRecord) {
    if (!accessToken) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนลบเว็บไซต์");
      return;
    }

    const confirmed = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบเว็บไซต์ \"${site.name}\"?\nการลบนี้ไม่สามารถย้อนกลับได้`,
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

      if (editingSite?.id === site.id) {
        setEditingSite(null);
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

  const selectedSite = sites.find((site) => site.id === selectedSiteId);

  if (editingSite) {
    return (
      <SiteEditorSimulator
        site={editingSite}
        onClose={() => setEditingSite(null)}
      />
    );
  }

  return (
    <AppPageShell
      title="เว็บไซต์ของฉัน"
      description="หน้านี้ไว้เลือกและจัดการเว็บไซต์ที่มีอยู่แล้ว"
      actions={
        <Button
          className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
          onClick={() => router.push("/sites/create")}
        >
          <PlusIcon data-icon="inline-start" />
          Create Site
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 lg:px-6">
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>ต้องการเว็บไซต์ใหม่ใช่ไหม?</CardTitle>
            <CardDescription>
              ไม่มีฟอร์มในหน้านี้แล้ว กดปุ่ม Create Site เพื่อไปหน้าสร้างเว็บไซต์โดยตรง
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
              onClick={() => router.push("/sites/create")}
            >
              <PlusIcon data-icon="inline-start" />
              Create Site
            </Button>
          </CardContent>
        </Card>

        {errorMessage ? (
          <Card className="border-destructive/50">
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

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="border-b border-border/60">
            <CardTitle>เว็บไซต์ที่ใช้งานอยู่ตอนนี้</CardTitle>
            <CardDescription>
              เว็บไซต์นี้จะถูกเลือกเป็นเว็บหลักของคุณในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            {selectedSite ? (
              <>
                <div className="rounded-lg border border-border/70 bg-black/10 p-3">
                  <p className="font-semibold">{selectedSite.name}</p>
                  <p className="text-muted-foreground">
                    {selectedSite.slug}.finnweb.co
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-border/70 bg-black/10"
                  onClick={() => setEditingSite(selectedSite)}
                >
                  <Edit3Icon data-icon="inline-start" />
                  แก้ไขเว็บไซต์นี้
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 bg-black/10 p-4 text-muted-foreground">
                ยังไม่ได้เลือกเว็บไซต์
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
            : sites.map((site) => {
                const isActive = selectedSiteId === site.id;
                const statusLabel = getSiteStatusLabel(site.status);
                const published = statusLabel === "เผยแพร่แล้ว";

                return (
                  <Card
                    key={site.id}
                    className={`group overflow-hidden border transition-all duration-300 ${
                      isActive
                        ? "border-primary/60 bg-card/90 shadow-[0_20px_45px_-32px_rgba(255,140,0,0.9)]"
                        : "border-border/70 bg-card/85 hover:border-primary/35"
                    }`}
                  >
                    <div className="relative h-38 overflow-hidden border-b border-border/60 bg-linear-to-br from-[#1f2330] to-[#2d2f39]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,140,0,0.2),transparent_55%)]" />
                      <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-black/45 p-3 opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="bg-white text-[#111827] hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setEditingSite(site)}
                        >
                          <Edit3Icon data-icon="inline-start" />
                          แก้ไข
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            window.open(
                              `https://${site.slug}.finnweb.co`,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLinkIcon data-icon="inline-start" />
                          เปิดเว็บ
                        </Button>
                      </div>
                      <Badge
                        className={`absolute left-3 top-3 ${
                          published
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-600 text-white"
                        }`}
                      >
                        {statusLabel}
                      </Badge>
                    </div>

                    <CardContent className="space-y-4 p-4">
                      <div>
                        <p className="truncate text-lg font-semibold">
                          {site.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <GlobeIcon className="size-3.5" />
                          {site.slug}.finnweb.co
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant={isActive ? "default" : "outline"}
                          className={
                            isActive
                              ? "flex-1 bg-primary text-primary-foreground"
                              : "flex-1 border-border/70 bg-black/10"
                          }
                          onClick={() => handleSelectSite(site)}
                        >
                          {isActive ? "กำลังใช้งาน" : "ใช้เว็บไซต์นี้"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 border border-border/70 bg-black/10"
                          onClick={() => setEditingSite(site)}
                          aria-label={`Edit ${site.name}`}
                        >
                          <Edit3Icon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 border border-red-900/60 bg-red-950/20 text-red-300 hover:bg-red-900/40 hover:text-red-100"
                          onClick={() => void handleDeleteSite(site)}
                          disabled={deletingSiteId === site.id}
                          aria-label={`Delete ${site.name}`}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!isLoading && sites.length === 0 ? (
          <Card className="border-border/70 bg-card/85">
            <CardContent className="flex flex-col items-start gap-3 p-5 text-sm text-muted-foreground">
              <p>ยังไม่มีเว็บไซต์ กดปุ่ม Create Site เพื่อเริ่มได้เลย</p>
              <Button
                className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                onClick={() => router.push("/sites/create")}
              >
                <PlusIcon data-icon="inline-start" />
                Create Site
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppPageShell>
  );
}
