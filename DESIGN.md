---
name: FinnWeb
description: Thai-first website builder with fast, premium, motion-forward dark UI.
colors:
  deep-space: "#1A1C23"
  surface-gray: "#2D2F39"
  panel-night: "#252833"
  cloud-white: "#F9FAFB"
  slate-gray: "#9CA3AF"
  ignite-orange: "#FF8C00"
  solar-flare: "#FFD700"
  accent-ink: "#323543"
  danger-red: "#EF4444"
  border-soft: "#9CA3AF38"
  input-soft: "#9CA3AF47"
  ring-orange: "#FF8C00A6"
typography:
  display:
    fontFamily: "Kanit, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Kanit, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Kanit, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ignite-orange}"
    textColor: "{colors.cloud-white}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "#FF9F1A"
    textColor: "{colors.cloud-white}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  input-default:
    backgroundColor: "{colors.deep-space}"
    textColor: "{colors.cloud-white}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
  card-default:
    backgroundColor: "{colors.surface-gray}"
    textColor: "{colors.cloud-white}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: FinnWeb

## 1. Overview

**Creative North Star: "Ignition Console"**

FinnWeb must feel like a launch cockpit for Thai business owners, fast to read, clear to act, and always one step away from publish. The aesthetic is dark by default and premium in texture, but never ornamental enough to slow decisions.

This system uses contrast, typography weight, and intentional motion to communicate progress and confidence. Motion is a structural language in FinnWeb, it reveals hierarchy, confirms state changes, and guides action flow from build to publish.

The system explicitly rejects generic template-marketplace aesthetics, overloaded SaaS dashboards, and heavy decorative animation that harms responsiveness. It also rejects low-contrast bright-on-bright marketing surfaces.

**Key Characteristics:**
- Thai-first readability with Kanit and spacious line-height.
- Deep-space dark surfaces with focused Ignite Orange action cues.
- Motion as hierarchy and feedback, not decorative spectacle.
- Premium polish with conversion-first information density.

## 2. Colors

FinnWeb’s palette is a committed dark system with one dominant ignition accent and one support highlight.

### Primary
- **Ignite Orange** (`#FF8C00`): Primary CTA color, publish actions, selected emphasis, and high-intent interaction targets.

### Secondary
- **Solar Flare** (`#FFD700`): Highlight markers, badge accents, and supportive attention cues near key flows.

### Neutral
- **Deep Space** (`#1A1C23`): Global application background and default dark canvas.
- **Surface Gray** (`#2D2F39`): Cards, panels, and elevated utility containers.
- **Panel Night** (`#252833`): Secondary surfaces and popover-style regions.
- **Cloud White** (`#F9FAFB`): Primary text and high-contrast foreground content.
- **Slate Gray** (`#9CA3AF`): Secondary text, supporting labels, and softer UI boundaries.

**The Controlled Flame Rule.** Ignite Orange is reserved for actions and decisive states. If everything is orange, nothing is important.

## 3. Typography

**Display Font:** Kanit (fallback: sans-serif)  
**Body Font:** Kanit (fallback: sans-serif)  
**Label/Mono Font:** Geist Mono for code-like UI details, Kanit for labels

**Character:** Geometric, modern, and direct, tuned for Thai readability and business confidence.

### Hierarchy
- **Display** (700, `2.25rem`, `1.2`): Hero and major section statements.
- **Headline** (600, `1.5rem`, `1.3`): Major panel titles and conversion-critical headings.
- **Title** (600, `1.125rem`, `1.4`): Component titles and prominent control labels.
- **Body** (400, `1rem`, `1.7`): Main reading copy, helper text, and guidance. Thai-heavy text must keep this breathing room.
- **Label** (600, `0.75rem`, `1.4`, `0.12em`): Uppercase utility labels and micro-state indicators.

**The Thai Clarity Rule.** Thai text is never compressed. Preserve line-height and avoid dense blocks that clip legibility.

## 4. Elevation

FinnWeb uses restrained elevation with tonal layering first and shadow second. Depth is mostly created through surface color steps and subtle border separation, then reinforced by soft shadow for isolated preview canvases and focused zones.

### Shadow Vocabulary
- **Canvas Lift** (`0 25px 50px -12px rgb(0 0 0 / 0.2)`): Large editor preview surfaces that should sit above the workspace shell.
- **Ambient Glow** (`0 0 15px rgba(255,140,0,0.4)`): Primary action hover emphasis where confidence cues matter.

**The Flat-Until-Needed Rule.** Default surfaces stay quiet. Elevation appears to clarify interaction priority, not to decorate.

## 5. Components

### Buttons
- **Shape:** Soft geometric corners (`0.625rem`) for primary actions, tighter corners (`0.375rem` to `0.5rem`) for compact controls.
- **Primary:** Ignite Orange fill (`#FF8C00`) with Cloud White text (`#F9FAFB`), medium padding (`0.5rem 1rem`), semibold weight.
- **Hover / Focus:** Slight color lift (for example `#FF9F1A`) plus smooth timing with exponential-style easing.
- **Secondary / Ghost:** Dark translucent surfaces with soft borders (`white/10`-like treatment) and stronger hover contrast.

### Chips
- **Style:** Neutral dark chip backgrounds with subtle border and compact uppercase or short-label text.
- **State:** Selected chips increase contrast and may pull Solar Flare or Ignite Orange accents for state clarity.

### Cards / Containers
- **Corner Style:** Rounded medium-large (`0.625rem`) across panel and card surfaces.
- **Background:** Surface Gray and Panel Night layered over Deep Space.
- **Shadow Strategy:** Mostly border + tonal depth; shadows used selectively on large focus regions.
- **Border:** Soft semi-transparent Slate Gray boundaries for structure without noise.
- **Internal Padding:** Most cards use `1rem` to `1.5rem` spacing bands.

### Inputs / Fields
- **Style:** Deep-space backgrounds with soft border and Cloud White text.
- **Focus:** Border emphasis shifts toward Ignite Orange with visible ring support.
- **Error / Disabled:** Error uses danger red accents; disabled reduces contrast but preserves readability.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.** Navigation uses dark stacked surfaces, compact icon+label groupings, and clear active states via contrast plus orange-led cues.

## 6. Do's and Don'ts

### Do:
- **Do** keep Deep Space (`#1A1C23`) as default app canvas unless a product decision changes the baseline.
- **Do** use Kanit as primary Thai-support typography and preserve body line-height around `1.7`.
- **Do** use motion to reveal hierarchy, confirm actions, and guide progression through build and publish steps.
- **Do** keep primary accents concentrated on conversion and decision points.

### Don't:
- **Don't** use generic template-marketplace aesthetics that make FinnWeb feel interchangeable.
- **Don't** create overloaded SaaS dashboards where visual effects compete with user tasks.
- **Don't** ship slow or heavy animation patterns that reduce responsiveness or block comprehension.
- **Don't** use bright-on-bright low-contrast surfaces that weaken readability on mobile.
