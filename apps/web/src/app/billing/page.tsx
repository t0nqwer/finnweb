"use client";

import Link from "next/link";
import { useState } from "react";
import { AppPageShell } from "@/components/app-page-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { readStoredAuthState, type StoredAuthState } from "@/lib/auth-storage";

export default function BillingPage() {
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());

  const signedIn = Boolean(authState.accessToken);

  return (
    <AppPageShell
      title="Billing"
      description="Manage your subscription, checkout flow, and billing status pages."
      actions={
        <Link
          href="/subscription"
          className="inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Change plan
        </Link>
      }
    >
      <div className="grid gap-4 px-4 md:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace billing readiness</CardTitle>
            <CardDescription>
              Quick snapshot of the current browser session before checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={signedIn ? "default" : "secondary"}>
                {signedIn ? "Signed in" : "Guest"}
              </Badge>
              <Badge
                variant={
                  authState.user?.emailVerified ? "default" : "secondary"
                }
              >
                {authState.user?.emailVerified
                  ? "Email verified"
                  : "Verification pending"}
              </Badge>
            </div>
            <div className="rounded-lg border p-3 text-muted-foreground">
              <p>
                Workspace ID: {authState.workspaceId ?? "Not connected yet"}
              </p>
              <p>Site ID: {authState.siteId ?? "Not selected yet"}</p>
            </div>
            {!signedIn ? (
              <Link
                href="/login"
                className="font-medium text-orange-600 hover:underline"
              >
                Sign in before checkout
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Choose or upgrade a plan</CardTitle>
            <CardDescription>
              Open the existing subscription flow and start Stripe checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/subscription"
              className="block text-sm font-medium text-orange-600 hover:underline"
            >
              Open subscription page
            </Link>
            <p className="text-sm text-muted-foreground">
              After plan selection, the checkout session is created by the API.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout status</CardTitle>
            <CardDescription>
              Review success or cancellation states after payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href="/dashboard/billing/success"
              className="block text-orange-600 hover:underline"
            >
              Success state
            </Link>
            <Link
              href="/dashboard/billing"
              className="block text-orange-600 hover:underline"
            >
              Cancellation state
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
