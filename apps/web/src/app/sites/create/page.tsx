"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  EyeIcon,
  FlameIcon,
  LanguagesIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MessageCircleIcon,
  MonitorIcon,
  PaintbrushIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
  StoreIcon,
  TargetIcon,
} from "lucide-react";
import { SiteEditorSimulator } from "@/components/site-editor-simulator";
import { Button } from "@/components/ui/button";
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

type CreateStep = "profile" | "template" | "review";
type BusinessType = "restaurant" | "service" | "clinic" | "fashion" | "product";
type MainGoal = "leads" | "sales" | "store" | "booking";
type SiteStyle = "modern" | "luxury" | "minimal" | "fun";
type SiteLanguage = "thai" | "english" | "thai-english";
type PreviewMode = "desktop" | "mobile";

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
  previewUrl?: string | null;
  isOfficial?: boolean;
  category?: {
    slug: string;
    name: string;
  } | null;
  pages: ApiTemplatePage[];
};

type SiteTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  categoryLabel: string;
  categorySlug: string;
  businessType: BusinessType;
  matchedGoals: MainGoal[];
  pages: Array<{
    id: string;
    title: string;
    isHomePage: boolean;
    sectionTypes: string[];
  }>;
  sectionCount: number;
  isOfficial: boolean;
};

type WizardState = {
  businessName: string;
  siteName: string;
  businessType: BusinessType;
  goal: MainGoal;
  style: SiteStyle;
  language: SiteLanguage;
  phone: string;
  lineId: string;
  logoUrl: string;
};

type Option<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const BUSINESS_OPTIONS: Array<Option<BusinessType>> = [
  {
    id: "restaurant",
    label: "ร้านอาหาร / คาเฟ่",
    description: "เมนู โปรโมชั่น รีวิว พิกัดร้าน และปุ่ม LINE",
    icon: StoreIcon,
  },
  {
    id: "service",
    label: "ธุรกิจบริการ",
    description: "บริการ ขั้นตอนทำงาน ผลงาน ราคา และฟอร์มติดต่อ",
    icon: SparklesIcon,
  },
  {
    id: "clinic",
    label: "คลินิก / ความงาม",
    description: "ความน่าเชื่อถือ บริการ ผู้เชี่ยวชาญ FAQ และจองคิว",
    icon: CheckCircle2Icon,
  },
  {
    id: "fashion",
    label: "แฟชั่น / แบรนด์",
    description: "เรื่องราวแบรนด์ คอลเลกชัน รูปสินค้า และรีวิว",
    icon: PaintbrushIcon,
  },
  {
    id: "product",
    label: "Product Landing",
    description: "ปัญหา ประโยชน์ วิธีใช้ ข้อเสนอ และ CTA ปิดการขาย",
    icon: TargetIcon,
  },
];

const GOAL_OPTIONS: Array<Option<MainGoal>> = [
  {
    id: "leads",
    label: "เก็บลูกค้าใหม่",
    description: "เน้นฟอร์มติดต่อและส่ง lead เข้า LINE OA",
    icon: MessageCircleIcon,
  },
  {
    id: "sales",
    label: "ขายสินค้า",
    description: "เล่า offer ชัดและพาลูกค้าตัดสินใจเร็ว",
    icon: FlameIcon,
  },
  {
    id: "store",
    label: "โปรโมตร้าน",
    description: "โชว์ภาพ บริการ เวลาเปิด และตำแหน่งร้าน",
    icon: StoreIcon,
  },
  {
    id: "booking",
    label: "รับจองคิว",
    description: "เหมาะกับคลินิก สปา ร้านบริการ และที่ปรึกษา",
    icon: CheckCircle2Icon,
  },
];

const STYLE_OPTIONS: Array<{ id: SiteStyle; label: string }> = [
  { id: "modern", label: "Modern" },
  { id: "luxury", label: "Luxury" },
  { id: "minimal", label: "Minimal" },
  { id: "fun", label: "Fun" },
];

const LANGUAGE_OPTIONS: Array<{ id: SiteLanguage; label: string }> = [
  { id: "thai", label: "ไทย" },
  { id: "english", label: "English" },
  { id: "thai-english", label: "ไทย + English" },
];

const STEPS: Array<{ id: CreateStep; label: string }> = [
  { id: "profile", label: "ข้อมูลธุรกิจ" },
  { id: "template", label: "เลือกเทมเพลต" },
  { id: "review", label: "สร้างเว็บไซต์" },
];

const DEFAULT_TEMPLATE_IMAGE =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200";

function getOptionLabel<T extends string>(
  options: Array<{ id: T; label: string }>,
  id: T,
) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function inferBusinessType(template: ApiTemplateRecord): BusinessType {
  const raw = `${template.category?.slug ?? ""} ${template.category?.name ?? ""} ${template.slug} ${template.name}`.toLowerCase();

  if (raw.includes("restaurant") || raw.includes("food") || raw.includes("cafe")) {
    return "restaurant";
  }
  if (raw.includes("clinic") || raw.includes("beauty") || raw.includes("spa")) {
    return "clinic";
  }
  if (raw.includes("fashion") || raw.includes("brand")) {
    return "fashion";
  }
  if (raw.includes("product") || raw.includes("landing") || raw.includes("shop")) {
    return "product";
  }

  return "service";
}

function inferGoals(template: ApiTemplateRecord): MainGoal[] {
  const sectionTypes = template.pages
    .flatMap((page) => page.sections.map((section) => section.type))
    .join(" ")
    .toLowerCase();
  const raw = `${template.slug} ${template.name} ${sectionTypes}`.toLowerCase();
  const goals = new Set<MainGoal>();

  if (raw.includes("booking") || raw.includes("appointment")) {
    goals.add("booking");
  }
  if (raw.includes("product") || raw.includes("pricing") || raw.includes("offer")) {
    goals.add("sales");
  }
  if (raw.includes("location") || raw.includes("gallery") || raw.includes("menu")) {
    goals.add("store");
  }
  if (
    raw.includes("form") ||
    raw.includes("contact") ||
    raw.includes("cta") ||
    raw.includes("line")
  ) {
    goals.add("leads");
  }

  return goals.size > 0 ? [...goals] : ["leads", "store"];
}

function normalizeTemplate(apiTemplate: ApiTemplateRecord): SiteTemplate {
  const pages = [...apiTemplate.pages].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const businessType = inferBusinessType(apiTemplate);

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    description:
      apiTemplate.description?.trim() ||
      "เทมเพลตแบบ section-based พร้อมหน้าและคอนเทนต์เริ่มต้น",
    thumbnailUrl: apiTemplate.thumbnailUrl || DEFAULT_TEMPLATE_IMAGE,
    categoryLabel:
      apiTemplate.category?.name ||
      getOptionLabel(BUSINESS_OPTIONS, businessType),
    categorySlug: apiTemplate.category?.slug ?? businessType,
    businessType,
    matchedGoals: inferGoals(apiTemplate),
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      isHomePage: Boolean(page.isHomePage),
      sectionTypes: [...page.sections]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((section) => section.type),
    })),
    sectionCount: pages.reduce((total, page) => total + page.sections.length, 0),
    isOfficial: Boolean(apiTemplate.isOfficial),
  };
}

function StepRail({ step }: { step: CreateStep }) {
  const activeIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STEPS.map((item, index) => {
        const isActive = item.id === step;
        const isDone = index < activeIndex;

        return (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              isActive
                ? "border-[#FF8C00] bg-[#FF8C00]/14 text-white"
                : isDone
                  ? "border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFE27A]"
                  : "border-white/10 bg-white/[0.03] text-slate-400"
            }`}
          >
            <span className="mr-2 inline-flex size-6 items-center justify-center rounded-md bg-white/8 text-xs font-semibold">
              {isDone ? <CheckCircle2Icon className="size-4" /> : index + 1}
            </span>
            {item.label}
          </div>
        );
      })}
    </div>
  );
}

function OptionButton<T extends string>({
  option,
  selected,
  onSelect,
}: {
  option: Option<T>;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group rounded-lg border p-4 text-left transition ${
        selected
          ? "border-[#FF8C00] bg-[#FF8C00]/12 text-white"
          : "border-white/10 bg-white/[0.035] text-slate-200 hover:border-[#FF8C00]/50 hover:bg-white/[0.055]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-lg ${
            selected ? "bg-[#FF8C00] text-white" : "bg-white/8 text-[#FFB347]"
          }`}
        >
          <Icon className="size-5" />
        </span>
        {selected ? <CheckCircle2Icon className="size-5 text-[#FFD700]" /> : null}
      </div>
      <p className="font-kanit text-base font-semibold leading-relaxed">
        {option.label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">
        {option.description}
      </p>
    </button>
  );
}

export default function CreateSitePage() {
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());
  const [step, setStep] = useState<CreateStep>("profile");
  const [wizard, setWizard] = useState<WizardState>({
    businessName: "",
    siteName: "",
    businessType: "restaurant",
    goal: "leads",
    style: "modern",
    language: "thai",
    phone: "",
    lineId: "",
    logoUrl: "",
  });
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<SiteRecord | null>(null);

  const apiBaseUrl = authState.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const workspaceId = authState.workspaceId ?? "";
  const accessToken = authState.accessToken ?? "";

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const filteredTemplates = useMemo(() => {
    const preferred = templates.filter((template) => {
      return (
        template.businessType === wizard.businessType &&
        template.matchedGoals.includes(wizard.goal)
      );
    });

    if (preferred.length > 0) {
      return preferred;
    }

    const sameType = templates.filter(
      (template) => template.businessType === wizard.businessType,
    );

    return sameType.length > 0 ? sameType : templates;
  }, [templates, wizard.businessType, wizard.goal]);

  const canContinueProfile =
    wizard.businessName.trim().length >= 2 &&
    wizard.siteName.trim().length >= 2;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    async function loadTemplates() {
      setIsLoadingTemplates(true);
      setErrorMessage(null);

      try {
        const result = await fetchApiWithTokenRefresh({
          apiBaseUrl,
          path: "/templates?scope=all",
          init: { cache: "no-store" },
        });

        if (!result.response.ok) {
          throw new Error(
            resolveSectionApiErrorMessage(
              result.payload,
              "โหลดเทมเพลตไม่สำเร็จ",
            ),
          );
        }

        const payload =
          typeof result.payload === "object" &&
          result.payload &&
          "data" in result.payload &&
          Array.isArray(result.payload.data)
            ? (result.payload.data as ApiTemplateRecord[])
            : [];

        if (!cancelled) {
          const normalizedTemplates = payload.map(normalizeTemplate);
          setTemplates(normalizedTemplates);
          setSelectedTemplateId((current) => {
            if (current && normalizedTemplates.some((item) => item.id === current)) {
              return current;
            }

            return normalizedTemplates[0]?.id ?? null;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setTemplates([]);
          setSelectedTemplateId(null);
          setErrorMessage(
            error instanceof Error ? error.message : "โหลดเทมเพลตไม่สำเร็จ",
          );
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

  useEffect(() => {
    if (
      selectedTemplateId &&
      filteredTemplates.some((template) => template.id === selectedTemplateId)
    ) {
      return;
    }

    setSelectedTemplateId(filteredTemplates[0]?.id ?? null);
  }, [filteredTemplates, selectedTemplateId]);

  function updateWizard<Key extends keyof WizardState>(
    key: Key,
    value: WizardState[Key],
  ) {
    setWizard((current) => ({ ...current, [key]: value }));
    setErrorMessage(null);
    setStatusMessage(null);
  }

  async function handleCreateSite() {
    if (!accessToken) {
      setErrorMessage("กรุณาเข้าสู่ระบบก่อนสร้างเว็บไซต์");
      return;
    }

    if (!canContinueProfile) {
      setErrorMessage("กรุณากรอกชื่อธุรกิจและชื่อเว็บไซต์อย่างน้อย 2 ตัวอักษร");
      setStep("profile");
      return;
    }

    if (!selectedTemplate) {
      setErrorMessage("กรุณาเลือกเทมเพลตก่อนสร้างเว็บไซต์");
      setStep("template");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage("กำลังสร้างหน้า เพจ และ section จากเทมเพลต...");

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
            name: wizard.siteName.trim(),
            workspaceId: workspaceId || undefined,
            templateId: selectedTemplate.id,
            brandName: wizard.businessName.trim(),
            businessType: getOptionLabel(BUSINESS_OPTIONS, wizard.businessType),
            goal: getOptionLabel(GOAL_OPTIONS, wizard.goal),
            style: getOptionLabel(STYLE_OPTIONS, wizard.style),
            language: getOptionLabel(LANGUAGE_OPTIONS, wizard.language),
            phone: wizard.phone.trim() || undefined,
            lineId: wizard.lineId.trim() || undefined,
            logoUrl: wizard.logoUrl.trim() || undefined,
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

      setStatusMessage("สร้างเว็บไซต์เรียบร้อย เปิด builder ให้แก้ไขต่อได้เลย");
      setEditingSite(createdSite);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "สร้างเว็บไซต์ไม่สำเร็จ",
      );
      setStatusMessage(null);
    } finally {
      setIsCreating(false);
    }
  }

  if (editingSite) {
    return (
      <SiteEditorSimulator site={editingSite} onClose={() => setEditingSite(null)} />
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1C23] text-[#F9FAFB]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-white/10 pb-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div className="space-y-5">
            <a
              href="/sites"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeftIcon className="size-4" />
              กลับไปหน้าเว็บไซต์
            </a>

            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#FF8C00]/40 bg-[#FF8C00]/10 px-3 py-1 text-sm font-medium text-[#FFD700]">
                <LayoutTemplateIcon className="size-4" />
                Template-first site creation
              </div>
              <h1 className="font-kanit text-3xl font-bold leading-[1.25] tracking-normal sm:text-4xl lg:text-5xl">
                สร้างเว็บไซต์จากเทมเพลต พร้อมเปิด builder ทันที
              </h1>
              <p className="max-w-2xl text-base leading-[1.8] text-slate-300">
                ตอบคำถามสั้นๆ เลือกเทมเพลต แล้ว FinnWeb จะสร้าง Site, Page,
                Section และใส่ข้อมูลธุรกิจลงในคอนเทนต์เริ่มต้นให้ตาม brief
              </p>
            </div>
          </div>

          <StepRail step={step} />
        </header>

        {errorMessage ? (
          <div className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm leading-relaxed text-red-100">
            {errorMessage}
          </div>
        ) : null}
        {statusMessage ? (
          <div className="rounded-lg border border-emerald-400/35 bg-emerald-950/35 px-4 py-3 text-sm leading-relaxed text-emerald-100">
            {statusMessage}
          </div>
        ) : null}

        {!accessToken ? (
          <section className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 p-5">
            <p className="font-kanit text-lg font-semibold text-[#FFE27A]">
              ต้องเข้าสู่ระบบก่อนสร้างเว็บไซต์
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              ระบบต้องใช้ workspace และ token เพื่อดึงเทมเพลตจาก API และสร้างเว็บไซต์จริง
            </p>
          </section>
        ) : null}

        {step === "profile" ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-[#2D2F39]/72 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#FF8C00] text-white">
                    <StoreIcon className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-kanit text-xl font-semibold">
                      ข้อมูลธุรกิจ
                    </h2>
                    <p className="text-sm text-slate-400">
                      ใช้เติม placeholder ในเทมเพลต ไม่ต้องแก้ซ้ำใน builder
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      ชื่อธุรกิจ
                    </span>
                    <Input
                      value={wizard.businessName}
                      onChange={(event) =>
                        updateWizard("businessName", event.target.value)
                      }
                      className="h-11 border-white/15 bg-[#1A1C23]/80 text-white placeholder:text-slate-500"
                      placeholder="เช่น ร้านหม่าล่าพี่ต้น"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-200">
                      ชื่อเว็บไซต์
                    </span>
                    <Input
                      value={wizard.siteName}
                      onChange={(event) =>
                        updateWizard("siteName", event.target.value)
                      }
                      className="h-11 border-white/15 bg-[#1A1C23]/80 text-white placeholder:text-slate-500"
                      placeholder="เช่น mala-piton"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                      <PhoneIcon className="size-4 text-[#FFB347]" />
                      เบอร์โทร
                    </span>
                    <Input
                      value={wizard.phone}
                      onChange={(event) => updateWizard("phone", event.target.value)}
                      className="h-11 border-white/15 bg-[#1A1C23]/80 text-white placeholder:text-slate-500"
                      placeholder="080-xxx-xxxx"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                      <MessageCircleIcon className="size-4 text-[#FFB347]" />
                      LINE ID
                    </span>
                    <Input
                      value={wizard.lineId}
                      onChange={(event) => updateWizard("lineId", event.target.value)}
                      className="h-11 border-white/15 bg-[#1A1C23]/80 text-white placeholder:text-slate-500"
                      placeholder="@example"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-slate-200">
                      โลโก้ URL
                    </span>
                    <Input
                      value={wizard.logoUrl}
                      onChange={(event) => updateWizard("logoUrl", event.target.value)}
                      className="h-11 border-white/15 bg-[#1A1C23]/80 text-white placeholder:text-slate-500"
                      placeholder="https://.../logo.png"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#2D2F39]/72 p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-white/8 text-[#FFD700]">
                    <TargetIcon className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-kanit text-xl font-semibold">
                      ประเภทธุรกิจและเป้าหมาย
                    </h2>
                    <p className="text-sm text-slate-400">
                      ใช้จัดลำดับเทมเพลตที่เหมาะกับงานของคุณ
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {BUSINESS_OPTIONS.map((option) => (
                    <OptionButton
                      key={option.id}
                      option={option}
                      selected={wizard.businessType === option.id}
                      onSelect={() => updateWizard("businessType", option.id)}
                    />
                  ))}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {GOAL_OPTIONS.map((option) => (
                    <OptionButton
                      key={option.id}
                      option={option}
                      selected={wizard.goal === option.id}
                      onSelect={() => updateWizard("goal", option.id)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-lg border border-white/10 bg-[#11131A] p-5">
              <h2 className="font-kanit text-xl font-semibold">สไตล์เว็บไซต์</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                เลือกทิศทางเพื่อส่งให้ backend ใช้แทน placeholder ใน template
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <PaintbrushIcon className="size-4 text-[#FFB347]" />
                    Style
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateWizard("style", option.id)}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          wizard.style === option.id
                            ? "border-[#FF8C00] bg-[#FF8C00]/14 text-white"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <LanguagesIcon className="size-4 text-[#FFB347]" />
                    Language
                  </div>
                  <div className="grid gap-2">
                    {LANGUAGE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateWizard("language", option.id)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          wizard.language === option.id
                            ? "border-[#FF8C00] bg-[#FF8C00]/14 text-white"
                            : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!canContinueProfile}
                  onClick={() => setStep("template")}
                  className="h-11 w-full bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
                >
                  เลือกเทมเพลต
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </aside>
          </section>
        ) : null}

        {step === "template" ? (
          <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="h-fit rounded-lg border border-white/10 bg-[#11131A] p-4">
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeftIcon className="size-4" />
                แก้ข้อมูลธุรกิจ
              </button>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Business
                  </p>
                  <p className="mt-1 font-kanit text-lg font-semibold">
                    {wizard.businessName || "ยังไม่ได้กรอกชื่อธุรกิจ"}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-slate-300">
                  <span>{getOptionLabel(BUSINESS_OPTIONS, wizard.businessType)}</span>
                  <span>{getOptionLabel(GOAL_OPTIONS, wizard.goal)}</span>
                  <span>
                    {getOptionLabel(STYLE_OPTIONS, wizard.style)} ·{" "}
                    {getOptionLabel(LANGUAGE_OPTIONS, wizard.language)}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <SearchIcon className="size-4 text-[#FFD700]" />
                  Template matching
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  แสดงเทมเพลตที่ตรงกับประเภทธุรกิจและเป้าหมายก่อน ถ้าไม่มีจะแสดงตัวเลือกที่ใกล้เคียง
                </p>
              </div>
            </aside>

            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-kanit text-2xl font-semibold">
                    เลือกเทมเพลตเริ่มต้น
                  </h2>
                  <p className="text-sm text-slate-400">
                    เทมเพลตมาจาก API และสร้างเป็น section JSON ใน backend
                  </p>
                </div>
                <div className="inline-flex w-fit rounded-lg border border-white/10 bg-white/[0.04] p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === "desktop" ? "default" : "ghost"}
                    onClick={() => setPreviewMode("desktop")}
                    className={previewMode === "desktop" ? "bg-[#FF8C00]" : ""}
                  >
                    <MonitorIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === "mobile" ? "default" : "ghost"}
                    onClick={() => setPreviewMode("mobile")}
                    className={previewMode === "mobile" ? "bg-[#FF8C00]" : ""}
                  >
                    <PhoneIcon className="size-4" />
                  </Button>
                </div>
              </div>

              {isLoadingTemplates ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-80 animate-pulse rounded-lg border border-white/10 bg-white/[0.035]"
                    />
                  ))}
                </div>
              ) : null}

              {!isLoadingTemplates && templates.length === 0 ? (
                <div className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 p-5">
                  <p className="font-kanit text-lg font-semibold text-[#FFE27A]">
                    ยังไม่มีเทมเพลตให้เลือก
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    กรุณา seed official templates หรือเช็ก API `/templates?scope=all`
                    ก่อนสร้างเว็บไซต์แบบ template-first
                  </p>
                </div>
              ) : null}

              {!isLoadingTemplates && filteredTemplates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.map((template) => {
                    const selected = selectedTemplateId === template.id;
                    const homePage =
                      template.pages.find((page) => page.isHomePage) ??
                      template.pages[0];

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`overflow-hidden rounded-lg border text-left transition ${
                          selected
                            ? "border-[#FF8C00] bg-[#FF8C00]/10"
                            : "border-white/10 bg-[#2D2F39]/70 hover:border-[#FF8C00]/45"
                        }`}
                      >
                        <div
                          className={`relative overflow-hidden ${
                            previewMode === "mobile"
                              ? "mx-auto mt-4 aspect-[9/14] w-[54%] rounded-lg"
                              : "aspect-[16/10]"
                          } bg-[#11131A]`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={template.thumbnailUrl ?? DEFAULT_TEMPLATE_IMAGE}
                            alt={template.name}
                            className="h-full w-full object-cover opacity-90 transition duration-500 hover:scale-105"
                          />
                          <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[#11131A]/82 p-2 backdrop-blur">
                            <p className="line-clamp-1 text-xs font-semibold text-white">
                              {homePage?.title ?? "Home page"}
                            </p>
                            <p className="text-[11px] text-slate-300">
                              {template.sectionCount} sections
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-kanit text-lg font-semibold leading-snug">
                                {template.name}
                              </p>
                              <p className="mt-1 text-xs text-[#FFD700]">
                                {template.categoryLabel}
                              </p>
                            </div>
                            {selected ? (
                              <CheckCircle2Icon className="size-5 shrink-0 text-[#FFD700]" />
                            ) : null}
                          </div>

                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-400">
                            {template.description}
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {(homePage?.sectionTypes ?? [])
                              .slice(0, 6)
                              .map((sectionType) => (
                                <span
                                  key={`${template.id}-${sectionType}`}
                                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300"
                                >
                                  {sectionType}
                                </span>
                              ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("profile")}
                  className="justify-start text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeftIcon className="size-4" />
                  ย้อนกลับ
                </Button>
                <Button
                  type="button"
                  disabled={!selectedTemplate}
                  onClick={() => setStep("review")}
                  className="h-11 bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
                >
                  ตรวจสอบก่อนสร้าง
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {step === "review" ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-lg border border-white/10 bg-[#2D2F39]/72 p-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#FF8C00] text-white">
                  <EyeIcon className="size-5" />
                </span>
                <div>
                  <h2 className="font-kanit text-2xl font-semibold">
                    ตรวจสอบ flow ก่อนสร้างเว็บ
                  </h2>
                  <p className="text-sm text-slate-400">
                    หลังยืนยัน ระบบจะเรียก `POST /api/sites` พร้อม `templateId`
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-[#11131A] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Business answers
                  </p>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-500">ชื่อธุรกิจ</dt>
                      <dd className="font-medium text-white">{wizard.businessName}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ประเภท</dt>
                      <dd className="text-slate-200">
                        {getOptionLabel(BUSINESS_OPTIONS, wizard.businessType)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">เป้าหมาย</dt>
                      <dd className="text-slate-200">
                        {getOptionLabel(GOAL_OPTIONS, wizard.goal)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">ติดต่อ</dt>
                      <dd className="text-slate-200">
                        {[wizard.phone, wizard.lineId].filter(Boolean).join(" · ") ||
                          "ยังไม่ระบุ"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#11131A] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Template install
                  </p>
                  {selectedTemplate ? (
                    <div className="mt-3 space-y-3">
                      <p className="font-kanit text-xl font-semibold">
                        {selectedTemplate.name}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-400">
                        {selectedTemplate.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
                          {selectedTemplate.pages.length} หน้า
                        </span>
                        <span className="rounded-lg bg-white/[0.04] px-3 py-2 text-slate-300">
                          {selectedTemplate.sectionCount} sections
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">
                      ยังไม่ได้เลือกเทมเพลต
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-[#FFD700]/25 bg-[#FFD700]/8 p-4">
                <p className="font-kanit text-lg font-semibold text-[#FFE27A]">
                  สิ่งที่จะเกิดขึ้นหลังสร้าง
                </p>
                <div className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-300 md:grid-cols-2">
                  <span>1. สร้าง Site ใน workspace ปัจจุบัน</span>
                  <span>2. ติดตั้ง Page และ Section จากเทมเพลต</span>
                  <span>3. แทนค่า placeholder ด้วยข้อมูลธุรกิจ</span>
                  <span>4. เปิด builder เพื่อแก้ draft และ publish ต่อ</span>
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-lg border border-white/10 bg-[#11131A] p-5">
              <h2 className="font-kanit text-xl font-semibold">พร้อมสร้าง</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                MVP นี้ไม่เปิด raw JSON ให้ผู้ใช้ทั่วไป และไม่สร้าง section ฝั่ง client
              </p>

              <div className="mt-5 space-y-3">
                <Button
                  type="button"
                  disabled={isCreating || !selectedTemplate}
                  onClick={() => void handleCreateSite()}
                  className="h-12 w-full bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
                >
                  {isCreating ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      กำลังสร้างเว็บไซต์
                    </>
                  ) : (
                    <>
                      สร้างและเปิด builder
                      <ArrowRightIcon className="size-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("template")}
                  className="w-full text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  เปลี่ยนเทมเพลต
                </Button>
              </div>
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
}
