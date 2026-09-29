---
name: Fidelity Modern
colors:
  surface: '#f9f9ff'
  surface-dim: '#d7dae3'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3fc'
  surface-container: '#ebedf7'
  surface-container-high: '#e6e8f1'
  surface-container-highest: '#e0e2eb'
  on-surface: '#181c22'
  on-surface-variant: '#414753'
  inverse-surface: '#2d3037'
  inverse-on-surface: '#eef0fa'
  outline: '#717785'
  outline-variant: '#c1c6d5'
  surface-tint: '#005db8'
  primary: '#005ab4'
  on-primary: '#ffffff'
  primary-container: '#0a73e0'
  on-primary-container: '#fefcff'
  inverse-primary: '#aac7ff'
  secondary: '#465f88'
  on-secondary: '#ffffff'
  secondary-container: '#b6d0ff'
  on-secondary-container: '#3f5881'
  tertiary: '#964400'
  on-tertiary: '#ffffff'
  tertiary-container: '#bd5700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00458d'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aec7f7'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#2d476f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#763400'
  background: '#f9f9ff'
  on-background: '#181c22'
  surface-variant: '#e0e2eb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

# Design System - Fidelity Modern

## Brand & Style
The design system adopts a **Corporate / Modern** aesthetic, utilizing the **Inter** font family to project reliability, precision, and clarity. The visual tone is structured and professional, with a light color mode foundation that emphasizes usability and clean hierarchy.

## Colors
The palette is built for clarity and professional execution under a **light** color mode:
- **Primary (`#1275e2`)**: A vibrant, reliable blue serving as the core interactive and brand accent.
- **Secondary (`#5f78a3`)**: A muted slate blue providing balanced support for secondary actions and subtle containers.
- **Tertiary (`#c55b00`)**: A warm accent tone used sparingly for highlighting specific calls to action or states.
- **Neutral (`#74777f`)**: A cool neutral used for text, borders, and background structures.

## Typography
Typography relies entirely on **Inter** to ensure maximum legibility across all form factors. Headings use medium-to-semibold weights for strong structural presence, while body and label styles prioritize high readability and neutral proportions.

## Layout & Spacing
Using a structured spacing scale (level 2), layouts rely on a consistent 8px-grid derivative. Gutters are standardized at `1rem` and outer margins at `1.5rem`, ensuring clean breathing room across mobile, tablet, and desktop viewports.

## Elevation & Depth
Elevation is achieved through a combination of tonal layering and soft ambient shadows. Surfaces use subtle differences in neutral shades to define hierarchy, supplemented by crisp, clean borders where separation is necessary.

## Shapes
A moderate **roundedness level (2)** is applied across the system. UI components feature a baseline `0.5rem` border radius, creating a friendly yet professional corporate look without leaning into overly playful or sharp geometry.

## Components
- **Buttons:** Styled with primary or secondary fills, featuring roundedness level 2 corners (`0.5rem`) and clear Inter labels.
- **Cards & Containers:** Clean background fills with subtle tonal contrast and soft borders.
- **Input Fields:** Outlined or filled text fields utilizing the neutral color palette with distinct focus states in the primary blue (`#1275e2`).
- **Chips & Badges:** Compact elements utilizing secondary or tertiary highlights for tagging and status.