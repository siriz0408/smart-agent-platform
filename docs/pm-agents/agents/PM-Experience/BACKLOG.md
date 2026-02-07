# PM-Experience Backlog

> **Last Updated:** 2026-02-06 (Cycle 8)

---

## In Progress

| ID | Item | Priority |
|----|------|----------|
| EXP-001 | Initial domain audit | P0 |

## Completed ✅

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| EXP-007 | Dark mode toggle | 2026-02-06 | Full dark mode with light/dark/system support. ThemeProvider context, ThemeToggle in header, Settings appearance tab with visual selector, FOUC prevention, Sonner toast integration. Tailwind `class` strategy + CSS variable system. |
| EXP-002 | Document UI Component Inventory | 2026-02-06 | Created comprehensive inventory with 50+ UI components and 7 layout components, including props, interfaces, and usage examples |
| EXP-005 | Improve loading states with skeletons | 2026-02-06 | Already implemented in Contacts.tsx and Properties.tsx |
| EXP-006 | Full accessibility audit | 2026-02-06 | Added aria-live regions for dynamic content (chat messages), aria-busy for loading states, aria-hidden for decorative skeletons. Enhanced WCAG 2.1 AA compliance across Home, Contacts, Properties, and Documents pages |
| EXP-009 | Dark mode contrast audit | 2026-02-07 | Comprehensive WCAG AA contrast audit for dark mode. Fixed `--muted-foreground` from 3.2:1 to 4.6:1. All color combinations now meet WCAG 2.1 AA standards. Report: `docs/pm-agents/reports/2026-02-07/pm-experience-exp009-dark-contrast-audit.md` |

---

## Ready

These tasks are ready for autonomous execution:

---

### EXP-003: Check and fix mobile padding issues
**Priority:** P0 | **Effort:** S

**Objective:** Ensure consistent mobile padding across main pages.

**Files to Review:**
- `src/components/layout/GleanSidebar.tsx`
- `src/pages/Home.tsx`
- `src/pages/Contacts.tsx`

**Task:**
1. Search for hardcoded padding/margin values
2. Ensure mobile breakpoints use `p-4` or smaller
3. Replace any `px-8` with responsive `px-4 md:px-8`

**Acceptance Criteria:**
- [ ] Mobile padding consistent
- [ ] No horizontal scroll on mobile
- [ ] Tests pass

---

### EXP-004: Add missing aria-labels to interactive elements
**Priority:** P1 | **Effort:** S

**Objective:** Improve accessibility by adding aria-labels.

**Files to Audit:**
- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/layout/GleanSidebar.tsx`

**Task:**
1. Find buttons without aria-label
2. Add descriptive aria-labels
3. Ensure dialogs have proper aria attributes

**Acceptance Criteria:**
- [ ] All interactive elements have aria-labels
- [ ] Linter passes

---

### EXP-005: Improve loading states with skeletons ✅ COMPLETED
**Priority:** P2 | **Effort:** M | **Completed:** 2026-02-06

**Objective:** Add skeleton loading states to main data pages.

**Status:** ✅ Already implemented in Contacts.tsx and Properties.tsx
- Contacts.tsx: Skeleton components used for stats cards, contact cards, table rows
- Properties.tsx: Skeleton components used for stats cards, property cards

**Verification:** Both files import and use `<Skeleton />` component appropriately

---

## Backlog

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| EXP-008 | Animation polish | P3 | Delight |
| EXP-010 | Remove unused next-themes dependency | P3 | Package.json still lists next-themes but it's no longer imported |

---

## Completed

| ID | Item | Completed |
|----|------|-----------|
| EXP-000 | PM-Experience setup | 2026-02-05 |
| EXP-002 | Document UI Component Inventory | 2026-02-06 |
| EXP-003 | Check and fix mobile padding issues | 2026-02-06 |
| EXP-005 | Improve loading states with skeletons | 2026-02-06 |
| EXP-006 | Full accessibility audit | 2026-02-06 |
| EXP-007 | Dark mode toggle | 2026-02-06 |
| HO-005 | Trial Signup UI | 2026-02-06 |