"use client";

import { type AuthResponse } from "@finnweb/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Mail,
  User,
} from "lucide-react";
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

type AuthFormCardProps = {
  mode: AuthMode;
};

type ErrorPayload = {
  code?: string;
  message?: string;
};

type ApiErrorEnvelope = {
  message?: string;
  error?: ErrorPayload;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS:
    "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ",
  INVALID_CREDENTIALS: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  TOO_MANY_REQUESTS: "คุณทำรายการบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง",
};

function getReadableErrorMessage(result: unknown, status: number): string {
  if (typeof result === "string" && result.trim()) {
    return result;
  }

  if (typeof result === "object" && result !== null) {
    const payload = result as ApiErrorEnvelope;
    const nestedCode = payload.error?.code;
    const nestedMessage = payload.error?.message;
    const topLevelMessage = payload.message;

    const code = nestedCode || nestedMessage || topLevelMessage;
    if (code && AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code];
    }

    if (nestedMessage && nestedMessage !== nestedCode) {
      return nestedMessage;
    }

    if (topLevelMessage && topLevelMessage !== nestedCode) {
      return topLevelMessage;
    }
  }

  return `Request failed with status ${status}`;
}

export function AuthFormCard({ mode }: AuthFormCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedPlan = (searchParams.get("plan")?.toUpperCase() ??
    "FREE") as PlanCode;
  const nextPath =
    searchParams.get("next") ??
    (mode === "register" ? "/sites/create" : "/dashboard");

  const apiBaseUrl = DEFAULT_API_BASE_URL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modeLabel = useMemo(() => {
    return mode === "register"
      ? {
          title: "สร้างบัญชี FinnWeb",
          description:
            "เริ่มต้นเว็บไซต์แรกของคุณและพร้อมใช้งาน workflow จัดการลีดได้ทันที",
          submit: "สร้างบัญชีและเริ่มใช้งาน",
          welcome: "เริ่มต้นสร้างเว็บไซต์ของคุณวันนี้",
          switchPrompt: "มีบัญชีอยู่แล้ว?",
          switchHref: `/login?plan=${selectedPlan}&next=${encodeURIComponent(nextPath)}`,
          switchLabel: "เข้าสู่ระบบที่นี่",
        }
      : {
          title: "เข้าสู่ระบบ FinnWeb",
          description:
            "กลับมาจัดการไซต์ ลูกค้า และการแจ้งเตือน LINE ได้ต่อเนื่องในที่เดียว",
          submit: "เข้าสู่ระบบ",
          welcome: "ยินดีต้อนรับกลับเข้าสู่ระบบ",
          switchPrompt: "ยังไม่มีบัญชี FinnWeb?",
          switchHref: `/register?plan=${selectedPlan}&next=${encodeURIComponent(nextPath)}`,
          switchLabel: "สมัครใช้งานฟรี",
        };
  }, [mode, nextPath, selectedPlan]);

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
        throw new Error(getReadableErrorMessage(result, response.status));
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
        mode === "register" ? "สร้างบัญชีสำเร็จแล้ว" : "เข้าสู่ระบบสำเร็จแล้ว",
      );

      if (selectedPlan !== "FREE") {
        router.push(`/subscription?plan=${selectedPlan}`);
        return;
      }

      if (mode === "register") {
        router.push("/sites/create");
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1A1C23] px-6 py-10 font-(--font-kanit) text-[#F9FAFB]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[14%] -top-[14%] h-[52vw] w-[52vw] rounded-full bg-indigo-500/12 blur-[120px]" />
        <div className="absolute -bottom-[16%] -right-[12%] h-[52vw] w-[52vw] rounded-full bg-orange-500/14 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-size-[32px_32px] opacity-20" />
      </div>

      <Link
        href="/landing"
        className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:text-white"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <ChevronLeft className="size-4" />
        </span>
        กลับหน้าหลัก
      </Link>

      <div className="relative z-10 w-full max-w-115">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#FF8C00] to-[#FF4500] shadow-[0_0_30px_rgba(255,140,0,0.4)]">
            <Flame className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FinnWeb</h1>
          <p className="mt-2 text-sm leading-[1.7] text-slate-300">
            {modeLabel.welcome}
          </p>
        </div>

        <section className="rounded-[30px] border border-white/12 bg-white/3 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8">
          <header className="mb-5 space-y-2">
            <h2 className="text-xl font-bold leading-[1.7]">
              {modeLabel.title}
            </h2>
            <p className="text-sm leading-[1.7] text-slate-300">
              {modeLabel.description}
            </p>
            <p className="text-xs text-slate-400">
              Selected plan:{" "}
              <span className="font-semibold text-orange-300">
                {selectedPlan}
              </span>
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="ml-1 text-xs uppercase tracking-[0.14em] text-slate-400"
                >
                  ชื่อ-นามสกุล
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="สมชาย มุ่งมั่น"
                    className="h-12 rounded-xl border-white/12 bg-white/5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-orange-400/80 focus-visible:ring-4 focus-visible:ring-orange-400/20"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="ml-1 text-xs uppercase tracking-[0.14em] text-slate-400"
              >
                อีเมล
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="h-12 rounded-xl border-white/12 bg-white/5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-orange-400/80 focus-visible:ring-4 focus-visible:ring-orange-400/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs uppercase tracking-[0.14em] text-slate-400"
                >
                  รหัสผ่าน
                </Label>
                {mode === "login" ? (
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-orange-300 hover:underline"
                  >
                    ลืมรหัสผ่าน?
                  </Link>
                ) : null}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  className="h-12 rounded-xl border-white/12 bg-white/5 pl-12 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-orange-400/80 focus-visible:ring-4 focus-visible:ring-orange-400/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {(statusMessage || errorMessage) && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  errorMessage
                    ? "border-red-900/60 bg-red-950/40 text-red-200"
                    : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
                }`}
              >
                {errorMessage ?? statusMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#FF8C00] to-[#FF4500] text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <span className="size-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              ) : (
                <>
                  {modeLabel.submit}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              หรือเข้าด้วย
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/3 text-xs font-semibold text-slate-200 transition hover:bg-white/8"
            >
              <span className="text-sm font-bold">G</span>
              <span>Google</span>
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/3 text-xs font-semibold text-slate-200 transition hover:bg-white/8"
            >
              <span className="text-sm font-bold text-[#1877F2]">f</span>
              <span>Facebook</span>
            </button>
          </div>

          <p className="mt-7 text-center text-sm leading-[1.7] text-slate-400">
            {modeLabel.switchPrompt}
            <Link
              href={modeLabel.switchHref}
              className="ml-2 font-bold text-orange-300 hover:underline"
            >
              {modeLabel.switchLabel}
            </Link>
          </p>
        </section>

        <footer className="mt-7 flex justify-center gap-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Link href="#" className="transition hover:text-slate-300">
            Privacy
          </Link>
          <Link href="#" className="transition hover:text-slate-300">
            Terms
          </Link>
          <Link href="#" className="transition hover:text-slate-300">
            Support
          </Link>
        </footer>
      </div>
    </main>
  );
}
