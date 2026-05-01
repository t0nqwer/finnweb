export type PlanCode = "FREE" | "BASIC" | "BUSINESS" | "PRO";
export type PaidPlanCode = Exclude<PlanCode, "FREE">;
export type BillingInterval = "MONTHLY" | "YEARLY";

export type FinnwebPlan = {
  code: PlanCode;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
  highlight?: boolean;
  subscriptionCta: string;
  pricingHref: string;
  pricingHighlights: string[];
  subscriptionFeatures: string[];
  checkoutIncludedItems: string[];
};

export const FINNWEB_PLAN_CATALOG: readonly FinnwebPlan[] = [
  {
    code: "FREE",
    name: "Free",
    tagline: "ทดลองเล่นและทำนามบัตรออนไลน์",
    monthlyPrice: 0,
    yearlyPrice: 0,
    trialDays: 0,
    subscriptionCta: "เริ่มใช้งานฟรี",
    pricingHref: "/register?plan=FREE",
    pricingHighlights: [
      "เหมาะสำหรับทดลองเล่น/นามบัตร",
      "1 เว็บไซต์, 1 หน้า, 10 Sections",
      "LINE OA 5 ครั้ง/เดือน",
      "Help Center",
    ],
    subscriptionFeatures: [
      "สร้างได้ 1 เว็บไซต์",
      "สูงสุด 1 หน้า / เว็บไซต์",
      "10 Sections / หน้า",
      "LINE OA จำกัด 5 ครั้ง/เดือน",
      "Support: Help Center",
    ],
    checkoutIncludedItems: [
      "1 เว็บไซต์",
      "1 หน้า/เว็บไซต์",
      "10 Sections/หน้า",
    ],
  },
  {
    code: "BASIC",
    name: "Basic",
    tagline: "เริ่มต้นมีหน้าร้านและปิดการขายเบื้องต้น",
    monthlyPrice: 250,
    yearlyPrice: 2500,
    trialDays: 7,
    subscriptionCta: "เลือกแผน Basic",
    pricingHref: "/register?plan=BASIC",
    pricingHighlights: [
      "เหมาะสำหรับเริ่มต้นมีหน้าร้าน",
      "1 เว็บไซต์, 3 หน้า, 20 Sections",
      "Ecommerce 3 สินค้า (Basic Cart)",
      "Custom Domain + Standard Support",
    ],
    subscriptionFeatures: [
      "สร้างได้ 1 เว็บไซต์",
      "สูงสุด 3 หน้า / เว็บไซต์",
      "20 Sections / หน้า",
      "Ecommerce 3 สินค้า (Basic Cart)",
      "Custom Domain",
      "LINE OA จำกัด 50 ครั้ง/เดือน",
      "Support: Standard Support",
      "ทดลองใช้ฟรี 7 วัน",
    ],
    checkoutIncludedItems: [
      "1 เว็บไซต์ / 3 หน้า",
      "20 Sections / หน้า",
      "Ecommerce 3 สินค้า (Basic Cart)",
      "Custom Domain",
      "LINE OA จำกัด 50 ครั้ง/เดือน",
    ],
  },
  {
    code: "BUSINESS",
    name: "Business",
    tagline: "แนะนำสำหรับสายขายและทีมยิงโฆษณา",
    monthlyPrice: 490,
    yearlyPrice: 4900,
    trialDays: 7,
    highlight: true,
    subscriptionCta: "เลือกแผน Business",
    pricingHref: "/register?plan=BUSINESS",
    pricingHighlights: [
      "เหมาะสำหรับสายขาย/ยิง Ads (แนะนำ)",
      "3 เว็บไซต์, 10 หน้า, 50 Sections",
      "50 สินค้า + สต็อก, 50 โพสต์",
      "Tracking/Pixel + Analytics Dashboard",
    ],
    subscriptionFeatures: [
      "สร้างได้ 3 เว็บไซต์",
      "สูงสุด 10 หน้า / เว็บไซต์",
      "50 Sections / หน้า",
      "50 สินค้า + สต็อก",
      "Blog / News สูงสุด 50 โพสต์",
      "Tracking/Pixel แบบ Full Integration",
      "Analytics Dashboard ละเอียด",
      "LINE OA ไม่จำกัด",
      "Support: Priority Support",
      "ทดลองใช้ฟรี 7 วัน",
    ],
    checkoutIncludedItems: [
      "3 เว็บไซต์ / 10 หน้า",
      "50 Sections / หน้า",
      "50 สินค้า + สต็อก",
      "50 โพสต์ (Blog/News)",
      "Tracking/Pixel Full Integration",
      "Analytics Dashboard ละเอียด",
      "LINE OA ไม่จำกัดจำนวน",
    ],
  },
  {
    code: "PRO",
    name: "Pro",
    tagline: "สำหรับเอเจนซี่และองค์กรที่ต้องการ scale เต็มที่",
    monthlyPrice: 990,
    yearlyPrice: 9900,
    trialDays: 0,
    subscriptionCta: "เลือกแผน Pro",
    pricingHref: "/register?plan=PRO",
    pricingHighlights: [
      "เหมาะสำหรับเอเจนซี่/บริษัทใหญ่",
      "10 เว็บไซต์, 50 หน้า, 100 Sections",
      "1,000 สินค้า + สต็อก, 1,000 โพสต์",
      "Custom Code / API + Exclusive Advisor",
    ],
    subscriptionFeatures: [
      "สร้างได้ 10 เว็บไซต์",
      "สูงสุด 50 หน้า / เว็บไซต์",
      "100 Sections / หน้า",
      "1,000 สินค้า + สต็อก",
      "Blog / News สูงสุด 1,000 โพสต์",
      "Tracking/Pixel แบบ Full + Custom Code",
      "Analytics Advanced Reports",
      "LINE OA ไม่จำกัด",
      "Support: Exclusive Advisor",
      "Custom Code / API",
    ],
    checkoutIncludedItems: [
      "10 เว็บไซต์ / 50 หน้า",
      "100 Sections / หน้า",
      "1,000 สินค้า + สต็อก",
      "1,000 โพสต์ (Blog/News)",
      "Tracking/Pixel Full + Custom Code",
      "Analytics Advanced Reports",
      "Custom Code / API",
    ],
  },
] as const;

export function isPlanCode(
  value: string | null | undefined,
): value is PlanCode {
  return (
    value === "FREE" ||
    value === "BASIC" ||
    value === "BUSINESS" ||
    value === "PRO"
  );
}

export function getPlanByCode(planCode: PlanCode) {
  return (
    FINNWEB_PLAN_CATALOG.find((plan) => plan.code === planCode) ??
    FINNWEB_PLAN_CATALOG[2]
  );
}
