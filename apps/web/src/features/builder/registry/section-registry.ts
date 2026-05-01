export type BuilderSectionRecordLike = {
  type: string;
  name?: string | null;
};

export type SectionLibraryItem = {
  label: string;
  type: string;
  iconKey: "layers" | "globe" | "type" | "image" | "pointer";
  tone: string;
};

export const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    label: "ส่วนหัว / Hero",
    type: "HERO",
    iconKey: "layers",
    tone: "text-primary",
  },
  {
    label: "แถบนำทาง",
    type: "NAVBAR",
    iconKey: "globe",
    tone: "text-cyan-400",
  },
  {
    label: "ท้ายเว็บ",
    type: "FOOTER",
    iconKey: "globe",
    tone: "text-cyan-500",
  },
  {
    label: "ข้อความ",
    type: "RICH_TEXT",
    iconKey: "type",
    tone: "text-sky-400",
  },
  {
    label: "รูปภาพ",
    type: "IMAGE",
    iconKey: "image",
    tone: "text-emerald-400",
  },
  {
    label: "ปุ่มหรือฟอร์ม",
    type: "FORM",
    iconKey: "pointer",
    tone: "text-fuchsia-400",
  },
];

export function formatSectionType(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getSectionLabel(section: BuilderSectionRecordLike) {
  const customName = section.name?.trim();
  if (customName) {
    return customName;
  }

  const fromLibrary = SECTION_LIBRARY.find((item) => item.type === section.type);
  if (fromLibrary) {
    return fromLibrary.label;
  }

  return formatSectionType(section.type);
}
