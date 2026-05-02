import type {
  BusinessType,
  LabelOption,
  MainGoal,
  SiteLanguage,
  SiteStyle,
  SiteTemplate,
  WizardState,
} from "../types/create-site.types";

export type TemplateFilterState = {
  businessType: BusinessType | null;
  goal: MainGoal | null;
  style: SiteStyle | null;
  language: SiteLanguage | null;
  onlyFree: boolean;
};

export const EMPTY_TEMPLATE_FILTERS: TemplateFilterState = {
  businessType: null,
  goal: null,
  style: null,
  language: null,
  onlyFree: false,
};

export function isTemplateRecommended(
  template: SiteTemplate,
  wizard: Pick<WizardState, "businessType" | "goal">,
): boolean {
  const businessTypes =
    template.businessTypes.length > 0
      ? template.businessTypes
      : [template.businessType];
  const goals =
    template.goals.length > 0 ? template.goals : template.matchedGoals;
  return (
    businessTypes.includes(wizard.businessType) && goals.includes(wizard.goal)
  );
}

export function applyTemplateFilters(
  templates: SiteTemplate[],
  filters: TemplateFilterState,
  search: string,
): SiteTemplate[] {
  const q = search.trim().toLowerCase();
  return templates.filter((template) => {
    if (filters.businessType) {
      const types =
        template.businessTypes.length > 0
          ? template.businessTypes
          : [template.businessType];
      if (!types.includes(filters.businessType)) return false;
    }
    if (filters.goal) {
      const goals =
        template.goals.length > 0 ? template.goals : template.matchedGoals;
      if (!goals.includes(filters.goal)) return false;
    }
    if (filters.style && !template.styles.includes(filters.style)) return false;
    if (filters.language && !template.languages.includes(filters.language))
      return false;
    if (filters.onlyFree && !template.isFree) return false;
    if (q) {
      const searchable = [
        template.name,
        template.description,
        template.categoryLabel,
        template.categorySlug,
        ...template.keywords,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

export function getOptionLabel<T extends string>(
  options: Array<LabelOption<T>>,
  id: T,
) {
  return options.find((option) => option.id === id)?.label ?? id;
}

export function matchTemplates(
  templates: SiteTemplate[],
  wizard: Pick<WizardState, "businessType" | "goal" | "style" | "language">,
) {
  return [...templates].sort((first, second) => {
    const firstRank = getTemplateMatchRank(first, wizard);
    const secondRank = getTemplateMatchRank(second, wizard);

    return (
      secondRank.businessType - firstRank.businessType ||
      secondRank.goal - firstRank.goal ||
      secondRank.style - firstRank.style ||
      secondRank.language - firstRank.language ||
      secondRank.isOfficial - firstRank.isOfficial ||
      secondRank.isFree - firstRank.isFree ||
      secondRank.installCount - firstRank.installCount ||
      firstRank.sortOrder - secondRank.sortOrder ||
      first.name.localeCompare(second.name)
    );
  });
}

function getTemplateMatchRank(
  template: SiteTemplate,
  wizard: Pick<WizardState, "businessType" | "goal" | "style" | "language">,
) {
  const businessTypes =
    template.businessTypes.length > 0
      ? template.businessTypes
      : [template.businessType];
  const goals =
    template.goals.length > 0 ? template.goals : template.matchedGoals;

  return {
    businessType: businessTypes.includes(wizard.businessType) ? 1 : 0,
    goal: goals.includes(wizard.goal) ? 1 : 0,
    style: template.styles.includes(wizard.style) ? 1 : 0,
    language: template.languages.includes(wizard.language) ? 1 : 0,
    isOfficial: template.isOfficial ? 1 : 0,
    isFree: template.isFree ? 1 : 0,
    installCount: template.installCount,
    sortOrder: template.sortOrder,
  };
}
