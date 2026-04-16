"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [email, setEmail] = useState("");
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
        buildApiUrl(apiBaseUrl, "/auth/forgot-password"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
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
          : "If the email exists, a reset link has been sent.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send reset email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="Account recovery"
      title="Reset access to your workspace"
      description="Request a password reset email and continue your onboarding securely."
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="text-orange-300 hover:text-orange-200">
            Back to login
          </Link>
          <Link href="/register" className="text-slate-300 hover:text-white">
            Create a new account
          </Link>
        </div>
      }
    >
      <Card className="border-slate-800 bg-slate-950 text-slate-50">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter the email address linked to your FinnWeb account.
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
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
              {isSubmitting ? "Sending link..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
