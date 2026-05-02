// Types
export type {
  SectionType,
  BlueprintSection,
  BlueprintPage,
  TemplateBlueprint,
  ThemePack,
  ContentPackSection,
  ContentPackPage,
  ContentPack,
  GenerateTemplateInput,
  GeneratedTemplatePage,
  GeneratedTemplateSection,
  GeneratedTemplate,
} from "./types/template-factory.types";

// Blueprints
export {
  restaurantLandingBlueprint,
  allBlueprints,
} from "./blueprints/restaurant-landing.blueprint";

// Themes
export { modernOrangeTheme, luxuryDarkTheme, allThemes } from "./themes/index";

// Content packs
export {
  malaRestaurantThContentPack,
  cafeThContentPack,
  allContentPacks,
} from "./content-packs/index";

// Generator
export {
  generateTemplate,
  getAvailableBlueprints,
  getAvailableThemes,
  getAvailableContentPacks,
} from "./generator/generate-template";
