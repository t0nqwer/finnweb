"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  CheckCircle2Icon,
  CrownIcon,
  FlameIcon,
  MousePointer2Icon,
  XCircleIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";

type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | string;

type PlanCode = "FREE" | "BASIC" | "BUSINESS" | "PRO" | string;

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

type CurrentSubscription = {
  planCode: PlanCode;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: "MONTHLY" | "YEARLY" | string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  latestPaymentStatus: string | null;
};

type PlanFeature = {
  label: string;
  value: string | boolean;
};

type PricingPlan = {
  name: "FREE" | "BASIC" | "BUSINESS" | "PRO";
  price: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: PlanFeature[];
  cta: string;
  highlight?: boolean;
  trial?: string;
};

const PRICING_PLANS: PricingPlan[] = [
  {
    name: "FREE",
    price: "0",
    description: "เหมาะสำหรับทดลองเล่น/นามบัตร",
    icon: MousePointer2Icon,
    features: [
      { label: "จำนวนเว็บไซต์", value: "1 เว็บไซต์" },
      { label: "หน้า / เว็บไซต์", value: "1 หน้า" },
      { label: "Sections / หน้า", value: "10 Sections" },
      { label: "Ecommerce", value: false },
      { label: "LINE OA", value: "จำกัด 5 ครั้ง/ด." },
      { label: "Support", value: "Help Center" },
    ],
    cta: "เริ่มใช้งานฟรี",
  },
  {
    name: "BASIC",
    price: "250",
    description: "เหมาะสำหรับเริ่มต้นมีหน้าร้าน",
    icon: MousePointer2Icon,
    features: [
      { label: "จำนวนเว็บไซต์", value: "1 เว็บไซต์" },
      { label: "หน้า / เว็บไซต์", value: "3 หน้า" },
      { label: "Sections / หน้า", value: "20 Sections" },
      { label: "Ecommerce", value: "3 สินค้า (Basic Cart)" },
      { label: "LINE OA", value: "จำกัด 50 ครั้ง/ด." },
      { label: "Support", value: "Standard Support" },
    ],
    cta: "เลือกแผน Basic",
    trial: "ทดลองฟรี 7 วัน",
  },
  {
    name: "BUSINESS",
    price: "490",
    description: "สายขาย/ยิง Ads (แนะนำ)",
    icon: FlameIcon,
    features: [
      { label: "จำนวนเว็บไซต์", value: "3 เว็บไซต์" },
      { label: "หน้า / เว็บไซต์", value: "10 หน้า" },
      { label: "Sections / หน้า", value: "50 Sections" },
      { label: "Ecommerce", value: "50 สินค้า + สต็อก" },
      { label: "LINE OA", value: "ไม่จำกัด" },
      { label: "Support", value: "Priority Support" },
    ],
    cta: "เลือกแผน Business",
    highlight: true,
    trial: "ทดลองฟรี 7 วัน",
  },
  {
    name: "PRO",
    price: "990",
    description: "เอเจนซี่/บริษัทใหญ่",
    icon: CrownIcon,
    features: [
      { label: "จำนวนเว็บไซต์", value: "10 เว็บไซต์" },
      { label: "หน้า / เว็บไซต์", value: "50 หน้า" },
      { label: "Sections / หน้า", value: "100 Sections" },
      { label: "Ecommerce", value: "1,000 สินค้า + สต็อก" },
      { label: "LINE OA", value: "ไม่จำกัด" },
      { label: "Custom Code / API", value: true },
    ],
    cta: "เลือกแผน Pro",
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusTone(status: SubscriptionStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-600 text-white";
    case "TRIALING":
      return "bg-sky-600 text-white";
    case "PAST_DUE":
      return "bg-amber-500 text-white";
    case "CANCELED":
    case "EXPIRED":
      return "bg-slate-600 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

export default function DashboardSubscriptionPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (stored.workspaceId) {
      setWorkspaceId(stored.workspaceId);
    }

    if (stored.siteId) {
      setSiteId(stored.siteId);
    }
  }, []);

  useEffect(() => {
    async function loadSitesAndSubscription() {
      if (!accessToken || !normalizedApiBaseUrl) {
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

        if (sitesRequest.authState.accessToken) {
          setAccessToken(sitesRequest.authState.accessToken);
        }

        if (!sitesRequest.response.ok) {
          throw new Error("Unable to load sites.");
        }

        const nextSites = Array.isArray(sitesRequest.payload?.data)
          ? sitesRequest.payload.data
          : [];
        setSites(nextSites);

        const matchedSite =
          nextSites.find((site) => site.id === siteId) ?? nextSites[0];
        const nextWorkspaceId = matchedSite?.workspace?.id ?? workspaceId;

        if (!nextWorkspaceId) {
          setSubscription(null);
          return;
        }

        if (matchedSite?.id && matchedSite.id !== siteId) {
          setSiteId(matchedSite.id);
        }
        if (nextWorkspaceId !== workspaceId) {
          setWorkspaceId(nextWorkspaceId);
        }

        const subscriptionRequest =
          await fetchApiWithTokenRefresh<CurrentSubscription>({
            apiBaseUrl: normalizedApiBaseUrl,
            path: `/billing/subscription?workspaceId=${nextWorkspaceId}`,
            init: {
              cache: "no-store",
            },
          });

        if (subscriptionRequest.authState.accessToken) {
          setAccessToken(subscriptionRequest.authState.accessToken);
        }

        if (!subscriptionRequest.response.ok) {
          throw new Error("Unable to load subscription details.");
        }

        setSubscription(subscriptionRequest.payload);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load billing info.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSitesAndSubscription();
  }, [accessToken, normalizedApiBaseUrl, workspaceId, siteId]);

  async function handleCancel() {
    if (!workspaceId) {
      setErrorMessage("Please select a workspace first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload, authState } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path: "/billing/cancel",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId }),
        },
      });

      if (authState.accessToken) {
        setAccessToken(authState.accessToken);
      }

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : "Unable to cancel subscription.";
        throw new Error(message);
      }

      setStatusMessage(
        "Your subscription will cancel at the end of this cycle.",
      );
      setSubscription((previous) =>
        previous ? { ...previous, cancelAtPeriodEnd: true } : previous,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to cancel subscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReactivate() {
    if (!workspaceId) {
      setErrorMessage("Please select a workspace first.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload, authState } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path: "/billing/reactivate",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workspaceId }),
        },
      });

      if (authState.accessToken) {
        setAccessToken(authState.accessToken);
      }

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : "Unable to reactivate subscription.";
        throw new Error(message);
      }

      setStatusMessage("Your subscription has been reactivated.");
      setSubscription((previous) =>
        previous ? { ...previous, cancelAtPeriodEnd: false } : previous,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to reactivate subscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const canCancel =
    subscription &&
    subscription.planCode !== "FREE" &&
    !subscription.cancelAtPeriodEnd;
  const canReactivate =
    subscription &&
    subscription.planCode !== "FREE" &&
    subscription.cancelAtPeriodEnd;

  return (
    <AppPageShell
      title="การสมัครสมาชิก"
      description="ดูสถานะแผนปัจจุบัน วันต่ออายุ และจัดการการชำระเงินได้ในหน้าเดียว"
      actions={
        <Button
          className="bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
          onClick={() => window.location.assign("/subscription")}
        >
          อัปเกรดแพ็กเกจ
        </Button>
      }
    >
      <div className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70 bg-card/85">
            <CardHeader className="border-b border-border/60">
              <CardTitle>สถานะแพ็กเกจปัจจุบัน</CardTitle>
              <CardDescription>
                เลือกเว็บไซต์เพื่อดูข้อมูลแพ็กเกจและรอบบิลของ workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="siteId" className="text-sm font-medium">
                  เลือกเว็บไซต์
                </label>
                <select
                  id="siteId"
                  value={siteId}
                  onChange={(event) => {
                    const nextSiteId = event.target.value;
                    setSiteId(nextSiteId);
                    const match = sites.find((site) => site.id === nextSiteId);
                    setWorkspaceId(match?.workspace?.id ?? "");
                  }}
                  className="flex h-10 w-full rounded-lg border border-border/70 bg-black/10 px-3 py-2 text-sm shadow-none outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">เลือกเว็บไซต์</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.slug})
                    </option>
                  ))}
                </select>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-border/60 bg-black/10 p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-7 w-40" />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
              ) : subscription ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Plan
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {subscription.planName}
                      </p>
                    </div>
                    <Badge className={getStatusTone(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">รอบบิล</p>
                      <p className="font-medium text-foreground">
                        {subscription.billingInterval}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">วันต่ออายุ</p>
                      <p className="font-medium text-foreground">
                        {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">เริ่มรอบปัจจุบัน</p>
                      <p className="font-medium text-foreground">
                        {formatDate(subscription.currentPeriodStart)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">สถานะการชำระเงิน</p>
                      <p className="font-medium text-foreground">
                        {subscription.latestPaymentStatus ?? "-"}
                      </p>
                    </div>
                  </div>

                  {subscription.cancelAtPeriodEnd && (
                    <p className="rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
                      แพ็กเกจนี้ถูกตั้งค่าให้ยกเลิกเมื่อจบรอบบิลปัจจุบัน
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-black/10 p-4 text-sm text-muted-foreground">
                  ไม่พบข้อมูลแพ็กเกจสำหรับเว็บไซต์ที่เลือก
                </div>
              )}

              {(statusMessage || errorMessage) && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${
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
              <CardTitle>การจัดการแพ็กเกจ</CardTitle>
              <CardDescription>
                จัดการอัปเกรด ยกเลิก หรือเปิดใช้งานแพ็กเกจอีกครั้ง
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground"
                onClick={() => window.location.assign("/subscription")}
              >
                อัปเกรดแพ็กเกจ
              </Button>

              <Button
                variant="outline"
                className="w-full border-border/70 bg-black/10"
                onClick={handleCancel}
                disabled={!canCancel || isSubmitting}
              >
                {isSubmitting && canCancel
                  ? "กำลังดำเนินการ..."
                  : "ยกเลิกเมื่อจบรอบบิล"}
              </Button>

              <Button
                variant="outline"
                className="w-full border-border/70 bg-black/10"
                onClick={handleReactivate}
                disabled={!canReactivate || isSubmitting}
              >
                {isSubmitting && canReactivate
                  ? "กำลังดำเนินการ..."
                  : "เปิดใช้งานแพ็กเกจอีกครั้ง"}
              </Button>

              <p className="text-xs text-muted-foreground">
                หากอยู่แผน FREE
                ระบบจะปิดปุ่มยกเลิกและเปิดใช้งานอีกครั้งโดยอัตโนมัติ
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="border-b border-border/60">
            <CardTitle>แพ็กเกจทั้งหมดของ FinnWeb</CardTitle>
            <CardDescription>
              เลือกแผนที่เหมาะกับธุรกิจของคุณ โดยแผน Business
              เป็นแพ็กเกจแนะนำสำหรับสายขาย
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PRICING_PLANS.map((plan) => {
                const PlanIcon = plan.icon;

                return (
                  <div
                    key={plan.name}
                    className={`relative flex h-full flex-col rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${
                      plan.highlight
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/70 bg-black/10"
                    }`}
                  >
                    {plan.highlight ? (
                      <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
                        Recommended
                      </Badge>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg ${
                          plan.highlight
                            ? "bg-primary/20 text-primary"
                            : "bg-black/20 text-muted-foreground"
                        }`}
                      >
                        <PlanIcon className="size-4" />
                      </span>
                      <p className="text-lg font-bold">{plan.name}</p>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {plan.description}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <p className="text-3xl font-bold">฿{plan.price}</p>
                      <p className="text-xs text-muted-foreground">/เดือน</p>
                    </div>
                    {plan.trial ? (
                      <p className="mt-1 text-[11px] text-primary">
                        {plan.trial}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-1 flex-col gap-3 border-t border-border/60 pt-4">
                      {plan.features.map((feature) => (
                        <div
                          key={`${plan.name}-${feature.label}`}
                          className="flex items-start gap-2 text-xs"
                        >
                          {feature.value === false ? (
                            <XCircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
                          ) : (
                            <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          )}
                          <div className="flex min-w-0 flex-col">
                            <span className="text-muted-foreground">
                              {feature.label}
                            </span>
                            {typeof feature.value === "string" ? (
                              <span className="font-semibold text-foreground">
                                {feature.value}
                              </span>
                            ) : feature.value ? (
                              <span className="font-semibold text-foreground">
                                รองรับ
                              </span>
                            ) : (
                              <span className="text-muted-foreground/70">
                                ไม่รองรับ
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={plan.highlight ? "default" : "outline"}
                      className={`mt-5 w-full ${plan.highlight ? "bg-linear-to-r from-primary to-[#ff4500] text-primary-foreground" : "border-border/70 bg-black/10"}`}
                      onClick={() => window.location.assign("/subscription")}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
