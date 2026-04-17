"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";

type PlanCode = "BASIC" | "BUSINESS" | "PRO";
type BillingInterval = "MONTHLY" | "YEARLY";

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

const PLANS: Array<{
  code: PlanCode;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
}> = [
  {
    code: "BASIC",
    name: "Basic",
    monthlyPrice: 250,
    yearlyPrice: 2500,
    description: "For simple landing pages",
    features: ["1 เว็บไซต์", "3 หน้า", "ฟอร์มติดต่อ", "Custom domain"],
  },
  {
    code: "BUSINESS",
    name: "Business",
    monthlyPrice: 490,
    yearlyPrice: 4900,
    description: "For growing businesses",
    features: ["3 เว็บไซต์", "10 หน้า", "Blog + Ecommerce", "Analytics"],
  },
  {
    code: "PRO",
    name: "Pro",
    monthlyPrice: 990,
    yearlyPrice: 9900,
    description: "Full features for serious users",
    features: ["10 เว็บไซต์", "50 หน้า", "Custom code", "Priority support"],
  },
];

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("MONTHLY");
  const initialPlanParam = searchParams.get("plan")?.toUpperCase();
  const initialPlan: PlanCode =
    initialPlanParam === "BASIC" ||
    initialPlanParam === "BUSINESS" ||
    initialPlanParam === "PRO"
      ? initialPlanParam
      : "BUSINESS";

  const [selectedPlan, setSelectedPlan] = useState<PlanCode>(initialPlan);
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
    async function loadSites() {
      if (!accessToken || !normalizedApiBaseUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const { response, payload, authState } = await fetchApiWithTokenRefresh(
          {
            apiBaseUrl: normalizedApiBaseUrl,
            path: "/sites",
            init: {
              cache: "no-store",
            },
          },
        );

        if (authState.accessToken && authState.accessToken !== accessToken) {
          setAccessToken(authState.accessToken);
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

        const matchedSite =
          nextSites.find((site) => site.id === siteId) ?? nextSites[0];

        if (matchedSite) {
          setSiteId(matchedSite.id);
          if (matchedSite.workspace?.id) {
            setWorkspaceId(matchedSite.workspace.id);
          }
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load sites.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSites();
  }, [accessToken, normalizedApiBaseUrl, siteId]);

  async function handleCheckout() {
    if (!accessToken) {
      router.push(`/register?next=/subscription&plan=${selectedPlan}`);
      return;
    }

    if (!workspaceId) {
      setErrorMessage("Select a site or workspace before checkout.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload, authState } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path: "/billing/checkout-session",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspaceId,
            planCode: selectedPlan,
            billingInterval,
          }),
        },
      });

      if (authState.accessToken && authState.accessToken !== accessToken) {
        setAccessToken(authState.accessToken);
      }

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const checkoutUrl =
        typeof payload === "object" && payload && "url" in payload
          ? String(payload.url)
          : "";

      if (!checkoutUrl) {
        throw new Error("Checkout URL was not returned by the API.");
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create checkout session.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 w-fit bg-orange-500 text-white hover:bg-orange-500">
              Subscription
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight">
              Choose the plan for your workspace
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Start from the landing page, register, then complete checkout
              here.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/landing"
              className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
            >
              Landing
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Billing setup</CardTitle>
            <CardDescription>
              Select interval and confirm which workspace should be billed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Billing interval</Label>
              <div className="flex gap-2">
                <Button
                  variant={
                    billingInterval === "MONTHLY" ? "default" : "outline"
                  }
                  onClick={() => setBillingInterval("MONTHLY")}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingInterval === "YEARLY" ? "default" : "outline"}
                  onClick={() => setBillingInterval("YEARLY")}
                >
                  Yearly
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteId">Site / Workspace</Label>
              <select
                id="siteId"
                value={siteId}
                onChange={(event) => {
                  const nextSiteId = event.target.value;
                  setSiteId(nextSiteId);
                  const match = sites.find((site) => site.id === nextSiteId);
                  setWorkspaceId(match?.workspace?.id ?? "");
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

            <Button
              onClick={handleCheckout}
              className="w-full"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting
                ? "Opening checkout..."
                : `Continue with ${selectedPlan}`}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.code;
            const price =
              billingInterval === "MONTHLY"
                ? plan.monthlyPrice
                : plan.yearlyPrice;

            return (
              <Card
                key={plan.code}
                className={
                  isSelected
                    ? "border-orange-500 shadow-lg shadow-orange-500/10"
                    : undefined
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {isSelected && <Badge>Selected</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="text-3xl font-bold">฿{price}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.features.map((feature) => (
                    <p
                      key={feature}
                      className="text-sm text-slate-600 dark:text-slate-300"
                    >
                      • {feature}
                    </p>
                  ))}
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedPlan(plan.code)}
                  >
                    {isSelected ? "Current choice" : "Choose plan"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
          Loading subscription options...
        </main>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
