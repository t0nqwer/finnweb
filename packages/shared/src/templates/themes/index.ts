import type { ThemePack } from "../types/template-factory.types";

/** Modern Orange — warm, energetic, approachable */
export const modernOrangeTheme: ThemePack = {
  id: "modern-orange",
  name: "Modern Orange",
  tokens: {
    "--color-primary": "#FF8C00",
    "--color-primary-light": "#FFD700",
    "--color-background": "#FFFFFF",
    "--color-surface": "#F9FAFB",
    "--color-text-base": "#1A1C23",
    "--color-text-muted": "#64748B",
    "--color-border": "#E2E8F0",
    "--font-heading": "'Kanit', sans-serif",
    "--font-body": "'Kanit', sans-serif",
    "--radius-card": "12px",
    "--radius-button": "8px",
  },
  sectionOverrides: {
    HERO: {
      accentColor: "#FF8C00",
      backgroundStyle: "light",
    },
    CONTACT: {
      accentColor: "#FF8C00",
    },
    FOOTER: {
      backgroundColor: "#1A1C23",
      textColor: "#CBD5E1",
    },
  },
};

/** Luxury Dark — dark background, gold accents, premium feel */
export const luxuryDarkTheme: ThemePack = {
  id: "luxury-dark",
  name: "Luxury Dark",
  tokens: {
    "--color-primary": "#D4AF37",
    "--color-primary-light": "#F5D67D",
    "--color-background": "#0E0E10",
    "--color-surface": "#1A1A1E",
    "--color-text-base": "#F1F0EE",
    "--color-text-muted": "#A0A0A8",
    "--color-border": "#2E2E36",
    "--font-heading": "'Kanit', sans-serif",
    "--font-body": "'Kanit', sans-serif",
    "--radius-card": "4px",
    "--radius-button": "4px",
  },
  sectionOverrides: {
    HERO: {
      accentColor: "#D4AF37",
      backgroundStyle: "dark",
    },
    FEATURE: {
      backgroundColor: "#1A1A1E",
      iconColor: "#D4AF37",
    },
    CONTACT: {
      accentColor: "#D4AF37",
    },
    FOOTER: {
      backgroundColor: "#0E0E10",
      textColor: "#A0A0A8",
    },
  },
};

export const deepSpacePremiumTheme: ThemePack = {
  id: "deep-space-premium",
  name: "Deep Space Premium",
  tokens: {
    "--color-primary": "#FF8C00",
    "--color-primary-light": "#FFD700",
    "--color-background": "#1A1C23",
    "--color-surface": "#2D2F39",
    "--color-text-base": "#F9FAFB",
    "--color-text-muted": "#9CA3AF",
    "--color-border": "#9CA3AF38",
    "--fw-color-primary": "#FF8C00",
    "--fw-color-primary-light": "#FFD700",
    "--fw-bg": "#1A1C23",
    "--fw-surface": "#2D2F39",
    "--fw-panel": "#252833",
    "--fw-text": "#F9FAFB",
    "--fw-muted": "#9CA3AF",
    "--fw-border": "#9CA3AF38",
    "--font-heading": "'Kanit', sans-serif",
    "--font-body": "'Kanit', sans-serif",
    "--radius-card": "10px",
    "--radius-button": "8px",
    "--fw-radius-card": "10px",
    "--fw-radius-button": "8px",
  },
  sectionOverrides: {
    HERO: {
      accentColor: "var(--fw-color-primary, #FF8C00)",
      backgroundStyle: "dark",
    },
    FEATURE: {
      accentColor: "var(--fw-color-primary, #FF8C00)",
    },
    CONTACT: {
      backgroundColor: "var(--fw-surface, #2D2F39)",
      accentColor: "var(--fw-color-primary, #FF8C00)",
    },
    FOOTER: {
      backgroundColor: "var(--fw-bg, #1A1C23)",
      textColor: "var(--fw-muted, #9CA3AF)",
    },
  },
};

export const allThemes = [
  modernOrangeTheme,
  luxuryDarkTheme,
  deepSpacePremiumTheme,
];
