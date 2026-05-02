import type {
  LabelOption,
  SiteTemplate,
  WizardState,
} from "../types/create-site.types";

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
