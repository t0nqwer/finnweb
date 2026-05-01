"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckout,
} from "@stripe/react-stripe-js/checkout";
import type { StripeCheckoutElementsSdkOptions } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Info,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { DEFAULT_API_BASE_URL } from "@/lib/api-client";
import { normalizeApiBaseUrl, readStoredAuthState } from "@/lib/auth-storage";
import {
  type BillingInterval,
  type PlanCode,
  type PaidPlanCode,
  getPlanByCode,
  isPlanCode,
} from "@/lib/plan-catalog";

type CheckoutSessionApiResponse = {
  success?: boolean;
  message?: string;
  clientSecret?: string;
};

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function formatPrice(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const checkoutAppearance: NonNullable<
  NonNullable<StripeCheckoutElementsSdkOptions["elementsOptions"]>["appearance"]
> = {
  theme: "night",
  inputs: "spaced",
  labels: "floating",
  variables: {
    colorPrimary: "#FF8C00",
    colorBackground: "#2D2F39",
    colorText: "#F9FAFB",
    colorDanger: "#EF4444",
    colorSuccess: "#10B981",
    colorWarning: "#F59E0B",
    fontFamily: "Kanit, system-ui, sans-serif",
    fontSizeBase: "16px",
    spacingUnit: "4px",
    borderRadius: "12px",
  },
  rules: {
    ".Input": {
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.14)",
      color: "#F9FAFB",
    },
    ".Input:focus": {
      border: "1px solid #FF8C00",
      boxShadow: "0 0 0 3px rgba(255,140,0,0.22)",
    },
    ".Input::placeholder": {
      color: "#9CA3AF",
    },
    ".Label": {
      color: "#9CA3AF",
      fontWeight: "600",
    },
    ".Label--focused": {
      color: "#F9FAFB",
    },
    ".Error": {
      color: "#FCA5A5",
    },
    ".Tab": {
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "none",
    },
    ".Tab:hover": {
      border: "1px solid rgba(255,255,255,0.2)",
    },
    ".Tab--selected": {
      border: "1px solid #FF8C00",
      boxShadow: "0 0 0 2px rgba(255,140,0,0.18)",
    },
    ".TabLabel": {
      color: "#CBD5E1",
      fontWeight: "600",
    },
    ".TabLabel--selected": {
      color: "#FFFFFF",
    },
  },
};

type PaymentElementFormProps = {
  returnUrl: string;
  onError: (message: string) => void;
  onStatus: (message: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
};

function PaymentElementForm({
  returnUrl,
  onError,
  onStatus,
  isProcessing,
  setIsProcessing,
}: PaymentElementFormProps) {
  const checkoutState = useCheckout();

  async function handleConfirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkoutState.type !== "success") {
      return;
    }

    setIsProcessing(true);
    onError("");
    onStatus("กำลังยืนยันการชำระเงิน...");

    const result = await checkoutState.checkout.confirm({
      returnUrl,
      redirect: "if_required",
    });

    if (result.type === "error") {
      onError(result.error.message);
      onStatus("");
      setIsProcessing(false);
      return;
    }

    onStatus("ยืนยันการชำระเงินสำเร็จ กำลังดำเนินการต่อ...");
    setIsProcessing(false);
  }

  if (checkoutState.type === "loading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-slate-300">
        กำลังโหลดฟอร์มชำระเงิน...
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {checkoutState.error.message}
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirmPayment} className="space-y-6">
      <PaymentElement />

      <button
        type="submit"
        disabled={isProcessing}
        className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#FF8C00] to-[#FF4500] text-sm font-bold text-white shadow-xl shadow-orange-500/25 transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
      >
        {isProcessing ? "กำลังประมวลผล..." : "ชำระเงินตอนนี้"}
        {!isProcessing && (
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>
    </form>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planFromQuery = searchParams.get("plan")?.toUpperCase();
  const billingFromQuery = searchParams.get("billingInterval")?.toUpperCase();
  const workspaceFromQuery = searchParams.get("workspaceId") ?? "";

  const selectedPlanCode: PlanCode = isPlanCode(planFromQuery)
    ? planFromQuery
    : "BUSINESS";

  const billingInterval: BillingInterval =
    billingFromQuery === "YEARLY" ? "YEARLY" : "MONTHLY";

  const plan = getPlanByCode(selectedPlanCode);
  const subtotal =
    billingInterval === "MONTHLY" ? plan.monthlyPrice : plan.yearlyPrice;
  const total = subtotal;
  const preVatAmount = total / 1.07;
  const vatIncludedAmount = total - preVatAmount;
  const trialDays = plan.trialDays;

  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [accessToken, setAccessToken] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaceFromQuery);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthHydrated, setIsAuthHydrated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredAuthState();

    if (stored.apiBaseUrl) {
      setApiBaseUrl(stored.apiBaseUrl);
    }

    if (stored.accessToken) {
      setAccessToken(stored.accessToken);
    }

    if (!workspaceFromQuery && stored.workspaceId) {
      setWorkspaceId(stored.workspaceId);
    }

    setIsAuthHydrated(true);
  }, [workspaceFromQuery]);

  const normalizedApiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );

  const checkoutReturnUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "http://localhost:3000/dashboard/billing";
    }

    return `${window.location.origin}/dashboard/billing`;
  }, []);

  const checkoutElementsOptions = useMemo(
    () => ({
      clientSecret: clientSecret ?? "",
      elementsOptions: {
        appearance: checkoutAppearance,
      },
    }),
    [clientSecret],
  );

  useEffect(() => {
    async function initializeCheckout() {
      if (!isAuthHydrated) {
        return;
      }

      if (selectedPlanCode === "FREE") {
        router.push("/subscription?plan=BUSINESS");
        return;
      }

      if (!accessToken) {
        const nextPath = `/subscription/checkout?plan=${selectedPlanCode}&billingInterval=${billingInterval}`;
        router.push(`/register?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (!workspaceId) {
        setIsInitializing(false);
        setErrorMessage("กรุณาเลือกเว็บไซต์ก่อนดำเนินการชำระเงิน");
        return;
      }

      if (!normalizedApiBaseUrl) {
        setIsInitializing(false);
        setErrorMessage("API base URL is invalid.");
        return;
      }

      if (!stripePromise) {
        setIsInitializing(false);
        setErrorMessage("Stripe publishable key is not configured.");
        return;
      }

      setIsInitializing(true);
      setErrorMessage(null);
      setStatusMessage("กำลังเตรียมหน้าชำระเงิน...");

      try {
        const response = await fetch("/api/checkout/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiBaseUrl: normalizedApiBaseUrl,
            accessToken,
            workspaceId,
            planCode: selectedPlanCode as PaidPlanCode,
            billingInterval,
            checkoutMode: "embedded",
          }),
        });

        const payload = (await response
          .json()
          .catch(() => null)) as CheckoutSessionApiResponse | null;

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message || `Request failed with status ${response.status}`,
          );
        }

        if (!payload.clientSecret) {
          throw new Error(
            "Checkout client secret was not returned by the API.",
          );
        }

        setClientSecret(payload.clientSecret);
        setStatusMessage("กรอกข้อมูลบัตรเครดิตเพื่อดำเนินการต่อ");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to initialize checkout.",
        );
        setStatusMessage(null);
      } finally {
        setIsInitializing(false);
      }
    }

    void initializeCheckout();
  }, [
    accessToken,
    billingInterval,
    isAuthHydrated,
    normalizedApiBaseUrl,
    router,
    selectedPlanCode,
    workspaceId,
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1A1C23] px-6 py-12 text-[#F9FAFB]">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full bg-[#FF8C00]/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-size-[24px_24px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between">
          <Link
            href="/subscription"
            className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 transition hover:text-white"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            กลับไปเลือกแผน
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-[#FF8C00] to-[#FF4500] shadow-lg">
              <Flame className="size-5 text-white" />
            </div>
            <span className="text-lg font-bold italic tracking-tight">
              Finn<span className="text-white">Web</span>
            </span>
          </div>

          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 md:flex">
            <Lock className="size-4" />
            Secure Checkout
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <section className="space-y-8 lg:col-span-7">
            <div>
              <h1 className="text-3xl font-bold">ยืนยันการชำระเงิน</h1>
              <p className="mt-2 text-sm leading-[1.7] text-slate-400">
                กรอกข้อมูลบัตรเครดิตเพื่ออัปเกรดเป็น FinnWeb {plan.name}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/25 bg-orange-500/8 px-4 py-3">
              <p className="text-xs font-semibold tracking-[0.08em] text-orange-100">
                {trialDays > 0
                  ? `ทดลองใช้ฟรี ${trialDays} วัน จากนั้นชำระ ฿${formatPrice(total)} ต่อ${billingInterval === "MONTHLY" ? "เดือน" : "ปี"} (ราคารวม VAT แล้ว)`
                  : `ไม่มีช่วงทดลอง ระบบจะเรียกเก็บ ฿${formatPrice(total)} ต่อ${billingInterval === "MONTHLY" ? "เดือน" : "ปี"} (ราคารวม VAT แล้ว)`}
              </p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/3 p-8 backdrop-blur-xl md:p-10">
              {errorMessage ? (
                <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : isInitializing ? (
                <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-slate-300">
                  กำลังเตรียมฟอร์มชำระเงิน...
                </div>
              ) : clientSecret && stripePromise ? (
                <CheckoutElementsProvider
                  stripe={stripePromise}
                  options={checkoutElementsOptions}
                >
                  <PaymentElementForm
                    returnUrl={checkoutReturnUrl}
                    onError={(message) => setErrorMessage(message || null)}
                    onStatus={(message) => setStatusMessage(message || null)}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                  />
                </CheckoutElementsProvider>
              ) : (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  ไม่สามารถโหลดแบบฟอร์มชำระเงินได้
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-blue-400" />
              <p className="text-xs leading-[1.7] text-slate-400">
                {trialDays > 0
                  ? `วันนี้ยังไม่มีการเรียกเก็บเงิน คุณจะได้ทดลองใช้ฟรี ${trialDays} วัน หลังครบช่วงทดลอง ระบบจะเริ่มเรียกเก็บเงินอัตโนมัติทุก${billingInterval === "MONTHLY" ? " 30 วัน " : " 12 เดือน "}ในราคา ฿${formatPrice(total)} ต่อรอบบิล (ราคารวม VAT แล้ว) และสามารถยกเลิกได้จากหน้าแดชบอร์ด`
                  : `ระบบจะเรียกเก็บเงินทันทีตามรอบบิลที่เลือก (${billingInterval === "MONTHLY" ? "รายเดือน" : "รายปี"}) ในราคา ฿${formatPrice(total)} ต่อรอบบิล (ราคารวม VAT แล้ว) และสามารถยกเลิกได้จากหน้าแดชบอร์ด`}
              </p>
            </div>

            {statusMessage && (
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
                {statusMessage}
              </div>
            )}
          </section>

          <aside className="lg:col-span-5">
            <div className="sticky top-24 rounded-[32px] border border-white/10 bg-white/3 p-8 backdrop-blur-xl">
              <h2 className="mb-6 text-xl font-bold">สรุปรายการสั่งซื้อ</h2>

              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white">
                      FinnWeb {plan.name} Plan
                    </h3>
                    <p className="text-xs text-slate-500">
                      {billingInterval === "MONTHLY"
                        ? "Monthly Subscription"
                        : "Yearly Subscription"}
                    </p>
                  </div>
                  <span className="font-bold">฿{formatPrice(subtotal)}</span>
                </div>

                <div className="space-y-3 border-t border-white/5 pt-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ราคาก่อน VAT</span>
                    <span>฿{formatPrice(preVatAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">VAT 7%</span>
                    <span>฿{formatPrice(vatIncludedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      ราคาหลัง VAT (รวม VAT)
                    </span>
                    <span>฿{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ทดลองใช้ฟรี</span>
                    <span>{trialDays > 0 ? `${trialDays} วัน` : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ยอดที่ชำระวันนี้</span>
                    <span>฿0.00</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold">
                      เริ่มชำระหลังทดลองใช้ฟรี
                    </span>
                    <span className="text-3xl font-bold text-[#FF8C00]">
                      ฿{formatPrice(total)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#FF8C00]/20 bg-[#FF8C00]/5 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#FF8C00]">
                    <CheckCircle2 className="size-4" />
                    สิ่งที่คุณจะได้รับ
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {plan.checkoutIncludedItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-white/5 pt-8">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <ShieldCheck className="size-4 text-green-500" />
                  <span>ข้อมูลถูกปกป้องด้วยการเข้ารหัส 256-bit SSL</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#1A1C23] text-[#F9FAFB]">
          Loading checkout page...
        </main>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
