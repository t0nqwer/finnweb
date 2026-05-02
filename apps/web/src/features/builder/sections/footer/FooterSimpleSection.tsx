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
    "สร้างเว็บไซต์เร็ว พร้อมรับลูกค้าใหม่",
  );
  const backgroundColor = readString(props, "backgroundColor", "#11131A");
  const textColor = readString(props, "textColor", "#CBD5E1");

  return (
    <div
      className="px-6 py-6 text-sm sm:px-10"
      style={{ backgroundColor, color: textColor }}
    >
      <p className="font-kanit text-base font-semibold">{brandName}</p>
      <p className="mt-1">{tagline}</p>
    </div>
  );
}
