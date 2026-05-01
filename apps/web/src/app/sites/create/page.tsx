"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  SparklesIcon,
  StethoscopeIcon,
  StoreIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { SiteEditorSimulator } from "@/components/site-editor-simulator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";
import {
  persistAuthState,
  readStoredAuthState,
  type StoredAuthState,
} from "@/lib/auth-storage";
import { resolveSectionApiErrorMessage } from "@/lib/section-error-messages";

type BusinessCategory = "restaurant" | "clinic" | "ecommerce" | "corporate";
type SiteGoal = "collect-leads" | "sell-single-product" | "show-company-info";

const GOAL_OPTIONS: Array<{ id: SiteGoal; label: string }> = [
  { id: "collect-leads", label: "เก็บรายชื่อลูกค้า" },
  { id: "sell-single-product", label: "ปิดการขายสินค้า" },
  { id: "show-company-info", label: "ให้ข้อมูลธุรกิจ" },
];

type SiteRecord = {
  id: string;
  name: string;
  slug: string;
  workspace?: {
    id: string;
  };
};

type ApiTemplateSection = {
  id: string;
  type: string;
  name?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  props?: Record<string, unknown> | null;
};

type ApiTemplatePage = {
  id: string;
  title: string;
  slug: string;
  path?: string | null;
  pageType: string;
  isHomePage?: boolean;
  sortOrder?: number;
  sections: ApiTemplateSection[];
};

type ApiTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: {
    slug: string;
    name: string;
  } | null;
  pages: ApiTemplatePage[];
};

type WizardSetup = {
  siteName: string;
  brandName: string;
  phone: string;
  lineId: string;
  logoUrl: string;
};

type StarterTemplate = {
  id: string;
  name: string;
  image: string;
  category: BusinessCategory;
  goal: SiteGoal[];
  pageTitle: string;
  pageTree?: Array<{
    id: string;
    title: string;
    sectionTypes: string[];
  }>;
  sections: Array<{
    type: string;
    name: string;
    props: Record<string, unknown>;
    sortOrder?: number;
    isVisible?: boolean;
  }>;
};

const CATEGORIES: Array<{
  id: BusinessCategory;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    id: "restaurant",
    label: "ร้านอาหาร / คาเฟ่",
    description: "เน้นโชว์เมนูและพิกัดร้าน",
    icon: UtensilsCrossedIcon,
  },
  {
    id: "clinic",
    label: "คลินิก / บริการ",
    description: "เน้นระบบนัดหมายและรีวิว",
    icon: StethoscopeIcon,
  },
  {
    id: "ecommerce",
    label: "ขายของออนไลน์",
    description: "เน้น Sale Page ปิดการขาย",
    icon: ShoppingBagIcon,
  },
  {
    id: "corporate",
    label: "บริษัท / องค์กร",
    description: "เน้นความน่าเชื่อถือและข้อมูล",
    icon: BriefcaseIcon,
  },
];

const TEMPLATES: StarterTemplate[] = [
  {
    id: "coffee",
    name: "HormGrun Coffee",
    category: "restaurant",
    goal: ["collect-leads", "sell-single-product"],
    image:
      "https://images.unsplash.com/photo-1501339819358-ee5f8a17f24e?auto=format&fit=crop&q=80&w=400",
    pageTitle: "หน้าโปรโมตร้านกาแฟ",
    sections: [
      {
        type: "HERO",
        name: "ส่วนหัวร้าน",
        props: {
          title: "กาแฟคั่วสด ส่งตรงถึงคุณ",
          subtitle: "สร้างยอดขายได้ตั้งแต่หน้าแรกด้วยเมนูเด่นและโปรโมชัน",
          buttonText: "สั่งเลย",
        },
      },
      {
        type: "FEATURE",
        name: "เมนูแนะนำ",
        props: {
          title: "เมนูขายดีของสัปดาห์",
          body: "เพิ่มรูปและราคาของเมนูเพื่อช่วยให้ลูกค้าตัดสินใจเร็วขึ้น",
        },
      },
      {
        type: "FORM",
        name: "ฟอร์มรับออเดอร์",
        props: {
          title: "สั่งล่วงหน้า",
          subtitle: "ฝากข้อมูลไว้แล้วทีมงานจะติดต่อกลับ",
          buttonText: "ส่งคำสั่งซื้อ",
        },
      },
    ],
  },
  {
    id: "clinic",
    name: "Smile Clinic Pro",
    category: "clinic",
    goal: ["collect-leads", "show-company-info"],
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400",
    pageTitle: "หน้าคลินิก",
    sections: [
      {
        type: "HERO",
        name: "ส่วนหัวคลินิก",
        props: {
          title: "ดูแลโดยทีมแพทย์ผู้เชี่ยวชาญ",
          subtitle: "พร้อมจองคิวได้ทันทีจากหน้าเว็บ",
          buttonText: "จองคิว",
        },
      },
      {
        type: "ABOUT",
        name: "จุดเด่นคลินิก",
        props: {
          title: "มาตรฐานที่ลูกค้าไว้วางใจ",
          body: "แสดงข้อมูลบริการและรีวิวลูกค้าเพื่อเพิ่มความน่าเชื่อถือ",
        },
      },
      {
        type: "FORM",
        name: "ฟอร์มนัดหมาย",
        props: {
          title: "นัดหมายรับบริการ",
          subtitle: "กรอกข้อมูลเบื้องต้นเพื่อนัดหมายกับทีมงาน",
          buttonText: "ส่งนัดหมาย",
        },
      },
    ],
  },
  {
    id: "gadget",
    name: "Modern Gadget Shop",
    category: "ecommerce",
    goal: ["sell-single-product", "collect-leads"],
    image:
      "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400",
    pageTitle: "หน้าโปรโมตสินค้า",
    sections: [
      {
        type: "HERO",
        name: "ส่วนหัวสินค้า",
        props: {
          title: "ดีลพิเศษ สินค้าขายดี",
          subtitle: "โฟกัสสินค้าเดียวเพื่อเพิ่มอัตราการปิดการขาย",
          buttonText: "ซื้อทันที",
        },
      },
      {
        type: "FEATURE",
        name: "คุณสมบัติเด่น",
        props: {
          title: "ทำไมต้องสินค้านี้",
          body: "สรุปจุดเด่นและรีวิวสั้นๆ เพื่อเพิ่มความมั่นใจ",
        },
      },
      {
        type: "CTA",
        name: "ปิดการขาย",
        props: {
          title: "พร้อมเป็นเจ้าของแล้วหรือยัง",
          subtitle: "กดปุ่มเพื่อรับโปรโมชันพิเศษทันที",
          buttonText: "รับโปรเลย",
        },
      },
    ],
  },
  {
    id: "portfolio",
    name: "Minimalist Portfolio",
    category: "corporate",
    goal: ["show-company-info"],
    image:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=400",
    pageTitle: "หน้าแนะนำบริษัท",
    sections: [
      {
        type: "HERO",
        name: "ส่วนหัวบริษัท",
        props: {
          title: "พาร์ตเนอร์ธุรกิจที่คุณไว้วางใจ",
          subtitle: "สื่อสารจุดแข็งและผลงานให้ลูกค้ารู้จักในไม่กี่วินาที",
          buttonText: "ดูบริการ",
        },
      },
      {
        type: "ABOUT",
        name: "เกี่ยวกับเรา",
        props: {
          title: "เราเป็นใคร",
          body: "เพิ่มข้อมูลบริษัทและวิสัยทัศน์เพื่อเสริมภาพลักษณ์มืออาชีพ",
        },
      },
      {
        type: "CTA",
        name: "ติดต่อทีมงาน",
        props: {
          title: "เริ่มโปรเจกต์กับเรา",
          subtitle: "ส่งข้อมูลติดต่อเพื่อให้ทีมงานติดต่อกลับ",
          buttonText: "พูดคุยกับทีมงาน",
        },
      },
    ],
  },
];

function buildContactHint(setup: WizardSetup) {
  const parts: string[] = [];

  if (setup.phone.trim()) {
    parts.push(`โทร ${setup.phone.trim()}`);
  }

  if (setup.lineId.trim()) {
    parts.push(`LINE: ${setup.lineId.trim()}`);
  }

  return parts.join(" | ");
}

function applyWizardSetupToTemplate(
  template: StarterTemplate,
  setup: WizardSetup,
) {
  const contactHint = buildContactHint(setup);
  const brandName = setup.brandName.trim();

  return {
    ...template,
    sections: template.sections.map((section) => {
      const nextProps = { ...section.props };

      if (section.type === "HERO" && brandName) {
        nextProps.title = `${brandName} พร้อมดูแลลูกค้าของคุณ`;
      }

      if (
        (section.type === "FORM" || section.type === "CONTACT") &&
        contactHint
      ) {
        const existingSubtitle =
          typeof nextProps.subtitle === "string" ? nextProps.subtitle : "";
        nextProps.subtitle = existingSubtitle
          ? `${existingSubtitle} (${contactHint})`
          : contactHint;
      }

      if (section.type === "CTA" && contactHint) {
        const existingSubtitle =
          typeof nextProps.subtitle === "string" ? nextProps.subtitle : "";
        nextProps.subtitle = existingSubtitle
          ? `${existingSubtitle} ติดต่อได้ที่ ${contactHint}`
          : `ติดต่อได้ที่ ${contactHint}`;
      }

      if (section.type === "IMAGE" && setup.logoUrl.trim()) {
        nextProps.imageUrl = setup.logoUrl.trim();
      }

      return {
        ...section,
        props: nextProps,
      };
    }),
  };
}

function mapCategoryToBusinessCategory(
  categorySlug: string | null | undefined,
): BusinessCategory {
  if (!categorySlug) {
    return "corporate";
  }

  if (categorySlug.includes("restaurant")) {
    return "restaurant";
  }
  if (categorySlug.includes("clinic")) {
    return "clinic";
  }
  if (categorySlug.includes("estate")) {
    return "corporate";
  }
  if (categorySlug.includes("lead")) {
    return "corporate";
  }

  return "ecommerce";
}

function mapApiTemplateToStarter(apiTemplate: ApiTemplateRecord): StarterTemplate {
  const pages = [...apiTemplate.pages].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const firstPage = pages.find((page) => page.isHomePage) ?? pages[0];
  const firstSections = firstPage?.sections ?? [];

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    category: mapCategoryToBusinessCategory(apiTemplate.category?.slug),
    goal: ["collect-leads", "sell-single-product", "show-company-info"],
    image:
      apiTemplate.thumbnailUrl ||
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800",
    pageTitle: firstPage?.title ?? "หน้าแรก",
    sections: firstSections.map((section, index) => ({
      type: section.type,
      name: section.name || section.type,
      props:
        typeof section.props === "object" && section.props !== null
          ? section.props
          : {},
      sortOrder: section.sortOrder ?? index,
      isVisible: section.isVisible ?? true,
    })),
    pageTree: pages.map((page) => ({
      id: page.id,
      title: page.title,
      sectionTypes: [...page.sections]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((section) => section.type),
    })),
  } as StarterTemplate;
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-3">
      {[1, 2, 3].map((value) => (
        <div key={value} className="flex items-center gap-3">
          <div
            className={`flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
              step >= value
                ? "border-[#FF8C00] bg-[#FF8C00] text-white"
                : "border-white/15 bg-white/5 text-slate-500"
            }`}
          >
            {step > value ? <CheckCircle2Icon className="size-5" /> : value}
          </div>
          {value < 3 ? (
            <div
              className={`h-[2px] w-10 ${step > value ? "bg-[#FF8C00]" : "bg-white/15"}`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function CreateSitePage() {
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());
  const [apiTemplates, setApiTemplates] = useState<StarterTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] =
    useState<BusinessCategory | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SiteGoal>("collect-leads");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [wizardSetup, setWizardSetup] = useState<WizardSetup>({
    siteName: "",
    brandName: "",
    phone: "",
    lineId: "",
    logoUrl: "",
  });
  const [previewViewport, setPreviewViewport] = useState<"mobile" | "desktop">(
    "desktop",
  );
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);

  const apiBaseUrl = authState.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const workspaceId = authState.workspaceId ?? "";
  const accessToken = authState.accessToken ?? "";

  const availableTemplates = useMemo(
    () => (apiTemplates.length > 0 ? apiTemplates : TEMPLATES),
    [apiTemplates],
  );

  const filteredTemplates = useMemo(() => {
    return availableTemplates.filter((template) => {
      if (selectedCategory && template.category !== selectedCategory) {
        return false;
      }
      if (!template.goal.includes(selectedGoal)) {
        return false;
      }
      return true;
    });
  }, [availableTemplates, selectedCategory, selectedGoal]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    async function loadTemplates() {
      setIsLoadingTemplates(true);

      try {
        const result = await fetchApiWithTokenRefresh({
          apiBaseUrl,
          path: "/templates?scope=all",
          init: { cache: "no-store" },
        });

        if (!result.response.ok) {
          throw new Error("โหลด template ไม่สำเร็จ");
        }

        const templatesPayload =
          typeof result.payload === "object" &&
          result.payload &&
          "data" in result.payload &&
          Array.isArray(result.payload.data)
            ? (result.payload.data as ApiTemplateRecord[])
            : [];

        if (!cancelled) {
          setApiTemplates(templatesPayload.map(mapApiTemplateToStarter));
        }
      } catch {
        if (!cancelled) {
          setApiTemplates([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTemplates(false);
        }
      }
    }

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBaseUrl]);

  async function handleCreateSite() {
    if (!accessToken) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนสร้างเว็บไซต์");
      return;
    }

    if (!wizardSetup.siteName.trim() || !wizardSetup.brandName.trim()) {
      setErrorMessage("กรุณากรอกชื่อเว็บไซต์และชื่อแบรนด์ก่อน");
      return;
    }

    const selectedTemplateBase =
      availableTemplates.find((template) => template.id === selectedTemplateId) ??
      filteredTemplates[0];

    if (!selectedTemplateBase) {
      setErrorMessage("กรุณาเลือกเทมเพลตก่อน");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const createSiteResult = await fetchApiWithTokenRefresh({
        apiBaseUrl,
        path: "/sites",
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: wizardSetup.siteName.trim(),
            workspaceId: workspaceId || undefined,
            templateId: selectedTemplateBase.id,
          }),
        },
      });

      if (!createSiteResult.response.ok) {
        throw new Error(
          resolveSectionApiErrorMessage(
            createSiteResult.payload,
            "สร้างเว็บไซต์ไม่สำเร็จ",
          ),
        );
      }

      const createdSite =
        typeof createSiteResult.payload === "object" &&
        createSiteResult.payload &&
        "data" in createSiteResult.payload
          ? (createSiteResult.payload.data as SiteRecord)
          : null;

      if (!createdSite) {
        throw new Error("สร้างเว็บไซต์ไม่สำเร็จ");
      }

      persistAuthState({
        apiBaseUrl,
        siteId: createdSite.id,
        workspaceId: createdSite.workspace?.id ?? workspaceId,
      });

      setStatusMessage(`สร้างเว็บไซต์ ${createdSite.name} เรียบร้อยแล้ว`);
      setEditingSite(createdSite);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "สร้างเว็บไซต์ไม่สำเร็จ",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const handleSaveAsTemplate = useCallback(
    async (targetSite: SiteRecord) => {
      if (!accessToken) {
        setErrorMessage("กรุณาเข้าสู่ระบบก่อนบันทึกเทมเพลต");
        return;
      }

      try {
        setStatusMessage("กำลังบันทึกเว็บไซต์นี้เป็นเทมเพลต...");
        setErrorMessage(null);

        const pagesResponse = await fetchApiWithTokenRefresh({
          apiBaseUrl,
          path: `/sites/${targetSite.id}/pages`,
          init: { cache: "no-store" },
        });

        if (!pagesResponse.response.ok) {
          throw new Error(
            resolveSectionApiErrorMessage(
              pagesResponse.payload,
              "โหลดข้อมูลหน้าเว็บไซต์ไม่สำเร็จ",
            ),
          );
        }

        const pages =
          typeof pagesResponse.payload === "object" &&
          pagesResponse.payload &&
          "data" in pagesResponse.payload &&
          Array.isArray(pagesResponse.payload.data)
            ? (pagesResponse.payload.data as Array<{
                id: string;
                title: string;
                slug: string;
                path?: string | null;
                pageType: string;
                isHomePage?: boolean;
                isPublished?: boolean;
                sortOrder?: number;
              }>)
            : [];

        const pagesForTemplate = await Promise.all(
          pages.map(async (page) => {
            const detailResponse = await fetchApiWithTokenRefresh({
              apiBaseUrl,
              path: `/sites/${targetSite.id}/pages/${page.id}`,
              init: { cache: "no-store" },
            });

            if (!detailResponse.response.ok) {
              throw new Error(
                resolveSectionApiErrorMessage(
                  detailResponse.payload,
                  "โหลด section ของหน้าไม่สำเร็จ",
                ),
              );
            }

            const pageDetail =
              typeof detailResponse.payload === "object" &&
              detailResponse.payload &&
              "data" in detailResponse.payload &&
              typeof detailResponse.payload.data === "object" &&
              detailResponse.payload.data
                ? (detailResponse.payload.data as {
                    sections?: Array<{
                      type: string;
                      name?: string | null;
                      sortOrder?: number;
                      isVisible?: boolean;
                      props?: Record<string, unknown> | null;
                    }>;
                  })
                : null;

            return {
              title: page.title,
              slug: page.slug,
              path: page.path || undefined,
              pageType: page.pageType,
              isHomePage: Boolean(page.isHomePage),
              isPublished: Boolean(page.isPublished),
              sortOrder: page.sortOrder ?? 0,
              sections: (pageDetail?.sections ?? []).map((section) => ({
                type: section.type,
                name: section.name || undefined,
                sortOrder: section.sortOrder ?? 0,
                isVisible: section.isVisible ?? true,
                props:
                  section.props && typeof section.props === "object"
                    ? section.props
                    : {},
              })),
            };
          }),
        );

        const createTemplateResponse = await fetchApiWithTokenRefresh({
          apiBaseUrl,
          path: "/templates",
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: `${targetSite.name} Template`,
              category: "custom",
              pages: pagesForTemplate,
            }),
          },
        });

        if (!createTemplateResponse.response.ok) {
          throw new Error(
            resolveSectionApiErrorMessage(
              createTemplateResponse.payload,
              "บันทึกเป็นเทมเพลตไม่สำเร็จ",
            ),
          );
        }

        setStatusMessage("บันทึกเว็บไซต์เป็นเทมเพลตเรียบร้อยแล้ว");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "บันทึกเป็นเทมเพลตไม่สำเร็จ",
        );
      }
    },
    [accessToken, apiBaseUrl],
  );

  if (editingSite) {
    return (
      <SiteEditorSimulator
        site={editingSite}
        onClose={() => setEditingSite(null)}
        onSaveAsTemplate={(site) => {
          void handleSaveAsTemplate(site);
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-[#F9FAFB]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[50vw] w-[50vw] rounded-full bg-[#FF8C00]/8 blur-[120px]" />
        <div className="absolute -bottom-[12%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-blue-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FF4500] shadow-lg">
            <FlameIcon className="size-7 text-white" />
          </div>
          <h1 className="font-kanit text-4xl font-bold">
            มาเริ่มสร้างเว็บไซต์ที่ &quot;ฟิน&quot; ที่สุดกัน
          </h1>
          <p className="mt-3 text-slate-400">
            ทำตามขั้นตอนง่ายๆ เพื่อเปิดตัวธุรกิจของคุณบนโลกออนไลน์
          </p>
        </div>

        <StepIndicator step={step} />

        {errorMessage ? (
          <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="mb-6 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                เลือกเป้าหมายหลักของหน้า
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      selectedGoal === goal.id
                        ? "border-[#FF8C00]/70 bg-[#FF8C00]/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-[#FF8C00]/40"
                    }`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setStep(2);
                    }}
                    className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-7 text-left backdrop-blur-xl transition hover:border-[#FF8C00]/60 hover:bg-white/[0.05]"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5 text-[#FF8C00] transition group-hover:scale-105">
                        <Icon className="size-6" />
                      </span>
                      <ChevronRightIcon className="size-4 text-slate-500 group-hover:text-[#FF8C00]" />
                    </div>
                    <p className="font-kanit text-xl font-bold">
                      {category.label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">
                      {category.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-7">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-slate-400 transition hover:text-white"
                onClick={() => setStep(1)}
              >
                <ChevronLeftIcon className="size-4" /> ย้อนกลับ
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewViewport === "mobile" ? "default" : "ghost"}
                  onClick={() => setPreviewViewport("mobile")}
                >
                  <SmartphoneIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewViewport === "desktop" ? "default" : "ghost"}
                  onClick={() => setPreviewViewport("desktop")}
                >
                  <StoreIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
              {isLoadingTemplates ? (
                <p className="col-span-full text-sm text-slate-400">
                  กำลังโหลด template library...
                </p>
              ) : null}
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(template.id);
                    setStep(3);
                  }}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] text-left transition hover:border-[#FF8C00]/60"
                >
                  <div
                    className={`${previewViewport === "mobile" ? "aspect-[4/4.8]" : "aspect-video"} overflow-hidden`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.image}
                      alt={template.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="bg-[#0f172a] p-5">
                    <p className="font-kanit text-lg font-bold">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {template.pageTree?.length ?? 1} หน้า • Mobile Responsive
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(template.pageTree?.[0]?.sectionTypes ?? template.sections.map((section) => section.type))
                        .slice(0, 5)
                        .map((type) => (
                          <span
                            key={`${template.id}-${type}`}
                            className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-300"
                          >
                            {type}
                          </span>
                        ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <Card className="mx-auto max-w-xl border-white/10 bg-white/[0.03] text-white backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-kanit text-2xl">
                สุดท้าย... ใส่ข้อมูลแบรนด์ของคุณ
              </CardTitle>
              <p className="text-sm text-slate-400">
                ข้อมูลนี้จะถูกใส่ลงในหน้าเว็บโดยอัตโนมัติ
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ชื่อเว็บไซต์
                </label>
                <Input
                  value={wizardSetup.siteName}
                  onChange={(event) =>
                    setWizardSetup((current) => ({
                      ...current,
                      siteName: event.target.value,
                    }))
                  }
                  className="h-12 border-white/10 bg-white/5"
                  placeholder="เช่น Finn Coffee"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ชื่อแบรนด์ / ร้านค้า
                </label>
                <Input
                  value={wizardSetup.brandName}
                  onChange={(event) =>
                    setWizardSetup((current) => ({
                      ...current,
                      brandName: event.target.value,
                    }))
                  }
                  className="h-12 border-white/10 bg-white/5"
                  placeholder="เช่น Finn Coffee Roasters"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    เบอร์โทร
                  </label>
                  <Input
                    value={wizardSetup.phone}
                    onChange={(event) =>
                      setWizardSetup((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    className="h-12 border-white/10 bg-white/5"
                    placeholder="08X-XXX-XXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    LINE ID
                  </label>
                  <Input
                    value={wizardSetup.lineId}
                    onChange={(event) =>
                      setWizardSetup((current) => ({
                        ...current,
                        lineId: event.target.value,
                      }))
                    }
                    className="h-12 border-white/10 bg-white/5"
                    placeholder="@yourname"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  โลโก้ (URL)
                </label>
                <Input
                  value={wizardSetup.logoUrl}
                  onChange={(event) =>
                    setWizardSetup((current) => ({
                      ...current,
                      logoUrl: event.target.value,
                    }))
                  }
                  className="h-12 border-white/10 bg-white/5"
                  placeholder="https://.../logo.png"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={() => void handleCreateSite()}
                  disabled={
                    isCreating ||
                    !wizardSetup.siteName.trim() ||
                    !wizardSetup.brandName.trim()
                  }
                  className="h-12 bg-gradient-to-r from-[#FF8C00] to-[#FF4500] font-bold text-white shadow-xl shadow-orange-500/20"
                >
                  {isCreating ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      กำลังสร้างเว็บไซต์...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      สร้างเว็บไซต์เลย <ArrowRightIcon className="size-4" />
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  className="text-sm text-slate-400 transition hover:text-white"
                  onClick={() => setStep(2)}
                >
                  ย้อนกลับไปเปลี่ยนเทมเพลต
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-10 text-center text-xs text-slate-500">
          <p className="inline-flex items-center gap-2">
            <SparklesIcon className="size-3.5" />
            Step-by-step flow พร้อมเข้า editor อัตโนมัติหลังสร้างเสร็จ
          </p>
        </div>
      </div>
    </div>
  );
}
