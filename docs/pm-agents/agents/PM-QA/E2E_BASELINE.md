# E2E Test Suite Baseline Report

> **Generated:** 2026-02-06 (Updated 2026-02-07)  
> **PM-QA Development Cycle:** #9  
> **Task:** QA-002

---

## Executive Summary

The Smart Agent E2E test suite contains **12 spec files** with **205 total test cases** across **69 describe blocks**. The suite uses Playwright with a well-structured helper system (29 functions in `tests/e2e/helpers/`). No hardcoded URLs were found — all tests properly use Playwright config `baseURL`. Several quality issues were identified and categorized below.

---

## Inventory

### Spec Files (12)

| Spec File | Tests | Describes | Priority | Status |
|-----------|-------|-----------|----------|--------|
| comprehensive-feature-tests.spec.ts | 70 | 17 | P0 | New — best practices |
| billing.spec.ts | 21 | 9 | P0/P1 | Needs hardening |
| settings.spec.ts | 20 | 8 | P0/P1 | Solid |
| onboarding.spec.ts | 16 | 7 | P0 | Solid |
| pipeline.spec.ts | 14 | 7 | P0 | Needs hardening |
| messages.spec.ts | 13 | 8 | P0 | Many skip conditions |
| ai-chat.spec.ts | 12 | 6 | P0 | Fixed (Cycle 8) |
| auth.spec.ts | 6 | 3 | P0 | Solid |
| contacts.spec.ts | 5 | 1 | P0/P1 | Needs data helpers |
| deals.spec.ts | 5 | 1 | P0/P1 | Needs data helpers |
| properties.spec.ts | 5 | 1 | P0/P1 | Needs data helpers |
| admin-agents-delete.spec.ts | 3 | 1 | P1 | Solid |
| **TOTAL** | **205** | **69** | | |

### Test Helper Infrastructure (29 functions)

| Helper File | Functions | Purpose |
|-------------|-----------|---------|
| fixtures/helpers.ts | 4 | Legacy: login, navigateTo, anyVisible, firstVisible |
| helpers/auth.helpers.ts | 4 | signIn, signUp, signOut, getAuthenticatedPage |
| helpers/data.helpers.ts | 4 | createContact, createDeal, createProperty, uploadDocument |
| helpers/navigation.helpers.ts | 11 | goToHome, goToContacts, goToDeals, etc. |
| helpers/assertions.helpers.ts | 10 | expectToast, expectTableRow, expectNoErrors, etc. |
| helpers/index.ts | — | Barrel re-export of all helpers |

### Playwright Configuration

- **Test directory:** `./tests/e2e`
- **Base URL:** `http://localhost:8081` (via `process.env.TEST_BASE_URL`)
- **Web server:** Auto-starts `npm run dev -- --port 8081`
- **Projects:** chromium (desktop), mobile-chrome (Pixel 5)
- **Reporters:** HTML, JSON, list
- **Retries:** 0 local, 2 in CI
- **Artifacts:** Screenshots on failure, video on failure, trace on first retry

---

## Issues Found

### Critical (P0) — Affect test reliability

**1. Excessive `waitForTimeout` (89 instances across 10 specs)**
- Files: ai-chat (19), billing (19), pipeline (15), messages (13), onboarding (8), settings (8), comprehensive (3), contacts (2), auth (1), deals (1)
- Impact: Tests are slow and flaky — arbitrary delays may be too short (flaky) or too long (slow)
- Fix: Replace with `waitForLoadState`, `waitForSelector`, or event-based waits

**2. Vacuous test passing (silent green on empty data)**
- Files: deals.spec.ts, pipeline.spec.ts, properties.spec.ts
- Impact: Tests use `if (count > 0)` guards that silently pass when no data exists
- Fix: Use `test.skip()` explicitly or create test data in `beforeEach` using data helpers

**3. Data dependency in messages**
- File: messages.spec.ts
- Impact: 7 of 13 tests have `test.skip('No conversations available')` — over 50% may skip
- Fix: Create test conversations in `beforeAll` setup

### High (P1) — Affect test quality

**4. Soft assertions that always pass**
- File: billing.spec.ts
- Impact: Patterns like `if (X) expect(X) else true` provide no real validation
- Fix: Add meaningful fallback assertions (partially fixed in Cycle 8)

**5. Brittle selectors**
- Files: contacts.spec.ts (line 77), pipeline.spec.ts
- Impact: `table tbody tr first() button first()` chains break if layout changes
- Fix: Use `data-testid` attributes or more specific role queries

**6. Old helpers not migrated**
- Files: 11 of 12 original specs
- Impact: Original specs use `fixtures/helpers` instead of new typed `helpers/` system
- Fix: Migrate to new typed helpers (see QA-013)

### Medium (P2) — Improvement opportunities

**7. User-specific assertions**
- File: comprehensive-feature-tests.spec.ts (line 437)
- Impact: Hardcoded `'Sam Irizarry'` text will fail for other test accounts
- Fix: Use `TEST_USER_NAME` env var or regex pattern

**8. No test data cleanup**
- Files: All specs that create data
- Impact: Tests create contacts/deals/properties but never clean up
- Fix: Add `afterEach`/`afterAll` cleanup or use unique test data

---

## Fixes Already Applied (Cycle 8-9)

| Fix | File | Description |
|-----|------|-------------|
| Offline test ordering | ai-chat.spec.ts | Navigate page while online, THEN go offline |
| Meaningful assertion | ai-chat.spec.ts | Replace always-true assertion with real check |
| Button state validation | billing.spec.ts | Replace always-true assertion with actual validation |
| Timestamp test assertion | messages.spec.ts | Replace no-op expect(true) with real check |
| Test count comment | comprehensive-feature-tests.spec.ts | Updated count from 55 to 70 (actual) |
| Duplicate variable | messages.spec.ts | Renamed duplicate `const messageInput` to `msgInput` in timestamps test (line 207) — was a compile error |

---

## waitForTimeout Distribution (Flakiness Risk)

| Spec File | Count | Risk |
|-----------|-------|------|
| ai-chat.spec.ts | 19 | HIGH |
| billing.spec.ts | 19 | HIGH |
| pipeline.spec.ts | 15 | HIGH |
| messages.spec.ts | 13 | HIGH |
| onboarding.spec.ts | 8 | MEDIUM |
| settings.spec.ts | 8 | MEDIUM |
| comprehensive-feature-tests.spec.ts | 3 | LOW |
| contacts.spec.ts | 2 | LOW |
| auth.spec.ts | 1 | LOW |
| deals.spec.ts | 1 | LOW |
| **Total** | **89** | |

---

## Test Coverage Assessment

### Well Covered

- **Authentication** (login/signup) — auth.spec.ts + comprehensive
- **Onboarding wizard** — all 4 steps tested end-to-end
- **AI Chat** — send, receive, streaming, error handling, keyboard shortcuts
- **Pipeline/Deals** — CRUD, stage transitions, milestones, kanban + mobile layout
- **Settings** — all 5 tabs (profile, notifications, appearance, security, more)
- **Billing** — plan display, Stripe checkout flow, usage tracking
- **Navigation/Layout** — all sidebar links, user menu, a11y skip link
- **Dashboard Widgets** — stats, quick actions, prompts, activity feed
- **Dark Mode** — toggle, persist, settings appearance cards
- **Search/Discovery** — global search, entity filters, Cmd+K shortcut

### Missing Coverage (Gaps)

| Feature | Priority | Notes |
|---------|----------|-------|
| Document upload & indexing | P0 | Only page-load tested, no actual upload E2E |
| Document chat (RAG) | P0 | Multi-document Q&A not tested |
| Contact editing/deletion | P1 | Only create tested |
| Deal editing/deletion | P1 | Only create tested |
| Property editing/deletion | P1 | Only create tested |
| Workspace switching | P1 | Multi-tenant flows not tested |
| Real-time messaging (2-user) | P2 | Requires dual browser context |
| File attachments in messages | P2 | Button existence tested only |
| Stripe webhook handling | P2 | Backend-only, needs integration tests |
| Mobile-specific interactions | P2 | Some viewport tests, no touch/gesture |
| Error boundary recovery | P2 | No tests for app crash recovery |
| Accessibility (a11y) audit | P2 | Skip-to-content tested, no axe audit |

---

## Recommended Next Steps

### Immediate (This Cycle)
1. **QA-010**: Audit and fix flaky tests — focus on 89 `waitForTimeout` calls
2. **QA-013**: Migrate original specs to use new typed helpers

### Next Cycle
3. Add document upload + indexing E2E tests (P0 gap)
4. Add test data setup/teardown in `beforeAll`/`afterAll` for messages.spec.ts
5. Add contact/deal/property edit and delete tests

### Future
6. Visual regression testing (QA-006)
7. Accessibility audit with `@axe-core/playwright`
8. Performance budget testing

---

## Test Count by Category

| Category | Tests | Pct |
|----------|-------|-----|
| Pipeline & Deals | 30 | 14.6% |
| Navigation & Layout | 28 | 13.7% |
| Billing | 22 | 10.7% |
| AI Chat | 20 | 9.8% |
| Settings | 29 | 14.1% |
| Messages | 17 | 8.3% |
| Onboarding | 16 | 7.8% |
| Dashboard & Widgets | 10 | 4.9% |
| Authentication | 11 | 5.4% |
| Contacts | 9 | 4.4% |
| Properties | 7 | 3.4% |
| Search/Discovery | 4 | 2.0% |
| Admin | 4 | 2.0% |
| Documents | 2 | 1.0% |
| Dark Mode | 6 | 2.9% |
| **Total** | **205** | **100%** |
