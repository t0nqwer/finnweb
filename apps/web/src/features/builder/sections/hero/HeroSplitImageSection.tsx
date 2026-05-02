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
  const eyebrow = readString(props, "eyebrow", "FinnWeb builder");
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
  const accentColor = readString(props, "accentColor", "#FF8C00");
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
        <h2 className="mt-3 font-kanit text-4xl font-semibold leading-tight text-[#1A1C23]">
          {headline}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          {subheadline}
        </p>
        <span
          className="mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {primaryButtonText}
        </span>
      </div>
      {showImage ? (
        <div className={imageFirst ? "md:order-1" : undefined}>
          <div className="min-h-56 overflow-hidden rounded-lg border border-slate-200 bg-[linear-gradient(135deg,#FFF7E8,#FFD70033)] p-5">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full min-h-48 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="h-full min-h-48 rounded-lg border border-white/70 bg-white/60" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
