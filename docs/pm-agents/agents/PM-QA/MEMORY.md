# PM-QA Memory

> **Last Updated:** 2026-02-07 (Cycle 9)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**E2E Testing Pattern:**
- Playwright for browser automation
- Test helpers for common operations (29 functions)
- Fixtures for test data
- Page object pattern (future)

**QA Gate Pattern:**
- Post-cycle gate after development
- PASS/WARN/FAIL results
- Critical bugs block merge
- Non-critical bugs tracked

**Test Organization Pattern:**
- Tests in `tests/e2e/` directory
- Helpers in `tests/e2e/helpers/`
- Fixtures in `tests/e2e/fixtures/`
- Specs follow naming: `*.spec.ts`

### Common Issues & Solutions

**Issue:** Test data inconsistent
- **Solution:** Created 29 reusable test helpers
- **Pattern:** Centralize test utilities, reuse across tests

**Issue:** Tests flaky
- **Solution:** Add proper waits, use test helpers
- **Pattern:** Wait for elements, not arbitrary timeouts

**Issue:** Missing E2E coverage
- **Solution:** Document baseline coverage (205 tests)
- **Pattern:** Track coverage gaps, prioritize critical flows

### Domain-Specific Knowledge

**Test Types:**
- E2E tests (Playwright)
- Unit tests (Vitest) - future
- Integration tests (future)
- Performance tests (future)

**Test Helpers:**
- Auth helpers (login, logout, signup)
- Data helpers (create contact, create deal)
- Navigation helpers (navigate to page)
- Assertion helpers (verify element, verify text)

**QA Gate Criteria:**
- PASS: 0 critical bugs, 0 non-critical bugs
- WARN: 0 critical bugs, 1-3 non-critical bugs
- FAIL: 1+ critical bugs

### Cross-PM Coordination Patterns

**With PM-Orchestrator:**
- Report QA gate results
- Block merges on critical bugs
- Track bug escape rate

**With All PMs:**
- Test their domain features
- Fix bugs before merge
- Add test coverage for new features

**With PM-Infrastructure:**
- Deployment verification tests
- Smoke tests
- Performance testing

---

## Recent Work Context

### Last Cycle (Cycle 9)
- **Worked on:** QA-006 - E2E baseline documentation (complete)
- **Discovered:** 205 E2E tests, good baseline coverage
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Created 29 reusable test helpers
- Organized helpers into 4 modules
- Documented test patterns

**Cycle 7:**
- Established E2E testing patterns
- Created test infrastructure

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-browser-automation` for E2E tests
- Reusable test helpers
- Comprehensive test coverage

**Avoids:**
- Flaky tests
- Hardcoded test data
- Skipping critical test flows

**Works well with:**
- PM-Orchestrator (QA gate)
- All PMs (test their features)
- PM-Infrastructure (deployment tests)

---

*This memory is updated after each development cycle. PM-QA should read this before starting new work.*
