import { ContactLineCtaSection } from "../builder/sections/contact/ContactLineCtaSection";
import { FeaturesGridSection } from "../builder/sections/features/FeaturesGridSection";
import { FooterSimpleSection } from "../builder/sections/footer/FooterSimpleSection";
import { HeroSplitImageSection } from "../builder/sections/hero/HeroSplitImageSection";
import { ContactFormSection } from "./ContactFormSection";
import type { CSSProperties } from "react";
import {
  ELabAnimatedNavbar,
  ELabBentoFeatures,
  ELabCategoryGrid,
  ELabEducationHero,
  ELabFeaturedCourses,
  ELabFloatingCta,
  ELabInsightsGrid,
  ELabLargeFooter,
  ELabLogoStrip,
  ELabMetricStrip,
  ELabSplitFaq,
  ELabTestimonials,
} from "./high-design/ELabSections";
import {
  HighDesignScrollProgress,
  MotionSection,
} from "./high-design/HighDesignMotion";
import type { PublicSection } from "./public-site.api";

const DEFAULT_PUBLIC_THEME = {
  primary: "#FF8C00",
  primaryLight: "#FFD700",
  bg: "#1A1C23",
  surface: "#2D2F39",
  panel: "#252833",
  text: "#F9FAFB",
  muted: "#9CA3AF",
  border: "#9CA3AF38",
  radiusCard: "10px",
  radiusButton: "8px",
};

function readThemeString(
  themeConfig: Record<string, unknown>,
  keys: string[],
  fallback: string,
) {
  for (const key of keys) {
    const value = themeConfig[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function getThemeConfig(site: Record<string, unknown>) {
  const value = site.themeConfig;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getPublicSiteClassName(siteId: string, version: number | string) {
  const safeSiteId = siteId.replace(/[^a-zA-Z0-9_-]/g, "-") || "unknown";
  const safeVersion = String(version).replace(/[^a-zA-Z0-9_-]/g, "-") || "0";
  return `fw-site-${safeSiteId} fw-version-${safeVersion}`;
}

export function getPublicSiteThemeStyle(
  site: Record<string, unknown>,
): CSSProperties {
  const themeConfig = getThemeConfig(site);
  const primary = readThemeString(
    themeConfig,
    ["--fw-color-primary", "--color-primary", "primaryColor", "accentColor"],
    DEFAULT_PUBLIC_THEME.primary,
  );
  const primaryLight = readThemeString(
    themeConfig,
    ["--fw-color-primary-light", "--color-primary-light", "highlightColor"],
    DEFAULT_PUBLIC_THEME.primaryLight,
  );
  const bg = readThemeString(
    themeConfig,
    ["--fw-bg", "--color-background", "backgroundColor"],
    DEFAULT_PUBLIC_THEME.bg,
  );
  const surface = readThemeString(
    themeConfig,
    ["--fw-surface", "--color-surface", "surfaceColor"],
    DEFAULT_PUBLIC_THEME.surface,
  );
  const text = readThemeString(
    themeConfig,
    ["--fw-text", "--color-text-base", "textColor"],
    DEFAULT_PUBLIC_THEME.text,
  );
  const muted = readThemeString(
    themeConfig,
    ["--fw-muted", "--color-text-muted", "mutedColor"],
    DEFAULT_PUBLIC_THEME.muted,
  );
  const border = readThemeString(
    themeConfig,
    ["--fw-border", "--color-border", "borderColor"],
    DEFAULT_PUBLIC_THEME.border,
  );
  const radiusCard = readThemeString(
    themeConfig,
    ["--fw-radius-card", "--radius-card", "cardRadius"],
    DEFAULT_PUBLIC_THEME.radiusCard,
  );
  const radiusButton = readThemeString(
    themeConfig,
    ["--fw-radius-button", "--radius-button", "buttonRadius"],
    DEFAULT_PUBLIC_THEME.radiusButton,
  );

  return {
    "--fw-color-primary": primary,
    "--fw-color-primary-light": primaryLight,
    "--fw-bg": bg,
    "--fw-surface": surface,
    "--fw-panel": readThemeString(
      themeConfig,
      ["--fw-panel", "panelColor"],
      DEFAULT_PUBLIC_THEME.panel,
    ),
    "--fw-text": text,
    "--fw-muted": muted,
    "--fw-border": border,
    "--fw-radius-card": radiusCard,
    "--fw-radius-button": radiusButton,
    "--fw-gradient-primary": `linear-gradient(135deg, ${primary}, ${primaryLight})`,
    "--fw-glow-primary": `0 0 28px color-mix(in srgb, ${primary} 34%, transparent)`,
    "--fw-depth-card": "0 24px 70px rgb(0 0 0 / 0.32)",
    backgroundColor: bg,
    color: text,
    fontFamily: "Kanit, sans-serif",
    lineHeight: 1.7,
  } as CSSProperties;
}

type SectionComponent = React.ComponentType<{
  props: Record<string, unknown>;
}>;

const TYPE_TO_COMPONENT: Record<string, SectionComponent> = {
  NAVBAR: ELabAnimatedNavbar,
  "navbar.stickyAnimated": ELabAnimatedNavbar,
  HERO: HeroSplitImageSection,
  "hero.splitImage": HeroSplitImageSection,
  "hero.educationEditorial": ELabEducationHero,
  FEATURE: FeaturesGridSection,
  "features.grid": FeaturesGridSection,
  "features.bentoLearning": ELabBentoFeatures,
  "courses.featuredGrid": ELabFeaturedCourses,
  "trustedTeams.logoStrip": ELabLogoStrip,
  "testimonials.bentoProof": ELabTestimonials,
  TESTIMONIAL: ELabTestimonials,
  CONTACT: ContactLineCtaSection,
  "contact.lineCta": ContactLineCtaSection,
  "contact.roundedPanel": ContactFormSection,
  FORM: ContactFormSection,
  "contact.form": ContactFormSection,
  CTA: ELabFloatingCta,
  "cta.floatingAvatars": ELabFloatingCta,
  FAQ: ELabSplitFaq,
  "faq.splitAccordion": ELabSplitFaq,
  CONTENT: ELabFeaturedCourses,
  "content.courses": ELabFeaturedCourses,
  "content.metricStrip": ELabMetricStrip,
  "content.featuredGrid": ELabFeaturedCourses,
  "content.insightsGrid": ELabInsightsGrid,
  "content.categoryGrid": ELabCategoryGrid,
  "content.logoStrip": ELabLogoStrip,
  GALLERY: PublicGallerySection,
  "gallery.clipReveal": PublicGallerySection,
  FOOTER: FooterSimpleSection,
  "footer.simple": FooterSimpleSection,
  "footer.largeDark": ELabLargeFooter,
};

function getVariantKey(section: PublicSection) {
  const variant =
    typeof section.props.variant === "string" ? section.props.variant : null;
  if (!variant) {
    return section.type;
  }

  const prefixByType: Record<string, string> = {
    NAVBAR: "navbar",
    HERO: "hero",
    FEATURE: "features",
    TESTIMONIAL: "testimonials",
    CONTACT: "contact",
    FORM: "contact",
    CTA: "cta",
    FAQ: "faq",
    CONTENT: "content",
    FOOTER: "footer",
  };

  return `${prefixByType[section.type] ?? section.type.toLowerCase()}.${variant}`;
}

function PublicGallerySection({ props }: { props: Record<string, unknown> }) {
  const title = typeof props.title === "string" ? props.title : "ผลงานจริง";
  const subtitle =
    typeof props.subtitle === "string"
      ? props.subtitle
      : "บรรยากาศและผลลัพธ์ที่ช่วยให้ลูกค้าตัดสินใจได้ง่ายขึ้น";
  const items = Array.isArray(props.items)
    ? props.items
        .map((item) => (item && typeof item === "object" ? item : null))
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : [];

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="px-6 py-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-kanit text-3xl font-semibold leading-tight text-[var(--fw-text,#F9FAFB)]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">
            {subtitle}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item, index) => {
            const imageUrl =
              typeof item.imageUrl === "string" ? item.imageUrl : "";
            const label =
              typeof item.title === "string"
                ? item.title
                : typeof item.label === "string"
                  ? item.label
                  : `ภาพที่ ${index + 1}`;
            return (
              <figure
                key={`${label}-${index}`}
                className="group overflow-hidden rounded-[var(--fw-radius-card,10px)] border border-[var(--fw-border,#9CA3AF38)] bg-[var(--fw-surface,#2D2F39)]"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={label}
                    className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="aspect-[4/3] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--fw-color-primary,#FF8C00)_24%,transparent),color-mix(in_srgb,var(--fw-color-primary-light,#FFD700)_12%,transparent))]" />
                )}
                <figcaption className="px-4 py-3 text-sm font-medium text-[var(--fw-text,#F9FAFB)]">
                  {label}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function isHighDesignSection(section: PublicSection) {
  const key = getVariantKey(section);
  return (
    key.includes("educationEditorial") ||
    key.includes("bento") ||
    key.includes("featuredGrid") ||
    key.includes("logoStrip") ||
    key.includes("metricStrip") ||
    key.includes("categoryGrid") ||
    key.includes("insightsGrid") ||
    key.includes("floatingAvatars") ||
    key.includes("splitAccordion") ||
    key.includes("largeDark") ||
    key.includes("stickyAnimated")
  );
}

function GenericSectionFallback({ section }: { section: PublicSection }) {
  const { props } = section;
  const title = typeof props.title === "string" ? props.title : null;
  const subtitle =
    typeof props.subtitle === "string"
      ? props.subtitle
      : typeof props.description === "string"
        ? props.description
        : null;

  if (!title && !subtitle) {
    return null;
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      {title ? (
        <h2 className="font-kanit text-2xl font-semibold text-[var(--fw-text,#F9FAFB)]">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-[var(--fw-muted,#9CA3AF)]">{subtitle}</p>
      ) : null}
    </div>
  );
}

type PublicSectionRendererProps = {
  sections: PublicSection[];
  siteId: string;
  pageId: string;
  showScrollProgress?: boolean;
};

export function PublicSectionRenderer({
  sections,
  siteId,
  pageId,
  showScrollProgress = true,
}: PublicSectionRendererProps) {
  const hasHighDesign = sections.some(isHighDesignSection);

  return (
    <div className="bg-[var(--fw-bg,#1A1C23)] text-[var(--fw-text,#F9FAFB)]">
      {hasHighDesign && showScrollProgress ? <HighDesignScrollProgress /> : null}
      {sections.map((section) => {
        const variantKey = getVariantKey(section);
        const Component =
          TYPE_TO_COMPONENT[variantKey] ?? TYPE_TO_COMPONENT[section.type];
        const sectionProps = {
          ...section.props,
          _siteId: siteId,
          _pageId: pageId,
          _sectionId: section.id,
        };

        if (Component) {
          return (
            <MotionSection key={section.id} motion={section.props.motion}>
              <Component props={sectionProps} />
            </MotionSection>
          );
        }

        return (
          <MotionSection key={section.id} motion={section.props.motion}>
            <GenericSectionFallback section={section} />
          </MotionSection>
        );
      })}
    </div>
  );
}
