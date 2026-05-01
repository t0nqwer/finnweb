"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  clearAuthState,
  readStoredAuthState,
  type StoredAuthState,
} from "@/lib/auth-storage";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => authState.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    [authState.apiBaseUrl],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authState.accessToken) {
      setErrorMessage("Sign in first to change your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: "/auth/change-password",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
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
          : "Password changed successfully.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!authState.accessToken) {
      setErrorMessage("Sign in first to delete your account.");
      return;
    }

    const confirmed = window.confirm(
      "Delete your account permanently? This will remove your workspaces and sign out all sessions.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { response, payload } = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: "/auth/me",
        init: {
          method: "DELETE",
        },
      });

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      clearAuthState();
      router.push("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete account.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <AppPageShell
      title="Security"
      description="Update your password and keep the workspace account secure."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Use the authenticated API endpoint already available in the
              backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
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

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security notes</CardTitle>
            <CardDescription>
              Keep access secure while the broader account center is being
              built.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Password changes require an active access token.</p>
            <p>• Guest users should sign in again through `/login`.</p>
            <p>• Email verification is available from profile settings.</p>
            <div className="pt-4">
              <Button
                variant="destructive"
                onClick={() => void handleDeleteAccount()}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? "Deleting account..." : "Delete account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
