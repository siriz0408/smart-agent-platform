# PM-Experience Backlog

> **Last Updated:** 2026-02-05

---

## In Progress

| ID | Item | Priority |
|----|------|----------|
| EXP-001 | Initial domain audit | P0 |

---

## Ready

These tasks are ready for autonomous execution:

### EXP-002: Document UI Component Inventory
**Priority:** P0 | **Effort:** S

**Objective:** Create an inventory of all UI components.

**Files to Read:**
- `src/components/ui/*` (all files)
- `src/components/layout/*`

**Deliverable:**
Create `docs/pm-agents/agents/PM-Experience/COMPONENT_INVENTORY.md` with:
- List of all components in `src/components/ui/`
- Their props/interfaces
- Usage examples from codebase

**Acceptance Criteria:**
- [ ] All UI components listed
- [ ] Props documented
- [ ] File committed

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

### EXP-005: Improve loading states with skeletons
**Priority:** P2 | **Effort:** M

**Objective:** Add skeleton loading states to main data pages.

**Files to Edit:**
- `src/pages/Contacts.tsx`
- `src/pages/Properties.tsx`

**Task:**
1. Import Skeleton component from shadcn
2. Show skeleton while data is loading
3. Replace spinner with skeleton layout

**Acceptance Criteria:**
- [ ] Skeleton shows during load
- [ ] Looks appropriate for content
- [ ] Tests pass

---

## Backlog

| ID | Item | Priority | Notes |
|----|------|----------|-------|
| EXP-006 | Full accessibility audit | P2 | Comprehensive |
| EXP-007 | Dark mode toggle | P3 | User request |
| EXP-008 | Animation polish | P3 | Delight |

---

## Completed

| ID | Item | Completed |
|----|------|-----------|
| EXP-000 | PM-Experience setup | 2026-02-05 |
