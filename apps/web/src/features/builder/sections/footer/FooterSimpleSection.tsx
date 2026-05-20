type FooterSimpleSectionProps = {
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

export function FooterSimpleSection({ props }: FooterSimpleSectionProps) {
  const brandName = readString(props, "brandName", "FinnWeb");
  const tagline = readString(
    props,
    "tagline",
    "เว็บไซต์พร้อมรับลูกค้าใหม่และพา lead เข้าช่องทางติดต่อของธุรกิจ",
  );
  const backgroundColor = readString(
    props,
    "backgroundColor",
    "var(--fw-bg, #1A1C23)",
  );
  const textColor = readString(props, "textColor", "var(--fw-muted, #9CA3AF)");

  return (
    <div
      className="border-t border-[var(--fw-border,#9CA3AF38)] px-6 py-6 text-sm sm:px-10"
      style={{ backgroundColor, color: textColor }}
    >
      <p className="font-kanit text-base font-semibold text-[var(--fw-text,#F9FAFB)]">
        {brandName}
      </p>
      <p className="mt-1 max-w-2xl leading-7">{tagline}</p>
    </div>
  );
}
