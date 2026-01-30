---
name: smart-agent-qa-mobile
description: Plan and execute comprehensive mobile web QA strategy with device matrix, automation frameworks, and release gates
---

# QA Testing Mobile

**When to Use:** Plan and execute comprehensive mobile web QA strategy. Use when defining test coverage, device matrix, automation frameworks, release gates, and quality metrics for mobile-responsive features.

## Mobile Web Testing Strategy (Adapted for Smart Agent)

### 1. Test Layers (Pyramid Approach)

```
        /\
       /E2E\          10% - Critical flows on real devices (Playwright)
      /------\
     /  API  \        20% - Edge function integration tests
    /----------\
   / Component \      30% - React component tests (RTL)
  /--------------\
 /  Unit Tests   \    40% - Hooks, utils, business logic (Vitest)
/------------------\
```

**Layer Breakdown:**

| Layer | Tool | Coverage | Example |
|-------|------|----------|---------|
| **Unit** | Vitest | 40% | Hooks (useDocumentProjects), utilities, validation logic |
| **Component** | React Testing Library | 30% | PropertyCard, DocumentTable, ChatMessage rendering |
| **Integration** | Vitest + MSW | 20% | Document upload → indexing, AI chat → streaming |
| **E2E** | Playwright Mobile | 10% | Login → upload → chat flow on iPhone/Android |

### 2. Device + Browser Matrix

**Tier 1 (PR Gates - Required):**
- ✅ Chrome Desktop (latest) - Baseline functional testing
- ✅ Chrome DevTools Mobile Emulation (iPhone 13, Pixel 5) - Quick responsive check

**Tier 2 (Pre-Release - Required):**
- 🔴 **Real iPhone** (iOS 16+, Safari) - Touch, gestures, viewport quirks
- 🔴 **Real Android** (Android 12+, Chrome) - Touch, performance, Material Design
- Tablet: iPad (Safari), Android tablet (Chrome) - Responsive breakpoints

**Tier 3 (Post-Release Monitoring):**
- Older iOS (iOS 15) - Backward compatibility
- Older Android (Android 11) - Backward compatibility
- Samsung Internet - Vendor-specific browser
- Firefox Mobile - Alternative browser

**Coverage Decision Matrix:**

| Use Case | Tier 1 (CI) | Tier 2 (Staging) | Tier 3 (Monitor) |
|----------|-------------|------------------|------------------|
| **PR validation** | ✅ Emulator | ❌ | ❌ |
| **Release candidate** | ✅ Emulator | ✅ Real devices | ❌ |
| **Production release** | ✅ Emulator | ✅ Real devices | ✅ Analytics |

### 3. Automation Framework Selection

**Chosen: Playwright (Mobile Viewports)**

Why Playwright for Smart Agent:
- ✅ Built-in mobile device emulation (iPhone, Android presets)
- ✅ Network throttling and offline testing
- ✅ Cross-browser (Chromium, WebKit for Safari simulation)
- ✅ Screenshot + video recording for debugging
- ✅ Parallel execution for faster CI
- ✅ TypeScript-native (matches our stack)

**Setup:**

```bash
npm install -D @playwright/test
npx playwright install

# playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    // Mobile emulation
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
    // Desktop (baseline)
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

### 4. Mobile-Specific Test Coverage

**Critical User Flows (E2E on Mobile):**
- [ ] Login → Dashboard (mobile layout)
- [ ] Upload document → View in list (touch interactions)
- [ ] AI chat → Stream response → View result (mobile chat UI)
- [ ] Property search → View details → Save (touch navigation)
- [ ] Create contact → Add to deal (mobile forms)

**Mobile-Specific Checks:**

```typescript
// tests/e2e/mobile/touch-targets.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Touch Target Validation', () => {
  test('all buttons meet 44px minimum @mobile', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

// tests/e2e/mobile/network-resilience.spec.ts
test('handles offline gracefully @mobile', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto('/documents');

  // Should show offline indicator
  await expect(page.getByText(/offline|no connection/i)).toBeVisible();
});

// tests/e2e/mobile/viewport.spec.ts
test('responsive layout adapts correctly @mobile', async ({ page }) => {
  await page.goto('/');

  // Verify sidebar hidden on mobile
  const sidebar = page.getByRole('navigation', { name: /main navigation/i });
  await expect(sidebar).toBeHidden();

  // Verify bottom nav visible on mobile (when implemented)
  const bottomNav = page.locator('[data-testid="mobile-bottom-nav"]');
  await expect(bottomNav).toBeVisible();
});
```

### 5. Performance Testing Thresholds

**Mobile Performance Budgets:**

| Metric | Target | Critical Threshold | Test Method |
|--------|--------|--------------------|-------------|
| **First Contentful Paint** | <2s | <3s | Lighthouse mobile |
| **Time to Interactive** | <3s | <5s | Lighthouse mobile |
| **Total Blocking Time** | <200ms | <500ms | Lighthouse mobile |
| **Cumulative Layout Shift** | <0.1 | <0.25 | Lighthouse mobile |
| **Largest Contentful Paint** | <2.5s | <4s | Lighthouse mobile |

### 6. Flake Management

**Flake Budget:** <5% flake rate per test suite

**Anti-Flake Patterns:**

```typescript
// ❌ Flaky: Race condition
await page.click('#submit-button');
expect(page.locator('.success-message')).toBeVisible(); // May fail

// ✅ Stable: Wait for condition
await page.click('#submit-button');
await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });

// ❌ Flaky: Fixed timeout
await page.waitForTimeout(2000);

// ✅ Stable: Wait for network idle
await page.waitForLoadState('networkidle');

// ✅ Stable: Wait for specific element
await page.waitForSelector('[data-loaded="true"]');
```

**Flake Quarantine Policy:**
- Test fails >3 times in 10 runs → Quarantine (skip in CI)
- Owner assigned to fix within 1 sprint
- Fixed tests run in isolation before re-enabling
- Monthly flake review to clean up or delete chronic flakes

### 7. Release Readiness Checklist

**Pre-Release Gates (Must Pass):**

**Functional:**
- [ ] All critical E2E flows pass on mobile emulation
- [ ] Login, document upload, AI chat, property search work on mobile
- [ ] Forms validate and submit correctly on touch devices
- [ ] Navigation works (responsive breakpoints tested)

**Performance:**
- [ ] Lighthouse mobile score ≥90
- [ ] First Contentful Paint <2s on Slow 3G
- [ ] Total Blocking Time <200ms
- [ ] No console errors on mobile viewports
- [ ] Memory usage <100MB (Chrome DevTools)

**Accessibility:**
- [ ] Lighthouse accessibility score ≥95
- [ ] Touch targets ≥44px validated
- [ ] Color contrast ≥4.5:1 (WCAG AA)
- [ ] Keyboard navigation works (tablet users)
- [ ] Screen reader labels present (VoiceOver/TalkBack)

**Mobile-Specific:**
- [ ] Works on real iPhone (Safari)
- [ ] Works on real Android (Chrome)
- [ ] Landscape orientation supported
- [ ] Offline behavior graceful (shows error, allows retry)
- [ ] Pull-to-refresh doesn't break layout
- [ ] iOS keyboard doesn't obscure inputs
- [ ] Android soft keyboard handled correctly

**Browser Compatibility:**
- [ ] iOS Safari 16+ (webkit quirks tested)
- [ ] Android Chrome 120+ (touch events work)
- [ ] iPad Safari (responsive breakpoints)
- [ ] Samsung Internet (if >5% traffic)

### 8. CI/CD Integration

```yaml
# .github/workflows/mobile-qa.yml
name: Mobile QA

on: [pull_request]

jobs:
  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run mobile E2E tests
        run: npx playwright test --project="Mobile Safari" --project="Mobile Chrome"

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

      - name: Lighthouse mobile audit
        run: |
          npm run build
          npx lighthouse http://localhost:8080 --preset=mobile --output=json --output-path=./lighthouse-mobile.json
          # Parse JSON and fail if performance <90
```

### 9. Test Maintenance Strategy

**Weekly:**
- Review flake rate dashboard
- Triage new failures (real bug vs test issue)
- Update device matrix from production analytics

**Monthly:**
- Review and prune obsolete tests
- Update browser/OS versions in CI
- Performance baseline regression check
- Accessibility audit with latest tools

**Per Release:**
- Run full suite on Tier 2 devices (real hardware)
- Manual exploratory testing on edge cases
- Performance comparison vs previous release
- Staged rollout: 5% → 25% → 50% → 100%

### 10. Quality Metrics (SLIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Crash-free sessions** | >99.5% | <99% |
| **Page load time (mobile)** | <2s (p90) | >3s |
| **API success rate** | >99% | <98% |
| **E2E test pass rate** | >95% | <90% |
| **Test flake rate** | <5% | >10% |
| **Lighthouse mobile** | >90 | <85 |

## Smart Agent Mobile QA Roadmap

**Phase 1 (Current Sprint):** ✅
- ✅ Vitest unit tests configured
- ✅ React Testing Library for components
- ⚠️ Playwright not yet configured

**Phase 2 (Next Sprint):**
- [ ] Install Playwright with mobile device configs
- [ ] Write E2E tests for critical flows (login, upload, chat)
- [ ] Add Lighthouse CI integration
- [ ] Create device testing checklist

**Phase 3 (Pre-Launch):**
- [ ] Real device testing (iPhone, Android)
- [ ] Performance baseline established
- [ ] Flake management process in place
- [ ] Staged rollout monitoring configured

**Phase 4 (Post-Launch):**
- [ ] Production monitoring with Sentry
- [ ] Web Vitals tracking (CrUX data)
- [ ] A/B testing for mobile UX improvements
- [ ] Monthly device matrix updates from analytics

## Immediate Actions
1. Set up Playwright with mobile device presets
2. Write smoke tests for critical user flows
3. Add Lighthouse mobile to CI/CD
4. Create real device testing checklist
5. Define mobile performance SLIs

**Note:** This skill provides comprehensive QA strategy for native mobile apps (iOS, Android). For Smart Agent (mobile web), apply the **testing pyramid, device matrix planning, flake management, and release gate methodology** using Playwright (E2E), Lighthouse (performance), and real device testing rather than XCUITest, Espresso, or Firebase Test Lab.
