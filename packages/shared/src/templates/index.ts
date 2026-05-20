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
  aestheticClinicLandingBlueprint,
  allBlueprints,
} from "./blueprints/restaurant-landing.blueprint";

// Themes
export {
  modernOrangeTheme,
  luxuryDarkTheme,
  deepSpacePremiumTheme,
  allThemes,
} from "./themes/index";

// Content packs
export {
  malaRestaurantThContentPack,
  cafeThContentPack,
  aestheticClinicThContentPack,
  allContentPacks,
} from "./content-packs/index";

// Generator
export {
  generateTemplate,
  getAvailableBlueprints,
  getAvailableThemes,
  getAvailableContentPacks,
} from "./generator/generate-template";

// Website-to-template agent
export {
  createTemplateDraftFromWebsiteProfile,
  createWebsiteProfileFromCapture,
} from "./agent/website-to-template-agent";
export type {
  WebsiteAnimationSignal,
  WebsiteDesignTokens,
  WebsiteAsset,
  CapturedWebsiteLink,
  CapturedWebsiteImage,
  CapturedWebsiteForm,
  CapturedWebsitePage,
  CapturedWebsiteSource,
  WebsiteSectionAnalysis,
  WebsitePageAnalysis,
  WebsiteProfile,
  WebsiteToTemplateAgentOptions,
  TemplateDraftSection,
  TemplateDraftPage,
  WebsiteTemplateDraft,
  WebsiteToTemplateDraftResult,
} from "./agent/website-to-template-agent.types";
