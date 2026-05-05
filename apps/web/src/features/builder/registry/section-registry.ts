import type { ComponentType } from "react";
import { ContactLineCtaSection } from "../sections/contact/ContactLineCtaSection";
import {
  ContactFormPreviewSection,
  FaqAccordionSection,
  ImageSingleSection,
  NavbarSimpleSection,
  PricingCardsSection,
  RichTextBasicSection,
  TestimonialsGridSection,
} from "../sections/common/SimpleBuilderSections";
import { FeaturesGridSection } from "../sections/features/FeaturesGridSection";
import { FooterSimpleSection } from "../sections/footer/FooterSimpleSection";
import { HeroSplitImageSection } from "../sections/hero/HeroSplitImageSection";
import type { EditorSchema } from "../types/editor-schema.types";

export type SectionType =
  | "navbar.simple"
  | "hero.splitImage"
  | "features.grid"
  | "contact.lineCta"
  | "form.contact"
  | "richText.basic"
  | "image.single"
  | "pricing.cards"
  | "faq.accordion"
  | "testimonials.grid"
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
  "navbar.simple": {
    label: "Simple Navbar",
    component: NavbarSimpleSection,
    defaultProps: {
      brandName: "FinnWeb",
      menuItems: "Home\nServices\nContact",
      buttonText: "Contact",
    },
    editorSchema: [
      {
        key: "brandName",
        label: "Brand name",
        type: "text",
        placeholder: "FinnWeb",
        required: true,
      },
      {
        key: "menuItems",
        label: "Menu items",
        type: "textarea",
        placeholder: "Home\nServices\nContact",
      },
      {
        key: "buttonText",
        label: "Button text",
        type: "text",
        placeholder: "Contact",
      },
    ],
  },
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
  "form.contact": {
    label: "Contact Form",
    component: ContactFormPreviewSection,
    defaultProps: {
      title: "Let customers contact you",
      subtitle: "Collect name, phone, email, and a short message.",
      buttonText: "Send message",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Let customers contact you",
        required: true,
      },
      {
        key: "subtitle",
        label: "Description",
        type: "textarea",
        placeholder: "Tell customers what happens after they submit.",
      },
      {
        key: "buttonText",
        label: "Button text",
        type: "text",
        placeholder: "Send message",
      },
    ],
  },
  "richText.basic": {
    label: "Rich Text",
    component: RichTextBasicSection,
    defaultProps: {
      title: "About this business",
      body: "Use this section to explain your services, story, or important details for customers.",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "About this business",
        required: true,
      },
      {
        key: "body",
        label: "Body",
        type: "textarea",
        placeholder: "Write the main content for this section.",
      },
    ],
  },
  "image.single": {
    label: "Single Image",
    component: ImageSingleSection,
    defaultProps: {
      title: "Show your work",
      subtitle: "Add one strong image for this page.",
      imageUrl: "",
      altText: "Section image",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Show your work",
      },
      {
        key: "subtitle",
        label: "Description",
        type: "textarea",
        placeholder: "Add context for the image.",
      },
      {
        key: "imageUrl",
        label: "Image URL",
        type: "image",
        placeholder: "https://...",
      },
      {
        key: "altText",
        label: "Alt text",
        type: "text",
        placeholder: "Describe the image",
      },
    ],
  },
  "pricing.cards": {
    label: "Pricing Cards",
    component: PricingCardsSection,
    defaultProps: {
      title: "Packages",
      subtitle: "Show simple choices so customers can decide quickly.",
      plans: "Basic\nBusiness\nPro",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Packages",
      },
      {
        key: "subtitle",
        label: "Description",
        type: "textarea",
        placeholder: "Explain how customers should choose.",
      },
      {
        key: "plans",
        label: "Plan names",
        type: "textarea",
        placeholder: "Basic\nBusiness\nPro",
      },
    ],
  },
  "faq.accordion": {
    label: "FAQ",
    component: FaqAccordionSection,
    defaultProps: {
      title: "FAQ",
      subtitle: "Answer common questions before customers ask.",
      questions:
        "How long does it take?\nHow do customers contact us?\nCan we update content later?",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "FAQ",
      },
      {
        key: "subtitle",
        label: "Description",
        type: "textarea",
        placeholder: "Short section description",
      },
      {
        key: "questions",
        label: "Questions",
        type: "textarea",
        placeholder:
          "How long does it take?\nHow do customers contact us?\nCan we update content later?",
      },
    ],
  },
  "testimonials.grid": {
    label: "Testimonials",
    component: TestimonialsGridSection,
    defaultProps: {
      title: "Customer voices",
      subtitle: "Build trust with short testimonials.",
      quotes:
        "Easy to understand and fast to launch.\nCustomers can contact us more easily.\nThe page looks professional on mobile.",
    },
    editorSchema: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Customer voices",
      },
      {
        key: "subtitle",
        label: "Description",
        type: "textarea",
        placeholder: "Short section description",
      },
      {
        key: "quotes",
        label: "Quotes",
        type: "textarea",
        placeholder:
          "Easy to understand and fast to launch.\nCustomers can contact us more easily.\nThe page looks professional on mobile.",
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
  description: string;
  type: string;
  registryType: SectionType;
  iconKey:
    | "layers"
    | "globe"
    | "type"
    | "image"
    | "pointer"
    | "cards"
    | "faq"
    | "quotes";
  tone: string;
};

export const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    label: "Hero",
    description: "Headline, short pitch, primary button",
    type: "HERO",
    registryType: "hero.splitImage",
    iconKey: "layers",
    tone: "text-[#FF8C00]",
  },
  {
    label: "Navbar",
    description: "Brand, menu links, and a contact action",
    type: "NAVBAR",
    registryType: "navbar.simple",
    iconKey: "globe",
    tone: "text-cyan-400",
  },
  {
    label: "Features",
    description: "Three benefits or service highlights",
    type: "FEATURE",
    registryType: "features.grid",
    iconKey: "cards",
    tone: "text-[#FFD700]",
  },
  {
    label: "Rich text",
    description: "About copy, service details, or announcements",
    type: "RICH_TEXT",
    registryType: "richText.basic",
    iconKey: "type",
    tone: "text-sky-400",
  },
  {
    label: "Image",
    description: "A single visual with supporting text",
    type: "IMAGE",
    registryType: "image.single",
    iconKey: "image",
    tone: "text-emerald-400",
  },
  {
    label: "Contact form",
    description: "Lead capture fields and submit button",
    type: "FORM",
    registryType: "form.contact",
    iconKey: "pointer",
    tone: "text-fuchsia-400",
  },
  {
    label: "Pricing",
    description: "Simple package cards for customers",
    type: "PRICING",
    registryType: "pricing.cards",
    iconKey: "cards",
    tone: "text-amber-300",
  },
  {
    label: "FAQ",
    description: "Common questions in a compact list",
    type: "FAQ",
    registryType: "faq.accordion",
    iconKey: "faq",
    tone: "text-lime-300",
  },
  {
    label: "Testimonials",
    description: "Customer quotes or proof points",
    type: "TESTIMONIAL",
    registryType: "testimonials.grid",
    iconKey: "quotes",
    tone: "text-violet-300",
  },
  {
    label: "LINE CTA",
    description: "A focused contact call to action",
    type: "CTA",
    registryType: "contact.lineCta",
    iconKey: "pointer",
    tone: "text-green-300",
  },
  {
    label: "Footer",
    description: "Brand ending and support links",
    type: "FOOTER",
    registryType: "footer.simple",
    iconKey: "globe",
    tone: "text-cyan-500",
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
