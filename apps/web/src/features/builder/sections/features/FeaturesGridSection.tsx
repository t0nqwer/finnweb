import { StarIcon } from "lucide-react";

type FeaturesGridSectionProps = {
  props: Record<string, unknown>;
};

function readItems(props: Record<string, unknown>) {
  const editableItems = [
    props.featureOne,
    props.featureTwo,
    props.featureThree,
  ].filter((item): item is string => typeof item === "string" && Boolean(item.trim()));

  if (editableItems.length > 0) {
    return editableItems;
  }

  const raw = props.items;
  if (!Array.isArray(raw)) {
    return ["เร็ว", "แก้ง่าย", "พร้อม lead"];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "title" in item) {
        const title = (item as { title?: unknown }).title;
        return typeof title === "string" ? title : null;
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
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
    readString(props, "heading", "จุดเด่นที่ช่วยให้ธุรกิจโตเร็วขึ้น"),
  );
  const accentColor = readString(props, "accentColor", "#FF8C00");

  return (
    <div className="px-6 py-8 sm:px-10">
      <h3 className="mb-4 font-kanit text-2xl font-semibold text-[#1A1C23]">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <StarIcon className="size-5" style={{ color: accentColor }} />
            <p className="mt-3 font-kanit text-lg font-semibold">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
