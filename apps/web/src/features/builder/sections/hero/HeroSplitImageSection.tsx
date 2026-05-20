type HeroSplitImageSectionProps = {
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

export function HeroSplitImageSection({ props }: HeroSplitImageSectionProps) {
  const eyebrow = readString(props, "eyebrow", "พร้อมเปิดรับลูกค้า");
  const headline = readString(
    props,
    "headline",
    readString(props, "title", "สร้างเว็บไซต์ที่พร้อมรับลูกค้าในไม่กี่นาที"),
  );
  const subheadline = readString(
    props,
    "subheadline",
    readString(
      props,
      "subtitle",
      "นี่คือ mock canvas สำหรับทดสอบโครง builder ก่อนต่อข้อมูลจริงจาก API",
    ),
  );
  const primaryButtonText = readString(
    props,
    "primaryButtonText",
    readString(props, "buttonText", "ติดต่อผ่าน LINE"),
  );
  const accentColor = readString(
    props,
    "accentColor",
    "var(--fw-color-primary, #FF8C00)",
  );
  const imageUrl = readString(props, "imageUrl", "");
  const imagePosition = readString(props, "imagePosition", "right");
  const showImage = readBoolean(props, "showImage", true);
  const imageFirst = imagePosition === "left";

  return (
    <div className="grid gap-8 px-6 py-12 sm:px-10 sm:py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)] md:items-center">
      <div className={imageFirst ? "md:order-2" : undefined}>
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-3 font-kanit text-4xl font-semibold leading-tight text-[var(--fw-text,#F9FAFB)]">
          {headline}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
          {subheadline}
        </p>
        <a
          href={readString(props, "primaryButtonHref", readString(props, "href", "#contact"))}
          className="mt-6 inline-flex rounded-[var(--fw-radius-button,8px)] px-4 py-2 text-sm font-semibold text-[var(--fw-text,#F9FAFB)] shadow-[var(--fw-glow-primary,none)]"
          style={{ backgroundColor: accentColor }}
        >
          {primaryButtonText}
        </a>
      </div>
      {showImage ? (
        <div className={imageFirst ? "md:order-1" : undefined}>
          <div className="min-h-56 overflow-hidden rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)] p-5 shadow-[var(--fw-depth-card,none)]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full min-h-48 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="h-full min-h-48 rounded-lg border border-[var(--fw-border,#9CA3AF38)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--fw-color-primary,#FF8C00)_26%,transparent),color-mix(in_srgb,var(--fw-color-primary-light,#FFD700)_16%,transparent))]" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
