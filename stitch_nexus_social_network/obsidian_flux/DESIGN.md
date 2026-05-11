---
name: Obsidian Flux
colors:
  surface: '#0f1419'
  surface-dim: '#0f1419'
  surface-bright: '#353a3f'
  surface-container-lowest: '#0a0f14'
  surface-container-low: '#181c21'
  surface-container: '#1c2025'
  surface-container-high: '#262a30'
  surface-container-highest: '#31353b'
  on-surface: '#dfe3ea'
  on-surface-variant: '#bfc7d3'
  inverse-surface: '#dfe3ea'
  inverse-on-surface: '#2c3136'
  outline: '#89919d'
  outline-variant: '#3f4851'
  surface-tint: '#99cbff'
  primary: '#99cbff'
  on-primary: '#003354'
  primary-container: '#1d9bf0'
  on-primary-container: '#003050'
  inverse-primary: '#00629d'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#ffb875'
  on-tertiary: '#4b2800'
  tertiary-container: '#db7e00'
  on-tertiary-container: '#472500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#99cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a78'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdcc0'
  tertiary-fixed-dim: '#ffb875'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6b3b00'
  background: '#0f1419'
  on-background: '#dfe3ea'
  surface-variant: '#31353b'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1rem
  container-max-width: 600px
---

## Brand & Style

The design system is engineered for high-velocity information consumption with a focus on cinematic density. It targets a tech-literate audience that values efficiency and visual clarity. The personality is sophisticated, nocturnal, and authoritative.

The design style is a hybrid of **Minimalism** and **High-Contrast Modernism**. By stripping away unnecessary ornamentation and relying on absolute black backgrounds, the interface allows content to "float" with maximum legibility. It takes the familiar structural DNA of real-time social feeds and refines it through generous negative space and a disciplined, monochromatic foundation punctuated by high-energy accents.

## Colors

The palette is built on a "True Dark" philosophy. The base layer uses absolute black (#000000) to ensure infinite contrast on OLED displays and to eliminate visual noise. 

- **Primary Accent:** A vibrant, high-luminance blue used exclusively for primary actions and active states.
- **Surface Elevation:** Dark gray (#16181c) provides subtle separation for containers and cards.
- **Hierarchy:** Text follows a strict two-tier system—stark white for readability and muted gray for metadata and secondary information.
- **Structural Lines:** Borders are kept thin and low-contrast (#2f3336) to maintain structure without creating visual clutter.

## Typography

This design system utilizes **Inter** for its entire typographic scale to maintain a systematic, utilitarian aesthetic. 

The type hierarchy is optimized for rapid scanning. Headlines use tighter letter spacing and heavier weights to feel "bolted down" to the grid. Body text is set at 15px—a slightly larger-than-standard size—to improve readability against the high-contrast dark background. Muted gray text is never used below 13px to ensure accessibility standards are met.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model for the primary content feed to ensure a focused, column-based reading experience. 

- **Feed Width:** Centered 600px main column, inspired by newsroom editorial layouts.
- **Spacing Rhythm:** A 4px baseline grid governs all padding and margins. 
- **Density:** While the design is "airy," information density is maintained through tight 12px gutters between related elements (like profile images and post content) and larger 20px margins between distinct feed items.

## Elevation & Depth

This design system eschews traditional shadows in favor of **Tonal Layers** and **Subtle Outlines**. 

Depth is communicated through color-stepping:
1. **Level 0 (Background):** #000000 - The canvas.
2. **Level 1 (Surface):** #16181c - Cards, sidebars, and input fields.
3. **Level 2 (Interaction):** #2f3336 - Hover states and divider lines.

To maintain the minimalist aesthetic, use 1px solid borders (#2f3336) for all containers. Avoid blurs or glows unless used for specific "Power User" notifications or active primary buttons.

## Shapes

The shape language is controlled and geometric. A standard **8px (0.5rem)** radius is applied to cards and containers to soften the high-contrast edges. 

Interactive elements like buttons and search bars utilize **Pill-shapes (Full Rounding)** to distinguish them from structural content blocks. This creates a clear visual affordance: "Organic/Rounded" means action, while "Geometric/Square-ish" means information.

## Components

### Buttons
- **Primary:** Pill-shaped, #1d9bf0 background, white text, bold weight. No border.
- **Secondary:** Pill-shaped, transparent background, white text, 1px border (#2f3336).
- **Ghost:** Pill-shaped, no background or border, primary blue text. Used for less critical actions like "Reply."

### Cards & Feed Items
- Background: #000000 (standard post) or #16181c (quoted content).
- Border-bottom: 1px solid #2f3336.
- Padding: 16px (1rem).

### Inputs
- Background: #16181c.
- Border: 1px solid transparent; transitions to 1px solid #1d9bf0 on focus.
- Placeholder text: #71767b.

### Chips & Tags
- Height: 32px.
- Background: #16181c.
- Border: 1px solid #2f3336.
- Text: 13px, white.

### Lists & Navigation
- Icons: 24px, 2px stroke width.
- Active State: Primary blue icon/text with a subtle weight increase.
- Hover State: A circular #16181c background wash behind icons.