"use client";

import { useMemo, useState } from "react";
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
import { readStoredAuthState, type StoredAuthState } from "@/lib/auth-storage";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";

export default function ProfileSettingsPage() {
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => authState.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    [authState.apiBaseUrl],
  );

  async function handleSendVerificationEmail() {
    if (!authState.accessToken) {
      setErrorMessage("Sign in first to send a verification email.");
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: "/auth/send-verification-email",
        init: {
          method: "POST",
        },
      });

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      setStatusMessage(
        typeof payload === "object" && payload && "message" in payload
          ? String(payload.message)
          : "Verification email sent.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send verification email.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const user = authState.user;

  return (
    <AppPageShell
      title="Profile"
      description="Review your account details and verify your email status."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Account profile</CardTitle>
            <CardDescription>
              This reflects the session currently stored in the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email ?? "Not signed in"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Workspace ID</p>
              <p className="font-medium">
                {authState.workspaceId ?? "Not available yet"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Site ID</p>
              <p className="font-medium">
                {authState.siteId ?? "Not available yet"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email verification</CardTitle>
            <CardDescription>
              Send another verification email if your account is still pending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={user?.emailVerified ? "default" : "secondary"}>
              {user?.emailVerified ? "Verified" : "Pending verification"}
            </Badge>

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

            <Button onClick={handleSendVerificationEmail} disabled={isSending}>
              {isSending ? "Sending..." : "Send verification email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
