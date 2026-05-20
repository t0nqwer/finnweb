export const FINNWEB_MOTION_PRESETS = [
  "parallax-layer",
  "parallax-bg",
  "scroll-reveal",
  "pin-section",
  "scroll-progress",
  "stagger-children",
  "clip-reveal",
  "tilt-3d",
  "magnetic",
  "sticky-story",
  "fade-up",
  "fade-down",
  "fade-left",
  "fade-right",
  "scale-in",
  "soft-float",
  "marquee",
  "none",
] as const;

export type FinnwebMotionPreset = (typeof FINNWEB_MOTION_PRESETS)[number];

export type FinnwebMotionDirective = {
  preset: FinnwebMotionPreset;
  trigger?: "load" | "scroll" | "hover" | "loop";
  scrub?: boolean | number;
  speed?: number;
  distance?: number;
  stagger?: number;
  pin?: boolean;
  clip?: boolean;
  intensity?: "subtle" | "medium" | "strong";
  delay?: number;
};

const presetSet = new Set<string>(FINNWEB_MOTION_PRESETS);

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizePreset(value: unknown): FinnwebMotionPreset {
  const requested = typeof value === "string" ? value : "";
  if (presetSet.has(requested)) {
    return requested as FinnwebMotionPreset;
  }

  if (requested.includes("parallax") && requested.includes("bg")) {
    return "parallax-bg";
  }
  if (requested.includes("parallax")) {
    return "parallax-layer";
  }
  if (requested.includes("pin")) {
    return "pin-section";
  }
  if (requested.includes("progress")) {
    return "scroll-progress";
  }
  if (requested.includes("stagger") || requested.includes("card")) {
    return "stagger-children";
  }
  if (requested.includes("clip")) {
    return "clip-reveal";
  }
  if (requested.includes("tilt")) {
    return "tilt-3d";
  }
  if (requested.includes("magnetic")) {
    return "magnetic";
  }
  if (requested.includes("sticky")) {
    return "sticky-story";
  }
  if (requested.includes("float")) {
    return "soft-float";
  }
  if (requested.includes("marquee")) {
    return "marquee";
  }
  if (requested.includes("scale") || requested.includes("zoom")) {
    return "scale-in";
  }
  if (requested.includes("left")) {
    return "fade-left";
  }
  if (requested.includes("right")) {
    return "fade-right";
  }
  if (requested.includes("down")) {
    return "fade-down";
  }
  if (requested.includes("none")) {
    return "none";
  }

  return "scroll-reveal";
}

export function normalizeFinnwebMotionDirectives(
  value: unknown,
): FinnwebMotionDirective[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .slice(0, 8)
    .map((item) => {
      const preset = normalizePreset(item.preset ?? item.name);
      const trigger =
        item.trigger === "load" ||
        item.trigger === "scroll" ||
        item.trigger === "hover" ||
        item.trigger === "loop"
          ? item.trigger
          : "scroll";
      const scrub =
        typeof item.scrub === "boolean"
          ? item.scrub
          : typeof item.scrub === "number"
            ? clampNumber(item.scrub, 0, 2, 0.5)
            : undefined;
      const intensity =
        item.intensity === "subtle" ||
        item.intensity === "medium" ||
        item.intensity === "strong"
          ? item.intensity
          : "medium";

      return {
        preset,
        trigger,
        scrub,
        speed: clampNumber(item.speed, 0.1, 3, 1),
        distance: clampNumber(item.distance, 8, 220, 64),
        stagger: clampNumber(item.stagger, 0.02, 0.4, 0.08),
        pin: typeof item.pin === "boolean" ? item.pin : undefined,
        clip: typeof item.clip === "boolean" ? item.clip : undefined,
        intensity,
        delay: clampNumber(item.delay, 0, 700, 0),
      };
    });
}
