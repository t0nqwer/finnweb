"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  FlameIcon,
  LayoutTemplateIcon,
  MessageCircleIcon,
  PaintbrushIcon,
  SparklesIcon,
  StoreIcon,
  TargetIcon,
} from "lucide-react";
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
import { normalizeTemplate } from "../lib/normalize-template";
import { getOptionLabel, matchTemplates } from "../lib/template-matching";
import {
  hasCreateSiteValidationErrors,
  normalizeLineId,
  validateCreateSiteWizard,
} from "../lib/validate-create-site";
import type {
  ApiTemplateRecord,
  BusinessType,
  CreateStep,
  MainGoal,
  Option,
  PreviewMode,
  SiteLanguage,
  SiteRecord,
  SiteStyle,
  SiteTemplate,
  WizardState,
} from "../types/create-site.types";
import { BusinessProfileStep } from "./BusinessProfileStep";
import { ReviewCreateStep } from "./ReviewCreateStep";
import { StepRail } from "./StepRail";
import { TemplateSelectStep } from "./TemplateSelectStep";

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

const INITIAL_WIZARD: WizardState = {
  businessName: "",
  siteName: "",
  businessType: "restaurant",
  goal: "leads",
  style: "modern",
  language: "thai",
  phone: "",
  lineId: "",
  logoUrl: "",
};

export function CreateSiteWizard() {
  const router = useRouter();
  const [authState] = useState<StoredAuthState>(() => readStoredAuthState());
  const [step, setStep] = useState<CreateStep>("profile");
  const [wizard, setWizard] = useState<WizardState>(INITIAL_WIZARD);
  const [templates, setTemplates] = useState<SiteTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiBaseUrl = authState.apiBaseUrl ?? DEFAULT_API_BASE_URL;
  const workspaceId = authState.workspaceId ?? "";
  const accessToken = authState.accessToken ?? "";

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const filteredTemplates = useMemo(
    () => matchTemplates(templates, wizard),
    [templates, wizard],
  );

  const validationErrors = useMemo(
    () => validateCreateSiteWizard(wizard),
    [wizard],
  );
  const canContinueProfile = !hasCreateSiteValidationErrors(validationErrors);
  const canReview = canContinueProfile && Boolean(selectedTemplate);
  const canCreate = canReview && Boolean(accessToken) && !isCreating;

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
            if (
              current &&
              normalizedTemplates.some((item) => item.id === current)
            ) {
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
      setErrorMessage("กรุณาตรวจสอบข้อมูลธุรกิจให้ครบก่อนสร้างเว็บไซต์");
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
      const normalizedLineId = normalizeLineId(wizard.lineId);
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
            businessType: getOptionLabel(
              BUSINESS_OPTIONS,
              wizard.businessType,
            ),
            goal: getOptionLabel(GOAL_OPTIONS, wizard.goal),
            style: getOptionLabel(STYLE_OPTIONS, wizard.style),
            language: getOptionLabel(LANGUAGE_OPTIONS, wizard.language),
            phone: wizard.phone.trim() || undefined,
            lineId: normalizedLineId || undefined,
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

      setStatusMessage("สร้างเว็บไซต์เรียบร้อย กำลังเปิด builder...");
      router.push(`/sites/${createdSite.id}/builder`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "สร้างเว็บไซต์ไม่สำเร็จ",
      );
      setStatusMessage(null);
    } finally {
      setIsCreating(false);
    }
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
          <BusinessProfileStep
            wizard={wizard}
            businessOptions={BUSINESS_OPTIONS}
            goalOptions={GOAL_OPTIONS}
            styleOptions={STYLE_OPTIONS}
            languageOptions={LANGUAGE_OPTIONS}
            canContinueProfile={canContinueProfile}
            errors={validationErrors}
            updateWizard={updateWizard}
            onContinue={() => {
              if (canContinueProfile) {
                setStep("template");
              }
            }}
          />
        ) : null}

        {step === "template" ? (
          <TemplateSelectStep
            wizard={wizard}
            templates={templates}
            filteredTemplates={filteredTemplates}
            selectedTemplate={selectedTemplate}
            selectedTemplateId={selectedTemplateId}
            previewMode={previewMode}
            isLoadingTemplates={isLoadingTemplates}
            businessOptions={BUSINESS_OPTIONS}
            goalOptions={GOAL_OPTIONS}
            styleOptions={STYLE_OPTIONS}
            languageOptions={LANGUAGE_OPTIONS}
            onBack={() => setStep("profile")}
            canReview={canReview}
            onReview={() => {
              if (canReview) {
                setStep("review");
              }
            }}
            onSelectTemplate={setSelectedTemplateId}
            onPreviewModeChange={setPreviewMode}
          />
        ) : null}

        {step === "review" ? (
          <ReviewCreateStep
            wizard={wizard}
            selectedTemplate={selectedTemplate}
            isCreating={isCreating}
            canCreate={canCreate}
            normalizedLineId={normalizeLineId(wizard.lineId)}
            businessOptions={BUSINESS_OPTIONS}
            goalOptions={GOAL_OPTIONS}
            onCreate={() => void handleCreateSite()}
            onChangeTemplate={() => setStep("template")}
          />
        ) : null}
      </main>
    </div>
  );
}
