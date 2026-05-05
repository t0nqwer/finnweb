import { ContactLineCtaSection } from "../builder/sections/contact/ContactLineCtaSection";
import { FeaturesGridSection } from "../builder/sections/features/FeaturesGridSection";
import { FooterSimpleSection } from "../builder/sections/footer/FooterSimpleSection";
import { HeroSplitImageSection } from "../builder/sections/hero/HeroSplitImageSection";
import { ContactFormSection } from "./ContactFormSection";
import type { PublicSection } from "./public-site.api";

type SectionComponent = React.ComponentType<{
  props: Record<string, unknown>;
}>;

const TYPE_TO_COMPONENT: Record<string, SectionComponent> = {
  HERO: HeroSplitImageSection,
  "hero.splitImage": HeroSplitImageSection,
  FEATURE: FeaturesGridSection,
  "features.grid": FeaturesGridSection,
  CONTACT: ContactLineCtaSection,
  "contact.lineCta": ContactLineCtaSection,
  FORM: ContactFormSection,
  "contact.form": ContactFormSection,
  FOOTER: FooterSimpleSection,
  "footer.simple": FooterSimpleSection,
};

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
  return (
    <div className="divide-y divide-slate-100">
      {sections.map((section) => {
        const Component = TYPE_TO_COMPONENT[section.type];
        const sectionProps = {
          ...section.props,
          _siteId: siteId,
          _pageId: pageId,
          _sectionId: section.id,
        };

        if (Component) {
          return (
            <div key={section.id}>
              <Component props={sectionProps} />
            </div>
          );
        }

        return (
          <div key={section.id}>
            <GenericSectionFallback section={section} />
          </div>
        );
      })}
    </div>
  );
}
