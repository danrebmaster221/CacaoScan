# Design System (DESIGN) - CacaoScan

This document defines the strict, cohesive design language for both the CacaoScan React Native (Mobile) and React JS (Web) interfaces, explicitly preventing generic, inconsistent UI behaviors.

## 1. Branding Identity
- **Personality:** Agri-Tech, precise, robust, and highly accessible.
- **Voice:** Professional, concise, data-driven.
- **Assets:** Minimalist vectors.

## 2. Theme & Colors
Our interfaces prioritize extreme readability under varying lighting conditions (e.g., bright sunlight on a farm vs. dark processing sheds).

*Primary Colors:*
- **Cacao Primary:** `#6D4C41` (Deep Brown)
- **Cacao Accent:** `#D7CCC8` (Soft Earth)

*Semantic Colors:*
- **Success (Accept/Online):** `#4CAF50` (Green)
- **Warning (Needs Drying/Degraded Ping):** `#FFC107` (Amber)
- **Error/Reject (Emergency Stop):** `#F44336` (Red)
- **Info (Analytics):** `#2196F3` (Blue)

*Neutrals (Dark Mode Focused per ISO standards):*
- **Background (Dark):** `#121212` 
- **Surface (Dark):** `#1E1E1E`
- **Text (Primary):** `#FFFFFF`
- **Text (Secondary):** `#B0BEC5`

## 3. Typography
- **Primary Font Family:** `Inter` (sans-serif) for high legibility on small dashboards.
- **Typography Scale:**
  - `H1`: 2rem (32px), `font-bold` for Screen Titles.
  - `H2`: 1.5rem (24px), `font-semibold` for Section Headers.
  - `Body`: 1rem (16px), `font-normal` for general information.
  - `Caption`: 0.75rem (12px), `font-medium` for timestamps and telemetry labels.

## 4. Spacing System
Strict adherence to an 8px (0.5rem) Tailwind baseline grid.
- `Space-2` (8px): Inside components (e.g., between icon and text).
- `Space-4` (16px): Standard component padding.
- `Space-6` (24px): Standard gap between list items.
- `Space-8` (32px): Major layout separations (e.g., between distinct sections).

## 5. Animations
Transitions must feel instantaneous and highly responsive.
- **Standard Transition:** 200ms `ease-in-out` (used for hovers, button presses, and tab switches).
- **Telemetry Pulses:** 1000ms infinite gentle pulse for active connection indicators (e.g., "Edge Connected" green dot).
- Avoid slow fades or bouncy spring animations that falsely imply system sluggishness.

## 6. Accessibility (a11y)
- **Contrast Ratios:** All text over backgrounds must meet WebAIM WCAG 2.1 AA standards (minimum 4.5:1 ratio).
- **Touch Targets:** Minimum 48x48 points on mobile for gloved operation by farmers.
- **Feedback:** Haptic feedback on all critical control operations (e.g., Starting the belt, engaging the E-Stop).
