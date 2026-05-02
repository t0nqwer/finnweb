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
  const title = readString(props, "title", "พร้อมคุยกับลูกค้าแล้ว");
  const description = readString(
    props,
    "description",
    readString(
      props,
      "subtitle",
      "พื้นที่นี้จะกลายเป็นฟอร์มติดต่อหรือ LINE CTA ใน builder จริง",
    ),
  );
  const buttonText = readString(
    props,
    "buttonText",
    readString(props, "submitLabel", "ทัก LINE"),
  );
  const backgroundColor = readString(props, "backgroundColor", "#1A1C23");
  const showIcon = readBoolean(props, "showIcon", true);

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="rounded-lg p-5 text-white" style={{ backgroundColor }}>
        {showIcon ? (
          <MessageCircleIcon className="size-6 text-[#FFD700]" />
        ) : null}
        <p className="mt-3 font-kanit text-2xl font-semibold">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        <span className="mt-5 inline-flex rounded-lg bg-[#FF8C00] px-4 py-2 text-sm font-semibold text-white">
          {buttonText}
        </span>
      </div>
    </div>
  );
}
