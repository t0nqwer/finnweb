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
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (item && typeof item === "object" && "label" in item) {
          const label = (item as { label?: unknown }).label;
          return typeof label === "string" ? label.trim() : "";
        }
        return "";
      })
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
      <h2 className="font-kanit text-3xl font-semibold text-[var(--fw-text,#F9FAFB)]">
        {textProp(props, "title", fallbackTitle)}
      </h2>
      <p className="mt-2 text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
        {textProp(props, "subtitle", fallbackSubtitle)}
      </p>
    </div>
  );
}

export function NavbarSimpleSection({ props }: SectionComponentProps) {
  const menuItems = listProp(props, "menuItems", ["Home", "Services", "Contact"]);

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-bg,#1A1C23)] px-6 py-4 sm:px-10">
      <span className="font-kanit text-xl font-semibold text-[var(--fw-text,#F9FAFB)]">
        {textProp(props, "brandName", "FinnWeb")}
      </span>
      <div className="hidden items-center gap-5 text-sm text-[var(--fw-muted,#9CA3AF)] sm:flex">
        {menuItems.map((item) => (
          <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}>
            {item}
          </a>
        ))}
      </div>
      <a
        href={textProp(props, "buttonHref", "#contact")}
        className="rounded-[var(--fw-radius-button,8px)] bg-[var(--fw-color-primary,#FF8C00)] px-3 py-2 text-sm font-semibold text-[var(--fw-text,#F9FAFB)]"
      >
        {textProp(props, "buttonText", "Contact")}
      </a>
    </nav>
  );
}

export function RichTextBasicSection({ props }: SectionComponentProps) {
  return (
    <section className="px-6 py-12 sm:px-10">
      <article className="max-w-3xl">
        <h2 className="font-kanit text-3xl font-semibold text-[var(--fw-text,#F9FAFB)]">
          {textProp(props, "title", "About this business")}
        </h2>
        <p className="mt-4 text-base leading-8 text-[var(--fw-muted,#9CA3AF)]">
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
      <div className="mt-6 aspect-[16/9] overflow-hidden rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={textProp(props, "altText", "Section image")}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--fw-muted,#9CA3AF)]">
            พื้นที่รูปภาพ
          </div>
        )}
      </div>
    </section>
  );
}

export function ContactFormPreviewSection({ props }: SectionComponentProps) {
  return (
    <section className="px-6 py-12 sm:px-10">
      <div className="grid gap-6 rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)] p-6 sm:grid-cols-[1fr_280px]">
        <div>
          {sectionTitle(
            props,
            "Let customers contact you",
            "Collect name, phone, email, and a short message.",
          )}
        </div>
        <div className="space-y-3 rounded-lg bg-[var(--fw-bg,#1A1C23)] p-4 shadow-sm">
          <div className="h-9 rounded-md border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-panel,#252833)]" />
          <div className="h-9 rounded-md border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-panel,#252833)]" />
          <div className="h-20 rounded-md border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-panel,#252833)]" />
          <div className="h-9 rounded-md bg-[var(--fw-color-primary,#FF8C00)]" />
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
          <div key={plan} className="rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)] p-5">
            <p className="font-kanit text-xl font-semibold text-[var(--fw-text,#F9FAFB)]">
              {plan}
            </p>
            <p className="mt-2 text-sm text-[var(--fw-muted,#9CA3AF)]">
              {index === 1 ? "แพ็กเกจแนะนำ" : "ตัวเลือกที่เหมาะกับธุรกิจ"}
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
      <div className="mt-6 divide-y divide-[var(--fw-border,#9CA3AF38)] rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)]">
        {questions.slice(0, 5).map((question) => (
          <div key={question} className="px-5 py-4">
            <p className="font-medium text-[var(--fw-text,#F9FAFB)]">{question}</p>
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
          <blockquote key={quote} className="rounded-[var(--fw-radius-card,10px)] bg-[var(--fw-surface,#2D2F39)] p-5 text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
            {quote}
          </blockquote>
        ))}
      </div>
    </section>
  );
}
