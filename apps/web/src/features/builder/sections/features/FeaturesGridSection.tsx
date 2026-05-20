import { StarIcon } from "lucide-react";

type FeaturesGridSectionProps = {
  props: Record<string, unknown>;
};

type FeatureItem = {
  title: string;
  description?: string;
};

function readItems(props: Record<string, unknown>): FeatureItem[] {
  const editableItems = [
    props.featureOne,
    props.featureTwo,
    props.featureThree,
  ].filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );

  if (editableItems.length > 0) {
    return editableItems.map((title) => ({ title }));
  }

  const raw = props.items;
  if (!Array.isArray(raw)) {
    return [
      {
        title: "โหลดเร็วบนมือถือ",
        description: "หน้าเว็บพร้อมเปิดทันที ลูกค้าไม่ต้องรอนานก่อนตัดสินใจ",
      },
      {
        title: "แก้ไขง่าย",
        description: "เปลี่ยนข้อความ รูป และปุ่มติดต่อได้จากข้อมูลที่จัดโครงไว้",
      },
      {
        title: "พร้อมรับ lead ผ่าน LINE",
        description: "ทุกจุดสำคัญพาลูกค้าไปทัก LINE หรือส่งข้อมูลติดต่อได้ชัดเจน",
      },
    ];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { title: item };
      }
      if (item && typeof item === "object" && "title" in item) {
        const record = item as {
          title?: unknown;
          description?: unknown;
          body?: unknown;
        };
        return typeof record.title === "string"
          ? {
              title: record.title,
              description:
                typeof record.description === "string"
                  ? record.description
                  : typeof record.body === "string"
                    ? record.body
                  : undefined,
            }
          : null;
      }
      return null;
    })
    .filter((item): item is FeatureItem => Boolean(item?.title));
}

function readString(
  props: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = props[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function FeaturesGridSection({ props }: FeaturesGridSectionProps) {
  const items = readItems(props);
  const title = readString(
    props,
    "title",
    readString(props, "heading", "จุดเด่นที่ช่วยให้ลูกค้าตัดสินใจเร็วขึ้น"),
  );
  const accentColor = readString(
    props,
    "accentColor",
    "var(--fw-color-primary, #FF8C00)",
  );

  return (
    <div className="px-6 py-10 sm:px-10">
      <h3 className="mb-5 font-kanit text-2xl font-semibold text-[var(--fw-text,#F9FAFB)]">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)] p-4 text-[var(--fw-text,#F9FAFB)]"
          >
            <StarIcon className="size-5" style={{ color: accentColor }} />
            <p className="mt-3 font-kanit text-lg font-semibold">
              {item.title}
            </p>
            {item.description ? (
              <p className="mt-2 text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
                {item.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
