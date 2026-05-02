import type { ComponentType } from "react";

export type CreateStep = "profile" | "template" | "review";
export type BusinessType =
  | "restaurant"
  | "service"
  | "clinic"
  | "fashion"
  | "product";
export type MainGoal = "leads" | "sales" | "store" | "booking";
export type SiteStyle = "modern" | "luxury" | "minimal" | "fun";
export type SiteLanguage = "thai" | "english" | "thai-english";
export type PreviewMode = "desktop" | "mobile";

export type SiteRecord = {
  id: string;
  name: string;
  slug: string;
  workspace?: {
    id: string;
  };
};

export type ApiTemplateSection = {
  id: string;
  type: string;
  name?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  props?: Record<string, unknown> | null;
};

export type ApiTemplatePage = {
  id: string;
  title: string;
  slug: string;
  path?: string | null;
  pageType: string;
  isHomePage?: boolean;
  sortOrder?: number;
  sections: ApiTemplateSection[];
};

export type ApiTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  isOfficial?: boolean;
  category?: {
    slug: string;
    name: string;
  } | null;
  businessTypes?: string[] | null;
  goals?: string[] | null;
  styles?: string[] | null;
  languages?: string[] | null;
  keywords?: string[] | null;
  isFree?: boolean;
  installCount?: number;
  ratingAvg?: number | null;
  ratingCount?: number;
  sortOrder?: number;
  pages: ApiTemplatePage[];
};

export type SiteTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string | null;
  categoryLabel: string;
  categorySlug: string;
  businessType: BusinessType;
  businessTypes: BusinessType[];
  matchedGoals: MainGoal[];
  goals: MainGoal[];
  styles: SiteStyle[];
  languages: SiteLanguage[];
  keywords: string[];
  pages: Array<{
    id: string;
    title: string;
    isHomePage: boolean;
    sectionTypes: string[];
  }>;
  sectionCount: number;
  isOfficial: boolean;
  isFree: boolean;
  installCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  sortOrder: number;
};

export type WizardState = {
  businessName: string;
  siteName: string;
  businessType: BusinessType;
  goal: MainGoal;
  style: SiteStyle;
  language: SiteLanguage;
  phone: string;
  lineId: string;
  logoUrl: string;
};

export type Option<T extends string> = {
  id: T;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export type LabelOption<T extends string> = {
  id: T;
  label: string;
};
