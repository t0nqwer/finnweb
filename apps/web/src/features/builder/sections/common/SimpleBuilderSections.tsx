import type { SectionComponentProps } from "../../registry/section-registry";

function textProp(
  props: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function listProp(
  props: Record<string, unknown>,
  key: string,
  fallback: string[],
) {
  const value = props[key];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  const stringValue = textProp(props, key, "");
  if (stringValue) {
    return stringValue
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
}

function sectionTitle(
  props: Record<string, unknown>,
  fallbackTitle: string,
  fallbackSubtitle: string,
) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-kanit text-3xl font-semibold text-[#1A1C23]">
        {textProp(props, "title", fallbackTitle)}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        {textProp(props, "subtitle", fallbackSubtitle)}
      </p>
    </div>
  );
}

export function NavbarSimpleSection({ props }: SectionComponentProps) {
  const menuItems = listProp(props, "menuItems", ["Home", "Services", "Contact"]);

  return (
    <nav className="flex items-center justify-between gap-4 px-6 py-4 sm:px-10">
      <span className="font-kanit text-xl font-semibold text-[#1A1C23]">
        {textProp(props, "brandName", "FinnWeb")}
      </span>
      <div className="hidden items-center gap-5 text-sm text-slate-600 sm:flex">
        {menuItems.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <span className="rounded-lg bg-[#FF8C00] px-3 py-2 text-sm font-semibold text-white">
        {textProp(props, "buttonText", "Contact")}
      </span>
    </nav>
  );
}

export function RichTextBasicSection({ props }: SectionComponentProps) {
  return (
    <section className="px-6 py-12 sm:px-10">
      <article className="max-w-3xl">
        <h2 className="font-kanit text-3xl font-semibold text-[#1A1C23]">
          {textProp(props, "title", "About this business")}
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          {textProp(
            props,
            "body",
            "Use this section to explain your services, story, or important details for customers.",
          )}
        </p>
      </article>
    </section>
  );
}

export function ImageSingleSection({ props }: SectionComponentProps) {
  const imageUrl = textProp(props, "imageUrl", "");

  return (
    <section className="px-6 py-12 sm:px-10">
      {sectionTitle(props, "Show your work", "Add one strong image for this page.")}
      <div className="mt-6 aspect-[16/9] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={textProp(props, "altText", "Section image")}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Image preview
          </div>
        )}
      </div>
    </section>
  );
}

export function ContactFormPreviewSection({ props }: SectionComponentProps) {
  return (
    <section className="px-6 py-12 sm:px-10">
      <div className="grid gap-6 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:grid-cols-[1fr_280px]">
        <div>
          {sectionTitle(
            props,
            "Let customers contact you",
            "Collect name, phone, email, and a short message.",
          )}
        </div>
        <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
          <div className="h-9 rounded-md border border-slate-200 bg-slate-50" />
          <div className="h-9 rounded-md border border-slate-200 bg-slate-50" />
          <div className="h-20 rounded-md border border-slate-200 bg-slate-50" />
          <div className="h-9 rounded-md bg-[#FF8C00]" />
        </div>
      </div>
    </section>
  );
}

export function PricingCardsSection({ props }: SectionComponentProps) {
  const plans = listProp(props, "plans", ["Basic", "Business", "Pro"]);

  return (
    <section className="px-6 py-12 sm:px-10">
      {sectionTitle(props, "Packages", "Show simple choices so customers can decide quickly.")}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {plans.slice(0, 3).map((plan, index) => (
          <div key={plan} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="font-kanit text-xl font-semibold text-[#1A1C23]">
              {plan}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {index === 1 ? "Recommended option" : "Good fit package"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FaqAccordionSection({ props }: SectionComponentProps) {
  const questions = listProp(props, "questions", [
    "How long does it take?",
    "How do customers contact us?",
    "Can we update content later?",
  ]);

  return (
    <section className="px-6 py-12 sm:px-10">
      {sectionTitle(props, "FAQ", "Answer common questions before customers ask.")}
      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {questions.slice(0, 5).map((question) => (
          <div key={question} className="px-5 py-4">
            <p className="font-medium text-[#1A1C23]">{question}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TestimonialsGridSection({ props }: SectionComponentProps) {
  const quotes = listProp(props, "quotes", [
    "Easy to understand and fast to launch.",
    "Customers can contact us more easily.",
    "The page looks professional on mobile.",
  ]);

  return (
    <section className="px-6 py-12 sm:px-10">
      {sectionTitle(props, "Customer voices", "Build trust with short testimonials.")}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {quotes.slice(0, 3).map((quote) => (
          <blockquote key={quote} className="rounded-lg bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            {quote}
          </blockquote>
        ))}
      </div>
    </section>
  );
}
