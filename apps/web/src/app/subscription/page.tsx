"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Flame,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import {
  FINNWEB_PLAN_CATALOG,
  type BillingInterval,
  type PlanCode,
  type PaidPlanCode,
  isPlanCode,
} from "@/lib/plan-catalog";

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

type PlanConfig = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  cta: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: PlanConfig[] = FINNWEB_PLAN_CATALOG.map((plan) => ({
  code: plan.code,
  name: plan.name,
  tagline: plan.tagline,
  monthlyPrice: plan.monthlyPrice,
  yearlyPrice: plan.yearlyPrice,
  cta: plan.subscriptionCta,
  features: [...plan.subscriptionFeatures],
  highlight: plan.highlight,
}));

function getPlanIcon(code: PlanCode) {
  if (code === "FREE") {
    return <Zap className="size-6 text-slate-400" />;
  }

  if (code === "BASIC") {
    return <Sparkles className="size-6 text-sky-300" />;
  }

  if (code === "BUSINESS") {
    return <Flame className="size-6 text-[#FF8C00]" />;
  }

  return <Crown className="size-6 text-[#FFD700]" />;
}

function formatPrice(value: number) {
  return value.toLocaleString("th-TH");
}

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [, setSites] = useState<SiteRecord[]>([]);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("MONTHLY");

  const initialPlanParam = searchParams.get("plan")?.toUpperCase();
  const initialPlan: PlanCode = isPlanCode(initialPlanParam)
    ? initialPlanParam
    : "BUSINESS";

  const [selectedPlan, setSelectedPlan] = useState<PlanCode>(initialPlan);
  const [, setIsLoading] = useState(true);
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
          throw new Error(`Request failed with status ${response.status}`);
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

  function handleSelectPlan(planCode: PlanCode) {
    setSelectedPlan(planCode);
    setErrorMessage(null);
  }

  function buildCheckoutPageUrl(planCode: PaidPlanCode) {
    const params = new URLSearchParams({
      plan: planCode,
      billingInterval,
    });

    if (workspaceId) {
      params.set("workspaceId", workspaceId);
    }

    if (siteId) {
      params.set("siteId", siteId);
    }

    return `/subscription/checkout?${params.toString()}`;
  }

  function handleContinueToCheckout(planCode: PlanCode) {
    if (planCode === "FREE") {
      router.push("/dashboard");
      return;
    }

    const checkoutUrl = buildCheckoutPageUrl(planCode);

    if (!accessToken) {
      router.push(`/register?next=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    if (!workspaceId) {
      setErrorMessage("กรุณาเลือกเว็บไซต์ก่อนดำเนินการชำระเงิน");
      return;
    }

    if (!normalizedApiBaseUrl) {
      setErrorMessage("API base URL is invalid.");
      return;
    }

    router.push(checkoutUrl);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1A1C23] px-6 py-12 text-[#F9FAFB]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-[12%] -top-[18%] h-[58vw] w-[58vw] rounded-full bg-orange-500/8 blur-[120px]" />
        <div className="absolute -bottom-[22%] -left-[14%] h-[58vw] w-[58vw] rounded-full bg-indigo-500/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[28px_28px] opacity-20" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col">
        <header className="mb-14 flex flex-col items-center text-center">
          <Link
            href="/landing"
            className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 transition hover:text-white"
          >
            <ChevronLeft className="size-4" />
            กลับไปหน้าแรก
          </Link>

          <div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-[#FF8C00] to-[#FF4500] shadow-lg">
            <Flame className="size-7 text-white" />
          </div>

          <h1 className="text-4xl font-bold leading-[1.3] tracking-tight md:text-5xl">
            เลือกแผนที่ใช่เพื่อเติบโต
            <br className="hidden md:block" />
            ไปกับ FinnWeb
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-[1.7] text-slate-300">
            ปลดล็อกฟีเจอร์ AI ขั้นสูงและระบบแจ้งเตือน LINE
            เพื่อปิดยอดขายได้เร็วขึ้น โดยยังยึดแพ็กเกจมาตรฐาน Free / Basic /
            Business / Pro
          </p>

          <div className="mt-10 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setBillingInterval("MONTHLY");
              }}
              className={`rounded-xl px-6 py-2.5 text-sm font-bold transition ${
                billingInterval === "MONTHLY"
                  ? "bg-[#FF8C00] text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              รายเดือน
            </button>
            <button
              type="button"
              onClick={() => {
                setBillingInterval("YEARLY");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition ${
                billingInterval === "YEARLY"
                  ? "bg-[#FF8C00] text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              รายปี
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase text-orange-200">
                Save
              </span>
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.code;
            const isHighlight = Boolean(plan.highlight);
            const price =
              billingInterval === "MONTHLY"
                ? plan.monthlyPrice
                : plan.yearlyPrice;
            const yearlySaving =
              plan.monthlyPrice > 0
                ? plan.monthlyPrice * 12 - plan.yearlyPrice
                : 0;

            return (
              <article
                key={plan.code}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectPlan(plan.code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectPlan(plan.code);
                  }
                }}
                className={`cursor-pointer rounded-[30px] border p-7 backdrop-blur-xl transition duration-200 hover:-translate-y-1 active:scale-[0.99] ${
                  isSelected
                    ? "ring-2 ring-orange-400/70"
                    : "ring-0 ring-transparent"
                } ${
                  isHighlight
                    ? "border-[#FF8C00] bg-orange-500/6 shadow-[0_0_40px_rgba(255,140,0,0.12)]"
                    : "border-white/10 bg-white/4"
                }`}
              >
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-white/6 p-3">
                    {getPlanIcon(plan.code)}
                  </div>
                  {isHighlight && (
                    <span className="rounded-full bg-linear-to-r from-[#FF8C00] to-[#FF4500] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      Recommended
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm leading-[1.7] text-slate-400">
                  {plan.tagline}
                </p>

                <div className="my-8">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">
                      ฿{formatPrice(price)}
                    </span>
                    <span className="pb-1 text-slate-500">/เดือน</span>
                  </div>
                  {billingInterval === "YEARLY" && yearlySaving > 0 && (
                    <p className="mt-1 text-xs text-[#FF8C00]">
                      ประหยัด ฿{formatPrice(yearlySaving)} ต่อปี
                    </p>
                  )}
                </div>

                <div className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`mt-0.5 size-4 shrink-0 ${
                          isHighlight ? "text-[#FF8C00]" : "text-slate-500"
                        }`}
                      />
                      <p className="text-sm leading-[1.7] text-slate-300">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectPlan(plan.code);
                    handleContinueToCheckout(plan.code);
                  }}
                  className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-linear-to-r from-[#FF8C00] to-[#FF4500] text-white shadow-lg shadow-orange-500/20"
                      : "border border-white/12 bg-white/5 text-slate-100 hover:bg-white/10"
                  }`}
                >
                  {isSelected
                    ? `ไปหน้าชำระเงิน ${plan.name}`
                    : `เลือกแผน ${plan.name}`}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </article>
            );
          })}
        </section>

        {errorMessage && (
          <section className="mt-8 rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </section>
        )}

        <section className="mt-20 flex flex-col items-center justify-between gap-8 rounded-[36px] border border-white/8 bg-white/4 p-8 backdrop-blur-xl md:flex-row md:p-10">
          <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
            <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
              <ShieldCheck className="size-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold">
                ยังไม่แน่ใจว่าจะเลือกแผนไหน?
              </h4>
              <p className="mt-1 text-sm leading-[1.7] text-slate-300">
                ให้ทีม FinnWeb ช่วยแนะนำแพ็กเกจที่เหมาะกับเป้าหมายยอดขายของคุณ
              </p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-6 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <MessageCircle className="size-5 text-[#FF8C00]" />
            คุยกับทีมงานผ่าน LINE
          </button>
        </section>

        <footer className="mt-14 text-center text-xs leading-[1.7] text-slate-500">
          <p>
            ราคาทั้งหมดเป็นราคารายเดือนและยังไม่รวมภาษีมูลค่าเพิ่ม 7%
            โดยสามารถเปลี่ยนแผนได้ทุกเมื่อ
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
            <span>Secure Payments via Stripe</span>
            <span>Fast Checkout Experience</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#1A1C23] text-[#F9FAFB]">
          Loading subscription options...
        </main>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
