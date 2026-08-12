// ---------------------------------------------------------------------------
// Color helpers for quality rules (WCAG contrast + brand palette membership)
// ---------------------------------------------------------------------------

export type Rgb = { r: number; g: number; b: number };

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses #RGB / #RRGGBB. Returns null for anything else (gradients, vars, …). */
export function parseHexColor(value: string): Rgb | null {
  const match = HEX_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const ratio = channel / 255;
  return ratio <= 0.03928
    ? ratio / 12.92
    : Math.pow((ratio + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/**
 * WCAG contrast ratio between two colors, 1–21.
 * Returns null when either value is not a plain hex color, so callers skip the
 * check instead of guessing about gradients or CSS variables.
 */
export function contrastRatio(
  foreground: string,
  background: string,
): number | null {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);
  if (!fg || !bg) {
    return null;
  }

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));

  return Number((((lighter + 0.05) / (darker + 0.05)) as number).toFixed(2));
}

/** Canonical brand colors from brand-book.md / DESIGN.json. */
export const BRAND_CANONICAL_COLORS = {
  igniteOrange: "#FF8C00",
  solarFlare: "#FFD700",
  deepSpace: "#1A1C23",
  surfaceGray: "#2D2F39",
  cloudWhite: "#F9FAFB",
  slateGray: "#9CA3AF",
} as const;

/**
 * "The Controlled Flame Rule" (DESIGN.md): Ignite Orange is reserved for primary
 * actions. These are the hues that read as the brand's primary flame.
 */
const FLAME_HUES = new Set(["#ff8c00", "#ff4500", "#ffa733", "#e07d00"]);

export function isFlameColor(value: string): boolean {
  const parsed = parseHexColor(value);
  if (!parsed) {
    return false;
  }
  const normalized = `#${[parsed.r, parsed.g, parsed.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
  return FLAME_HUES.has(normalized.toLowerCase());
}
