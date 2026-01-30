---
name: smart-agent-ui-ux
description: Generate comprehensive design systems, select color palettes, choose typography pairings, and get UX best practices (PRIMARY skill for UI/UX)
---

# UI/UX Pro Max

**When to Use:** Generate comprehensive design systems, select color palettes, choose typography pairings, and get UX best practices for UI components. Use when designing new pages, implementing UI improvements, or reviewing code for UX issues.

## Capabilities
- 50+ UI styles (glassmorphism, minimalism, brutalism, neumorphism, bento grid, etc.)
- 97 color palettes organized by product type
- 57 font pairings (Google Fonts)
- 99 UX guidelines (accessibility, touch, performance, layout)
- 25 chart types with recommendations
- 9 tech stacks (React, Next.js, Tailwind, shadcn/ui, etc.)

## Python CLI Tool Required

```bash
# Check Python installation
python3 --version  # macOS/Linux
# If not installed: brew install python3 (macOS)

# Skill location
~/.agents/skills/ui-ux-pro-max/scripts/search.py
```

## Primary Workflow

### Step 1: Generate Design System (Always Start Here)

```bash
# For Smart Agent real estate SaaS app
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "real estate SaaS professional AI assistant" \
  --design-system \
  -p "Smart Agent"

# Output: Complete design system with:
# - Product pattern (SaaS dashboard, landing page structure)
# - Style recommendation (minimalism, glassmorphism, etc.)
# - Color palette (primary, secondary, accent, backgrounds)
# - Typography pairing (heading + body fonts)
# - Visual effects (shadows, borders, spacing)
# - Anti-patterns to avoid
```

### Step 2: Persist Design System (Recommended)

```bash
# Create MASTER.md design system file
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "real estate SaaS professional AI assistant" \
  --design-system \
  --persist \
  -p "Smart Agent"

# Creates:
# - design-system/MASTER.md (global design rules)
# - design-system/pages/ (folder for page-specific overrides)

# Page-specific override example (if needed):
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "property search map listings" \
  --design-system \
  --persist \
  -p "Smart Agent" \
  --page "property-search"
# Creates: design-system/pages/property-search.md
```

**Hierarchical Retrieval Pattern:**
1. Building a specific page → Check `design-system/pages/[page-name].md` first
2. If page file exists → Use those rules (override Master)
3. If page file doesn't exist → Use `design-system/MASTER.md`

### Step 3: Domain-Specific Searches (As Needed)

```bash
# Get specific UX guidelines
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "animation accessibility touch" \
  --domain ux

# Get chart recommendations for analytics dashboard
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "real-time dashboard metrics" \
  --domain chart

# Get alternative typography options
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "professional elegant modern" \
  --domain typography \
  -n 5  # Return top 5 results

# Get color palette options
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "real estate professional trust" \
  --domain color
```

### Step 4: Stack-Specific Guidelines

```bash
# Get React + shadcn/ui best practices (our stack)
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "form modal dashboard" \
  --stack shadcn

# Get React performance guidelines
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "memo rerender virtualize" \
  --stack react
```

## Critical UX Rules (Priority 1-2)

### Accessibility (P1 - CRITICAL)
- ✅ Color contrast ≥4.5:1 for text (use Tailwind semantic colors)
- ✅ Focus states visible on all interactive elements
- ✅ Alt text on images (decorative images use empty alt="")
- ✅ ARIA labels on icon-only buttons
- ✅ Keyboard navigation works (tab order matches visual order)
- ✅ Form labels use `<label>` with `htmlFor` attribute

### Touch & Interaction (P2 - CRITICAL)
- ✅ Touch targets ≥44px (use `min-h-11 min-w-11`)
- ✅ Loading states on async buttons (disable + spinner)
- ✅ Error feedback near problem (inline form errors)
- ✅ Cursor pointer on clickable elements
- ❌ No hover-only interactions on mobile
- ✅ Primary interactions use click/tap, not hover

## Common Professional UI Issues to Avoid

| Issue | ❌ Don't | ✅ Do |
|-------|---------|------|
| **Emoji icons** | 🎨 🚀 ⚙️ in UI | Use Lucide icons (already using) |
| **Layout shift on hover** | `hover:scale-110` causing reflow | `hover:opacity-90` or color change |
| **Low contrast light mode** | `text-gray-400` on `bg-white` | `text-slate-700` minimum |
| **Invisible borders** | `border-white/10` in light mode | `border-gray-200` visible border |
| **Content behind navbar** | Fixed nav without padding compensation | Add `pt-16` for fixed header height |
| **Inconsistent spacing** | Mix of gap-2, gap-4, gap-6 randomly | Use design tokens: gap-4, gap-6, gap-8 |

## Smart Agent Current Design System

**Stack:** ✅ React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
**Style:** ✅ Modern minimalism with subtle shadows
**Colors:** ✅ Using Tailwind semantic colors (primary, secondary, muted, accent)
**Typography:** ✅ System fonts with Tailwind typography scale
**Components:** ✅ shadcn/ui (accessible, customizable)

## Design System Improvements Needed

```bash
# Generate comprehensive design system for Smart Agent
python3 ~/.agents/skills/ui-ux-pro-max/scripts/search.py \
  "real estate SaaS AI assistant professional modern" \
  --design-system \
  --persist \
  -p "Smart Agent" \
  -f markdown

# This will create design-system/MASTER.md with:
# - Recommended color palette for real estate SaaS
# - Typography pairing optimized for professional trust
# - Visual style (current: minimalism + subtle shadows)
# - Spacing/shadow/border tokens
# - Component design patterns
```

## Pre-Delivery UX Checklist (From Skill)

### Visual Quality
- [ ] No emojis as UI icons (use Lucide icons only)
- [ ] Consistent icon set across app
- [ ] Hover states don't shift layout
- [ ] Theme colors used correctly (bg-primary, text-muted-foreground)

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover/active states provide visual feedback
- [ ] Transitions smooth (150-300ms using Tailwind duration)
- [ ] Focus rings visible for keyboard users

### Light/Dark Mode
- [ ] Sufficient contrast in both modes (test with contrast checker)
- [ ] Glass/transparent cards visible in light mode
- [ ] Borders visible in both modes
- [ ] Colors adapt appropriately (semantic Tailwind classes)

### Layout
- [ ] Fixed elements have edge spacing (not stuck to edges)
- [ ] Content padding accounts for fixed headers
- [ ] Responsive at key breakpoints (375px, 768px, 1024px)
- [ ] No horizontal scroll on mobile

## Recommended Actions
1. Run design system generator for Smart Agent
2. Create design-system/MASTER.md for consistent reference
3. Define page-specific overrides for complex pages (property-search, ai-chat)
4. Apply professional UI rules to existing components
5. Validate against pre-delivery checklist before new feature releases

**Note:** This skill provides a searchable database with Python CLI for design system generation. Use it to **establish consistent design tokens** (colors, typography, spacing) and **validate UX quality** (accessibility, touch targets, performance). The design system generator creates reusable design documentation that ensures consistency across features.
