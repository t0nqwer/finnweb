import type { ComponentType } from "react";
import { ContactLineCtaSection } from "../sections/contact/ContactLineCtaSection";
import { FeaturesGridSection } from "../sections/features/FeaturesGridSection";
import { FooterSimpleSection } from "../sections/footer/FooterSimpleSection";
import { HeroSplitImageSection } from "../sections/hero/HeroSplitImageSection";
import type { EditorSchema } from "../types/editor-schema.types";

export type SectionType =
  | "hero.splitImage"
  | "features.grid"
  | "contact.lineCta"
  | "footer.simple";

export type BuilderSection = {
  id: string;
  type: SectionType | string;
  sourceType?: string;
  pageId?: string;
  label: string;
  summary: string;
  props: Record<string, unknown>;
  isVisible?: boolean;
  sortOrder?: number;
};

export type SectionComponentProps = {
  props: Record<string, unknown>;
};

export type SectionRegistryEntry = {
  label: string;
  component: ComponentType<SectionComponentProps>;
  defaultProps: Record<string, unknown>;
  editorSchema: EditorSchema;
};

export const sectionRegistry: Record<SectionType, SectionRegistryEntry> = {
  "hero.splitImage": {
    label: "Hero Split Image",
    component: HeroSplitImageSection,
    defaultProps: {
      eyebrow: "FinnWeb builder",
      headline: "สร้างเว็บไซต์ที่พร้อมรับลูกค้าในไม่กี่นาที",
      subheadline:
        "นี่คือ mock canvas สำหรับทดสอบโครง builder ก่อนต่อข้อมูลจริงจาก API",
      primaryButtonText: "ติดต่อผ่าน LINE",
      accentColor: "#FF8C00",
      imageUrl: "",
      imagePosition: "right",
      showImage: true,
    },
    editorSchema: [
      {
        key: "eyebrow",
        label: "ข้อความเล็กด้านบน",
        type: "text",
        placeholder: "เช่น FinnWeb builder",
      },
      {
        key: "headline",
        label: "หัวข้อใหญ่",
        type: "text",
        placeholder: "ใส่หัวข้อหลักของหน้า",
        required: true,
      },
      {
        key: "subheadline",
        label: "คำอธิบาย",
        type: "textarea",
        placeholder: "อธิบายคุณค่าหลักให้ลูกค้าเข้าใจเร็ว",
      },
      {
        key: "primaryButtonText",
        label: "ข้อความปุ่มหลัก",
        type: "text",
        placeholder: "เช่น ติดต่อผ่าน LINE",
      },
      {
        key: "accentColor",
        label: "สีหลัก",
        type: "color",
      },
      {
        key: "imageUrl",
        label: "รูปภาพ",
        type: "image",
        placeholder: "https://...",
      },
      {
        key: "imagePosition",
        label: "ตำแหน่งรูป",
        type: "select",
        options: [
          { label: "ขวา", value: "right" },
          { label: "ซ้าย", value: "left" },
        ],
      },
      {
        key: "showImage",
        label: "แสดงรูปภาพ",
        type: "switch",
      },
    ],
  },
  "features.grid": {
    label: "Features Grid",
    component: FeaturesGridSection,
    defaultProps: {
      title: "จุดเด่นที่ช่วยให้ธุรกิจโตเร็วขึ้น",
      featureOne: "เร็ว",
      featureTwo: "แก้ง่าย",
      featureThree: "พร้อม lead",
      accentColor: "#FF8C00",
    },
    editorSchema: [
      {
        key: "title",
        label: "หัวข้อส่วนจุดเด่น",
        type: "text",
        placeholder: "เช่น ทำไมลูกค้าถึงเลือกเรา",
      },
      {
        key: "featureOne",
        label: "จุดเด่น 1",
        type: "text",
        placeholder: "เช่น เร็ว",
      },
      {
        key: "featureTwo",
        label: "จุดเด่น 2",
        type: "text",
        placeholder: "เช่น แก้ง่าย",
      },
      {
        key: "featureThree",
        label: "จุดเด่น 3",
        type: "text",
        placeholder: "เช่น พร้อม lead",
      },
      {
        key: "accentColor",
        label: "สีไอคอน",
        type: "color",
      },
    ],
  },
  "contact.lineCta": {
    label: "LINE Contact CTA",
    component: ContactLineCtaSection,
    defaultProps: {
      title: "พร้อมคุยกับลูกค้าแล้ว",
      description: "พื้นที่นี้จะกลายเป็นฟอร์มติดต่อหรือ LINE CTA ใน builder จริง",
      lineUrl: "",
      buttonText: "ทัก LINE",
      backgroundColor: "#1A1C23",
      showIcon: true,
    },
    editorSchema: [
      {
        key: "title",
        label: "หัวข้อ",
        type: "text",
        placeholder: "เช่น พร้อมคุยกับลูกค้าแล้ว",
        required: true,
      },
      {
        key: "description",
        label: "คำอธิบาย",
        type: "textarea",
        placeholder: "อธิบายว่าลูกค้าจะติดต่อได้อย่างไร",
      },
      {
        key: "lineUrl",
        label: "ลิงก์ LINE",
        type: "url",
        placeholder: "https://line.me/...",
      },
      {
        key: "buttonText",
        label: "ข้อความปุ่ม",
        type: "text",
        placeholder: "เช่น ทัก LINE",
      },
      {
        key: "backgroundColor",
        label: "สีพื้นหลัง",
        type: "color",
      },
      {
        key: "showIcon",
        label: "แสดงไอคอน LINE",
        type: "switch",
      },
    ],
  },
  "footer.simple": {
    label: "Simple Footer",
    component: FooterSimpleSection,
    defaultProps: {
      brandName: "FinnWeb",
      tagline: "สร้างเว็บไซต์เร็ว พร้อมรับลูกค้าใหม่",
      backgroundColor: "#11131A",
      textColor: "#CBD5E1",
    },
    editorSchema: [
      {
        key: "brandName",
        label: "ชื่อแบรนด์",
        type: "text",
        placeholder: "เช่น FinnWeb",
        required: true,
      },
      {
        key: "tagline",
        label: "ข้อความท้ายเว็บ",
        type: "text",
        placeholder: "เช่น สร้างเว็บไซต์เร็ว พร้อมรับลูกค้าใหม่",
      },
      {
        key: "backgroundColor",
        label: "สีพื้นหลัง",
        type: "color",
      },
      {
        key: "textColor",
        label: "สีข้อความ",
        type: "color",
      },
    ],
  },
};

export function getSectionRegistryEntry(
  type: string,
): SectionRegistryEntry | undefined {
  return (sectionRegistry as Partial<Record<string, SectionRegistryEntry>>)[
    type
  ];
}

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
