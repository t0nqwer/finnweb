import {
  ArrowRightIcon,
  LanguagesIcon,
  MessageCircleIcon,
  PaintbrushIcon,
  PhoneIcon,
  StoreIcon,
  TargetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BusinessType,
  MainGoal,
  Option,
  SiteLanguage,
  SiteStyle,
  WizardState,
} from "../types/create-site.types";
import type { CreateSiteValidationErrors } from "../lib/validate-create-site";

type BusinessProfileStepProps = {
  wizard: WizardState;
  businessOptions: Array<Option<BusinessType>>;
  goalOptions: Array<Option<MainGoal>>;
  styleOptions: Array<{ id: SiteStyle; label: string }>;
  languageOptions: Array<{ id: SiteLanguage; label: string }>;
  canContinueProfile: boolean;
  errors: CreateSiteValidationErrors;
  updateWizard: <Key extends keyof WizardState>(
    key: Key,
    value: WizardState[Key],
  ) => void;
  onContinue: () => void;
};

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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm leading-relaxed text-red-200">
      {message}
    </p>
  );
}

export function BusinessProfileStep({
  wizard,
  businessOptions,
  goalOptions,
  styleOptions,
  languageOptions,
  canContinueProfile,
  errors,
  updateWizard,
  onContinue,
}: BusinessProfileStepProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="rounded-lg border border-white/10 bg-[#2D2F39]/72 p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-[#FF8C00] text-white">
              <StoreIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-kanit text-xl font-semibold">ข้อมูลธุรกิจ</h2>
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
                aria-invalid={Boolean(errors.businessName)}
                aria-describedby={
                  errors.businessName ? "businessName-error" : undefined
                }
                className={`h-11 bg-[#1A1C23]/80 text-white placeholder:text-slate-500 ${
                  errors.businessName
                    ? "border-red-300/70 focus-visible:ring-red-300"
                    : "border-white/15"
                }`}
                placeholder="เช่น ร้านหม่าล่าพี่ต้น"
              />
              <FieldError
                id="businessName-error"
                message={errors.businessName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">
                ชื่อเว็บไซต์
              </span>
              <Input
                value={wizard.siteName}
                onChange={(event) => updateWizard("siteName", event.target.value)}
                aria-invalid={Boolean(errors.siteName)}
                aria-describedby={errors.siteName ? "siteName-error" : undefined}
                className={`h-11 bg-[#1A1C23]/80 text-white placeholder:text-slate-500 ${
                  errors.siteName
                    ? "border-red-300/70 focus-visible:ring-red-300"
                    : "border-white/15"
                }`}
                placeholder="เช่น mala-piton"
              />
              <FieldError id="siteName-error" message={errors.siteName} />
            </label>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                <PhoneIcon className="size-4 text-[#FFB347]" />
                เบอร์โทร
              </span>
              <Input
                value={wizard.phone}
                onChange={(event) => updateWizard("phone", event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                className={`h-11 bg-[#1A1C23]/80 text-white placeholder:text-slate-500 ${
                  errors.phone
                    ? "border-red-300/70 focus-visible:ring-red-300"
                    : "border-white/15"
                }`}
                placeholder="080-xxx-xxxx"
              />
              <FieldError id="phone-error" message={errors.phone} />
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
              <p className="text-xs leading-relaxed text-slate-500">
                ถ้ากรอกโดยไม่มี @ ระบบจะเติมให้ก่อนสร้างเว็บไซต์
              </p>
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-200">
                โลโก้ URL
              </span>
              <Input
                value={wizard.logoUrl}
                onChange={(event) => updateWizard("logoUrl", event.target.value)}
                aria-invalid={Boolean(errors.logoUrl)}
                aria-describedby={errors.logoUrl ? "logoUrl-error" : undefined}
                className={`h-11 bg-[#1A1C23]/80 text-white placeholder:text-slate-500 ${
                  errors.logoUrl
                    ? "border-red-300/70 focus-visible:ring-red-300"
                    : "border-white/15"
                }`}
                placeholder="https://.../logo.png"
              />
              <FieldError id="logoUrl-error" message={errors.logoUrl} />
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
            {businessOptions.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                selected={wizard.businessType === option.id}
                onSelect={() => updateWizard("businessType", option.id)}
              />
            ))}
          </div>
          <FieldError id="businessType-error" message={errors.businessType} />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {goalOptions.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                selected={wizard.goal === option.id}
                onSelect={() => updateWizard("goal", option.id)}
              />
            ))}
          </div>
          <FieldError id="goal-error" message={errors.goal} />
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
              {styleOptions.map((option) => (
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
            <FieldError id="style-error" message={errors.style} />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-200">
              <LanguagesIcon className="size-4 text-[#FFB347]" />
              Language
            </div>
            <div className="grid gap-2">
              {languageOptions.map((option) => (
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
            <FieldError id="language-error" message={errors.language} />
          </div>

          <Button
            type="button"
            disabled={!canContinueProfile}
            onClick={onContinue}
            className="h-11 w-full bg-[#FF8C00] font-semibold text-white hover:bg-[#FF9F1A]"
          >
            เลือกเทมเพลต
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </aside>
    </section>
  );
}
