import { ContactLineCtaSection } from "../builder/sections/contact/ContactLineCtaSection";
import { FeaturesGridSection } from "../builder/sections/features/FeaturesGridSection";
import { FooterSimpleSection } from "../builder/sections/footer/FooterSimpleSection";
import { HeroSplitImageSection } from "../builder/sections/hero/HeroSplitImageSection";
import { ContactFormSection } from "./ContactFormSection";
import {
  ELabAnimatedNavbar,
  ELabBentoFeatures,
  ELabEducationHero,
  ELabFeaturedCourses,
  ELabFloatingCta,
  ELabLargeFooter,
  ELabLogoStrip,
  ELabSplitFaq,
  ELabTestimonials,
} from "./high-design/ELabSections";
import {
  HighDesignScrollProgress,
  MotionSection,
} from "./high-design/HighDesignMotion";
import type { PublicSection } from "./public-site.api";

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
  "content.insightsGrid": ELabFeaturedCourses,
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

function isHighDesignSection(section: PublicSection) {
  const key = getVariantKey(section);
  return (
    key.includes("educationEditorial") ||
    key.includes("bento") ||
    key.includes("featuredGrid") ||
    key.includes("logoStrip") ||
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
        <h2 className="font-kanit text-2xl font-semibold text-[#1A1C23]">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

type PublicSectionRendererProps = {
  sections: PublicSection[];
  siteId: string;
  pageId: string;
};

export function PublicSectionRenderer({
  sections,
  siteId,
  pageId,
}: PublicSectionRendererProps) {
  const hasHighDesign = sections.some(isHighDesignSection);

  return (
    <div className={hasHighDesign ? "bg-[#FAFAFA]" : "divide-y divide-slate-100"}>
      {hasHighDesign ? <HighDesignScrollProgress /> : null}
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
