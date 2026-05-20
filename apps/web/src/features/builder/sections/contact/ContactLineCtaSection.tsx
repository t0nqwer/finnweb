import { MessageCircleIcon } from "lucide-react";

type ContactLineCtaSectionProps = {
  props: Record<string, unknown>;
};

function readString(
  props: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readBoolean(
  props: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const value = props[key];
  return typeof value === "boolean" ? value : fallback;
}

export function ContactLineCtaSection({ props }: ContactLineCtaSectionProps) {
  const title = readString(props, "title", "พร้อมคุยกับลูกค้าทาง LINE");
  const description = readString(
    props,
    "description",
    readString(
      props,
      "subtitle",
      "ให้ลูกค้าทักมาถามราคา นัดหมาย หรือขอคำปรึกษาได้ทันทีจากหน้าเว็บ",
    ),
  );
  const buttonText = readString(
    props,
    "buttonText",
    readString(props, "submitLabel", "ทัก LINE ตอนนี้"),
  );
  const backgroundColor = readString(
    props,
    "backgroundColor",
    "var(--fw-surface, #2D2F39)",
  );
  const href = readString(
    props,
    "href",
    readString(props, "lineUrl", "https://line.me/R/ti/p/@finnweb"),
  );
  const showIcon = readBoolean(props, "showIcon", true);

  return (
    <div id="contact" className="px-6 py-10 sm:px-10">
      <div
        className="rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] p-5 text-[var(--fw-text,#F9FAFB)] shadow-[var(--fw-depth-card,none)]"
        style={{ backgroundColor }}
      >
        {showIcon ? (
          <MessageCircleIcon className="size-6 text-[var(--fw-color-primary-light,#FFD700)]" />
        ) : null}
        <p className="mt-3 font-kanit text-2xl font-semibold">{title}</p>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
          {description}
        </p>
        <a
          href={href}
          className="mt-5 inline-flex rounded-[var(--fw-radius-button,8px)] bg-[var(--fw-color-primary,#FF8C00)] px-4 py-2 text-sm font-semibold text-[var(--fw-text,#F9FAFB)] shadow-[var(--fw-glow-primary,none)]"
        >
          {buttonText}
        </a>
      </div>
    </div>
  );
}
