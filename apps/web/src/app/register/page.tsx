"use client";

import { type AuthResponse } from "@finnweb/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
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
import { DEFAULT_API_BASE_URL, readApiResponse } from "@/lib/api-client";
import { normalizeApiBaseUrl, persistAuthState } from "@/lib/auth-storage";

type AuthMode = "register" | "login";
type PlanCode = "FREE" | "BASIC" | "BUSINESS" | "PRO";

type RegisterResponse = AuthResponse & {
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  site?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultMode = (
    searchParams.get("mode") === "login" ? "login" : "register"
  ) as AuthMode;

  const selectedPlan = (searchParams.get("plan")?.toUpperCase() ??
    "FREE") as PlanCode;

  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ctaLabel = useMemo(() => {
    return mode === "register" ? "Create account" : "Sign in";
  }, [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

    if (!normalizedBaseUrl) {
      setErrorMessage("API base URL is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload =
        mode === "register"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(`${normalizedBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await readApiResponse(response)) as
        | RegisterResponse
        | string;

      if (!response.ok) {
        throw new Error(
          typeof result === "object" && result && "message" in result
            ? String(result.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const auth = result as RegisterResponse;

      persistAuthState({
        apiBaseUrl: normalizedBaseUrl,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        user: auth.user,
        siteId: auth.site?.id,
        workspaceId: auth.workspace?.id,
      });

      setStatusMessage(
        mode === "register"
          ? "Account created successfully."
          : "Signed in successfully.",
      );

      if (selectedPlan !== "FREE") {
        router.push(`/subscription?plan=${selectedPlan}`);
        return;
      }

      router.push(nextPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to complete request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="FinnWeb onboarding"
      title="เริ่มต้นสร้างเว็บและสมัครใช้งานได้ในไม่กี่นาที"
      description="ลงทะเบียน รับไซต์แรกอัตโนมัติ และไปต่อสู่การเลือกแพ็กเกจที่เหมาะกับธุรกิจของคุณ."
      highlights={[
        "Create or sign in with the live FinnWeb auth API",
        `Selected plan: ${selectedPlan}`,
        `After sign in you will continue to: ${nextPath}`,
      ]}
      footer={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/landing"
            className="text-orange-300 hover:text-orange-200"
          >
            ← กลับหน้า Landing
          </Link>
          <Link href="/pricing" className="text-slate-300 hover:text-white">
            ดูราคาแพ็กเกจ
          </Link>
        </div>
      }
    >
      <Card className="border-slate-800 bg-slate-950 text-slate-50">
        <CardHeader>
          <div className="flex gap-2">
            <Button
              variant={mode === "register" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("register")}
            >
              Register
            </Button>
            <Button
              variant={mode === "login" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("login")}
            >
              Login
            </Button>
          </div>
          <CardTitle className="mt-4">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            Selected plan: <strong>{selectedPlan}</strong>
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

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
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
              {isSubmitting ? "Please wait..." : ctaLabel}
            </Button>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <Link href="/forgot-password" className="hover:text-white">
                Forgot password?
              </Link>
              <Link
                href={mode === "register" ? "/login" : "/register"}
                className="text-orange-300 hover:text-orange-200"
              >
                {mode === "register"
                  ? "Already have an account?"
                  : "Need an account?"}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
          Loading authentication...
        </main>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
