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
        const sitesRequest = await fetchApiWithTokenRefresh<{ data?: SiteRecord[] }>(
          {
            apiBaseUrl: normalizedApiBaseUrl,
            path: "/sites",
            init: {
              cache: "no-store",
            },
          },
        );

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

        const subscriptionRequest = await fetchApiWithTokenRefresh<CurrentSubscription>(
          {
            apiBaseUrl: normalizedApiBaseUrl,
            path: `/billing/subscription?workspaceId=${nextWorkspaceId}`,
            init: {
              cache: "no-store",
            },
          },
        );

        if (subscriptionRequest.authState.accessToken) {
          setAccessToken(subscriptionRequest.authState.accessToken);
        }

        if (!subscriptionRequest.response.ok) {
          throw new Error("Unable to load subscription details.");
        }

        setSubscription(subscriptionRequest.payload);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load billing info.",
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

      setStatusMessage("Your subscription will cancel at the end of this cycle.");
      setSubscription((previous) =>
        previous ? { ...previous, cancelAtPeriodEnd: true } : previous,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to cancel subscription.",
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
      title="Subscription"
      description="View your current plan, renewal date, and manage billing actions."
      actions={
        <Button onClick={() => window.location.assign("/subscription")}>Upgrade plan</Button>
      }
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.15fr_0.85fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Current subscription</CardTitle>
            <CardDescription>
              Track your plan status and renewal timeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="siteId" className="text-sm font-medium">
                Workspace via site
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

            {isLoading ? (
              <p className="text-sm text-slate-500">Loading subscription...</p>
            ) : subscription ? (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Plan
                    </p>
                    <p className="text-lg font-semibold">{subscription.planName}</p>
                  </div>
                  <Badge className={getStatusTone(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Billing interval</p>
                    <p className="font-medium">{subscription.billingInterval}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Renewal date</p>
                    <p className="font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Current period start</p>
                    <p className="font-medium">
                      {formatDate(subscription.currentPeriodStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment status</p>
                    <p className="font-medium">
                      {subscription.latestPaymentStatus ?? "-"}
                    </p>
                  </div>
                </div>

                {subscription.cancelAtPeriodEnd && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    This subscription is set to cancel at period end.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No subscription data found.</p>
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
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Upgrade or manage cancellation in one click.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => window.location.assign("/subscription")}
            >
              Upgrade plan
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={!canCancel || isSubmitting}
            >
              {isSubmitting && canCancel ? "Processing..." : "Cancel at period end"}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleReactivate}
              disabled={!canReactivate || isSubmitting}
            >
              {isSubmitting && canReactivate ? "Processing..." : "Reactivate subscription"}
            </Button>

            <p className="text-xs text-slate-500">
              For FREE plan, cancellation and reactivation actions are disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
