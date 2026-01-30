---
name: smart-agent-mobile-testing
description: Apply comprehensive mobile testing strategies for unit, E2E, performance testing and mobile web quality
---

# Mobile App Testing

**When to Use:** Apply comprehensive mobile testing strategies when implementing or validating mobile-responsive features. Use for unit testing, E2E testing, performance testing, and ensuring mobile web quality.

## Testing Strategy for Mobile Web (Smart Agent)

### 1. Unit Testing (Vitest + React Testing Library)

Target: 70%+ coverage for business logic and components

```typescript
// Component unit test example
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropertySearch } from '@/pages/PropertySearch';

describe('PropertySearch Component', () => {
  const queryClient = new QueryClient();

  test('renders search form on mobile', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PropertySearch />
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText(/search location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  test('validates touch target sizes', () => {
    const { container } = render(<PropertySearch />);
    const searchButton = screen.getByRole('button', { name: /search/i });

    // Verify minimum 44px height for mobile
    const height = window.getComputedStyle(searchButton).height;
    expect(parseInt(height)).toBeGreaterThanOrEqual(44);
  });
});

// Hook unit test example
import { renderHook, waitFor } from '@testing-library/react';
import { useDocumentProjects } from '@/hooks/useDocumentProjects';

describe('useDocumentProjects Hook', () => {
  test('fetches projects successfully', async () => {
    const { result } = renderHook(() => useDocumentProjects());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.projects).toBeInstanceOf(Array);
  });

  test('handles offline state gracefully', async () => {
    // Mock offline network
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const { result } = renderHook(() => useDocumentProjects());

    // Should still return cached data or empty array
    await waitFor(() => expect(result.current.error).toBeDefined());
  });
});
```

### 2. Integration Testing (Vitest)

Test critical user flows with mocked API responses:

```typescript
describe('Document Upload Flow (Integration)', () => {
  test('uploads document and triggers indexing', async () => {
    const user = userEvent.setup();
    const { container } = render(<Documents />);

    // Open upload dialog
    await user.click(screen.getByRole('button', { name: /upload/i }));

    // Select file (mock file input)
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput!, file);

    // Submit
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    // Verify document appears in list
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });
});
```

### 3. E2E Testing (Playwright - Mobile Emulation)

Test on real mobile viewports and touch interactions:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});

// tests/mobile/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow (Mobile)', () => {
  test('should login on iOS Safari', async ({ page }) => {
    await page.goto('/login');

    // Verify mobile layout
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Fill form with mobile keyboard
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Tap login button (verify touch target)
    const loginButton = page.getByRole('button', { name: /sign in/i });
    const box = await loginButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // iOS minimum

    await loginButton.click();

    // Verify navigation to home
    await expect(page).toHaveURL('/');
  });
});
```

### 4. Performance Testing (Lighthouse + Custom Metrics)

```bash
# Mobile performance audit
npm run build
npx lighthouse http://localhost:8080 --preset=mobile --output=html --output-path=./lighthouse-mobile.html

# Target metrics:
# - Performance: >90
# - First Contentful Paint: <2s
# - Time to Interactive: <3s
# - Total Blocking Time: <300ms
# - Cumulative Layout Shift: <0.1
```

### 5. Accessibility Testing (Mobile-Specific)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Mobile Accessibility', () => {
  test('PropertyCardGrid has no a11y violations on mobile', async () => {
    const { container } = render(<PropertyCardGrid properties={mockProperties} />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  test('touch targets meet WCAG 2.1 AA (24x24 minimum)', () => {
    const { container } = render(<MobileNav />);
    const buttons = container.querySelectorAll('button');

    buttons.forEach(button => {
      const { width, height } = button.getBoundingClientRect();
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(24); // WCAG 2.1 AA
      // iOS/Android recommend 44-48px, but 24px is WCAG minimum
    });
  });
});
```

## Testing Commands

```bash
# Run all unit tests
npm run test

# Watch mode during development
npm run test:watch

# Run specific test file
npx vitest run src/hooks/useDocumentProjects.test.ts

# Run tests matching pattern
npx vitest run -t "mobile"

# Coverage report
npx vitest run --coverage

# E2E tests (when implemented)
npx playwright test --project="Mobile Safari"
npx playwright test --project="Mobile Chrome"
```

## Mobile Testing Checklist

### Unit Tests (Vitest + RTL)
- [ ] Hooks: useDocumentProjects, useAIStreaming, useSubscription
- [ ] Components: All mobile-responsive components
- [ ] Touch target validation in component tests
- [ ] Offline behavior mocking
- [ ] Error state handling

### Integration Tests
- [ ] Document upload → indexing → display flow
- [ ] AI chat → streaming → persistence flow
- [ ] Trial signup → countdown → upgrade flow
- [ ] Project creation → add docs → filtering flow

### E2E Tests (Playwright - when implemented)
- [ ] Login flow (iOS Safari)
- [ ] Login flow (Android Chrome)
- [ ] Document search and filtering
- [ ] AI chat conversation
- [ ] Mobile navigation between pages
- [ ] Touch gestures (swipe, tap, scroll)

### Performance Tests
- [ ] Lighthouse mobile score >90
- [ ] Bundle size <500KB initial
- [ ] Time to Interactive <3s
- [ ] Virtual scrolling for long lists
- [ ] Memory usage <100MB

### Accessibility Tests
- [ ] Axe-core violations = 0
- [ ] Touch targets ≥24px (WCAG), prefer 44-48px
- [ ] Color contrast ≥4.5:1
- [ ] Keyboard navigation (tablet users)
- [ ] Screen reader labels (VoiceOver/TalkBack)

### Real Device Testing
- [ ] iOS Safari: iPhone SE, iPhone 15 Pro
- [ ] Android Chrome: Pixel 5, Samsung Galaxy
- [ ] Tablet: iPad Pro, Samsung Tab
- [ ] Network: Slow 3G throttling
- [ ] Offline: Airplane mode behavior

## Current Testing Status
- ✅ Vitest configured (`npm run test`)
- ✅ React Testing Library available
- ⚠️ E2E framework not yet implemented (Playwright recommended)
- ⚠️ Coverage target not enforced (add to CI/CD)
- ⚠️ Mobile-specific tests needed for responsive components

## Next Steps for Mobile Testing
1. Add Playwright with mobile device emulation
2. Write E2E tests for critical mobile flows
3. Add visual regression testing (Percy or Chromatic)
4. Set up CI/CD to run tests on mobile viewports
5. Implement real device testing in staging

**Note:** This skill provides mobile app testing strategies for React Native, Flutter, and native apps. For Smart Agent (React web), adapt the **testing pyramid, performance targets, and quality gates** using Vitest (unit), Playwright (E2E), and Lighthouse (performance) rather than Detox, XCTest, or Espresso.
