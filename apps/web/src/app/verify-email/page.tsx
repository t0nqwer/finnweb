"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
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
  buildApiUrl,
  DEFAULT_API_BASE_URL,
  readApiResponse,
} from "@/lib/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        buildApiUrl(apiBaseUrl, "/auth/verify-email"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: token.trim() }),
        },
      );

      const payload = await readApiResponse(response);

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
          : "Email verified successfully.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="Email verification"
      title="Confirm your email address"
      description="Use the verification token from your inbox to finish account setup."
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="text-orange-300 hover:text-orange-200">
            Go to login
          </Link>
          <Link
            href="/settings/profile"
            className="text-slate-300 hover:text-white"
          >
            Open profile
          </Link>
        </div>
      }
    >
      <Card className="border-slate-800 bg-slate-950 text-slate-50">
        <CardHeader>
          <CardTitle>Verify email</CardTitle>
          <CardDescription>
            Paste the verification token from your email if it is not already
            prefilled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">API base URL</Label>
              <Input
                id="apiBaseUrl"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
                placeholder="http://localhost:4000/api"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Verification token</Label>
              <Input
                id="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="verification-token-from-email"
                required
              />
            </div>

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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify email"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
          Loading verification form...
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
