---
name: smart-agent-mobile-ios
description: Apply iOS Human Interface Guidelines principles to mobile-responsive web design for Smart Agent
---

# Mobile iOS Design

**When to Use:** Apply iOS Human Interface Guidelines principles to mobile-responsive web design. Use when improving mobile UX, creating touch-friendly interfaces, or ensuring the web app feels native-like on iOS devices.

## Key Principles (adapted for React/Tailwind)

### 1. Clarity, Deference, Depth
- Content-first design with subtle UI elements
- Visual hierarchy through shadows, spacing, typography
- Touch targets minimum 44x44px (use `min-h-11 min-w-11` in Tailwind)

### 2. Mobile-Responsive Patterns
- Use `sm:`, `md:`, `lg:` breakpoints for adaptive layouts
- Stack vertically on mobile, horizontal on desktop
- Bottom navigation on mobile (fixed footer), sidebar on desktop
- Full-screen modals on mobile, dialog sheets on desktop

### 3. iOS-Inspired Components
- Card-based layouts with rounded corners (`rounded-xl`, `rounded-2xl`)
- Subtle shadows (`shadow-sm`, `shadow-md`)
- System-style lists with dividers
- Pull-to-refresh patterns where applicable
- Swipe gestures for actions (delete, archive)

### 4. Typography & Spacing
- Use semantic heading hierarchy (`text-2xl font-semibold` for h1)
- Comfortable touch spacing (`space-y-4`, `gap-4` minimum)
- Line height 1.5+ for readability on small screens
- 16px minimum font size to prevent iOS zoom

### 5. Dark Mode Support
- Already using Tailwind dark mode variants
- Follow iOS dark mode color semantics (elevated surfaces, reduced contrast)
- Test all components in both modes

### 6. Touch-Friendly Interactions
- Generous padding on buttons (`px-6 py-3` minimum)
- Clear active/pressed states (`:active` styles)
- Avoid hover-only interactions on mobile
- Use native scrolling (avoid custom scrollbars)

## Implementation Checklist
- [ ] Mobile viewport meta tag in index.html
- [ ] Touch target sizes ≥44px
- [ ] Horizontal scroll areas use `-webkit-overflow-scrolling: touch`
- [ ] Fixed bottom navigation on mobile screens
- [ ] Modals use full screen on mobile (`sm:max-w-lg` for desktop dialog)
- [ ] Form inputs have proper input types (`type="email"`, `type="tel"`)
- [ ] Disable zoom on inputs (16px min font-size)
- [ ] Test on real iOS devices (Safari, not just Chrome DevTools)

**Note:** This skill provides iOS HIG principles. Since Smart Agent is a React web app (not native SwiftUI), apply the design principles and interaction patterns to our Tailwind/shadcn components rather than using SwiftUI code directly.
