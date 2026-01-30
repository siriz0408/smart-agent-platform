---
name: smart-agent-mobile-android
description: Apply Material Design 3 principles for Android-optimized mobile experiences in Smart Agent
---

# Mobile Android Design

**When to Use:** Apply Material Design 3 principles for Android-optimized mobile experiences. Use when implementing Android-friendly UI patterns, ensuring cross-platform mobile consistency, or following Material Design guidelines for web.

## Key Principles (adapted for React/Tailwind)

### 1. Material Design 3 Core Concepts
- **Personalization**: Adaptive theming (already using Tailwind dark mode)
- **Accessibility**: High contrast ratios, clear touch targets
- **Responsive**: Layouts adapt to phones, tablets, foldables

### 2. Material Components (shadcn/ui equivalents)
- Cards: Use `Card` component with `rounded-xl` or `rounded-2xl`
- Buttons: Primary (default), Tonal (secondary), Outlined, Text (ghost)
- FABs: Fixed positioned buttons with `rounded-full` (e.g., Add button)
- Navigation: Bottom nav on mobile, side drawer on desktop
- Dialogs/Sheets: Use `Dialog` or `Sheet` components

### 3. Touch Targets & Spacing
- Minimum 48px (12 Tailwind units) for all interactive elements
- Use `h-12 w-12` minimum for icon buttons on mobile
- Comfortable spacing: `space-y-4` (16px) or `gap-4` between touch elements
- Padding on cards/containers: `p-4` (16px) minimum

### 4. Material Typography Scale
- Display: `text-5xl` (57px) for hero text
- Headline: `text-3xl` (30px) for page titles
- Title: `text-xl` (20px) for card headers
- Body: `text-base` (16px) for content
- Label: `text-sm` (14px) for buttons, badges

### 5. Material Color System
- Primary: Main brand actions (Tailwind `bg-primary`, `text-primary`)
- Secondary: Supporting actions (Tailwind `bg-secondary`)
- Surface variants: `bg-muted`, `bg-accent` for elevated cards
- On-surface variants: `text-muted-foreground`, `text-accent-foreground`

### 6. Android-Specific Patterns
- **Bottom Navigation**: Fixed `bottom-0` nav bar on mobile (`md:hidden`)
- **FAB Positioning**: `fixed bottom-20 right-6` (above bottom nav)
- **Top App Bar**: Sticky header with menu/back button on left
- **Navigation Drawer**: Sheet sliding from left with menu items
- **Swipe Actions**: Use gesture libraries for swipe-to-delete

### 7. Adaptive Breakpoints
- **Compact** (< 640px): Single column, bottom nav, full-screen modals
- **Medium** (640-1024px): Two columns, side nav, dialog modals
- **Expanded** (> 1024px): Multi-column, persistent nav, popovers

## Implementation Checklist
- [ ] Bottom navigation bar on mobile screens (hidden on desktop)
- [ ] FAB for primary actions on mobile
- [ ] Card elevations using `shadow-md` or `shadow-lg`
- [ ] Ripple effects on buttons (use `:active:scale-95` transform)
- [ ] System back button support (browser back)
- [ ] Gesture-friendly lists (swipe actions where appropriate)
- [ ] Material color tokens in Tailwind config
- [ ] 48px minimum touch targets on mobile
- [ ] Test on real Android devices (Chrome mobile, not just DevTools)

## Material Design Resources
- [Material Design 3](https://m3.material.io/)
- [Material Web Components](https://material-web.dev/)
- [Tailwind Material Colors](https://tailwindcss.com/docs/customizing-colors)

**Note:** This skill provides Material Design 3 / Jetpack Compose patterns for native Android. Adapt the design system, component hierarchy, and interaction patterns to our React/Tailwind stack using shadcn/ui components as Material Design equivalents.
