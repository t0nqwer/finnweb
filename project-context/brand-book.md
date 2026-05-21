# FinnWeb Brand Book & UI System

## Product Overview

FinnWeb is a high-speed SaaS website and landing page builder designed for the Thai market. It allows users to create, publish, and monetize websites quickly without coding, focusing on lead generation and simplicity.

## Visual Identity

### 1. Logo and Symbol

- Icon: The "Spark" F (Flame/Wing) represents speed and ignition.
- Logotype: Finn (Orange/Italic) + Web (White).
- Favicon: Use the F-icon on a #1A1C23 background.

### 2. Color Palette

| Element       | Hex Code | Purpose                               |
| :------------ | :------- | :------------------------------------ |
| Ignite Orange | #FF8C00  | Primary Branding, Primary Buttons     |
| Solar Flare   | #FFD700  | Highlights, Gradients, Success States |
| Deep Space    | #1A1C23  | Main UI Background (Dark Mode)        |
| Surface Gray  | #2D2F39  | Cards, Inputs, Section Backgrounds    |
| Cloud White   | #F9FAFB  | Primary Text                          |
| Slate Gray    | #9CA3AF  | Secondary Text, Borders               |

### 3. Typography (Thai Support)

- Primary Font: Kanit (Loopless/ไม่มีหัว)
- Vibe: Geometric, Modern, Professional.
- Line Height: Minimum 1.7 for Thai characters to prevent vowel clipping.
- Weights:
  - Bold (700): Headings
  - SemiBold (600): Sub-headers / Buttons
  - Regular (400): Body Text
  - Light (300): Captions

## UI Component Specifications

### 1. Primary Action Button

- Background: linear-gradient(to right, #FF8C00, #FF4500)
- Border Radius: 8px
- Text: White, Kanit SemiBold
- Effect: Subtle outer glow on hover (0 0 15px rgba(255,140,0,0.4))

### 2. Section Cards (Dashboard)

- Background: #2D2F39
- Border: 1px solid #3F4251
- Active State: Left-side accent border in Ignite Orange (4px).

### 3. Lead Notification (LINE Style)

- Header: FinnWeb Logotype
- Body: Kanit Regular
- Content: Name, Email, Phone, Timestamp.
- Call to Action: "View Dashboard" button.

## Tech Stack for AI Agents

- Frontend: Next.js (App Router), TailwindCSS.
- Backend: NestJS (Fastify), PostgreSQL, Prisma.
- Storage: S3-compatible (DigitalOcean Spaces).
- Integration: LINE OA (Priority for Thai leads).

## Core User Flow

1. Ignite: User registers and creates a workspace.
2. Build: User adds sections (Hero, Form, CTA) via JSON-based editor.
3. Launch: One-click publish to a `*.finnweb.site` subdomain (or `/s/sitename`).
4. Convert: Visitors submit forms; User receives real-time LINE/Email alerts.
5. Scale: User upgrades to PRO for custom domains and unlimited sites.

## AI Implementation Rules

- MVP Only: Do not build blogs or e-commerce yet.
- Speed First: Use pre-defined JSON schemas for sections.
- Thai-Centric: Ensure all placeholder text is in Thai using the Kanit font.
- Dark Mode Default: All UI components must default to the Deep Space theme.
