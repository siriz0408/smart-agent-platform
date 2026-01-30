# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Agent is a real estate AI assistant SaaS application. It provides AI-powered document analysis, CRM features (contacts, properties, deals), and multi-document chat capabilities for real estate professionals.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components, Tailwind CSS, React Query
- **Backend**: Supabase (PostgreSQL with pgvector, Auth, Edge Functions in Deno)
- **Payments**: Stripe integration

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Vitest once
npm run test:watch   # Run Vitest in watch mode

# Run a single test file
npx vitest run src/test/example.test.ts

# Run tests matching a pattern
npx vitest run -t "pattern"
```

## Environment Variables

Frontend requires these in `.env` or `.env.local`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon/public key

Edge functions use secrets configured in Supabase:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected
- `LOVABLE_API_KEY` - For AI operations via Lovable gateway

## Architecture

### Frontend (`/src`)

- **Pages** (`/src/pages`): Route components - Home (AI chat), Documents, DocumentChat, Properties, Contacts, Pipeline, Agents, Settings, Billing
- **Components** (`/src/components`): Feature components organized by domain (documents/, contacts/, deals/, etc.) plus shared ui/ components
- **Hooks** (`/src/hooks`): Custom hooks including useAuth, useDocumentIndexing, useAIChat, useSubscription
- **Entry**: `main.tsx` → `App.tsx` (QueryClientProvider → AuthProvider → routes)

### Backend (`/supabase/functions`)

Edge functions running on Deno (all have `verify_jwt = false` in config.toml):

- `index-document`: PDF/text extraction with pdfjs-serverless, document type detection, smart chunking, embeddings, AI summaries
- `ai-chat`: Multi-document RAG chat with query expansion
- `search-documents`: Vector similarity search
- `delete-document`: Document cleanup
- `create-checkout-session`, `create-customer-portal`, `stripe-webhook`: Stripe billing

### Database

Multi-tenant PostgreSQL with pgvector. All tables use `tenant_id` for RLS isolation.

- **Core**: `tenants`, `profiles`, `user_roles`
- **CRM**: `contacts`, `contact_agents`, `properties`
- **Documents/AI**: `documents`, `document_chunks` (with vector embeddings), `document_metadata` (structured extraction), `ai_conversations`, `ai_messages`
- **Pipeline**: Deal and milestone tracking tables

### Path Aliases

`@/*` maps to `./src/*` (tsconfig.json and vite.config.ts).

## Document Intelligence Pipeline

The `index-document` edge function processes real estate documents:

1. **Text extraction**: pdfjs-serverless for PDFs, TextDecoder for other formats
2. **Type detection**: Classifies as settlement/inspection/contract/appraisal/disclosure/general based on content keywords
3. **Smart chunking**: Preserves semantic boundaries (page breaks, sections, tables) rather than fixed-size splitting
4. **Embeddings**: Deterministic hash-based embeddings stored in `document_chunks`
5. **Structured extraction**: For financial/legal docs, extracts JSON data via AI (stored in `document_metadata`)
6. **AI summary**: Document-type-specific prompts generate summaries

AI operations use the Lovable AI Gateway (`ai.gateway.lovable.dev`) with `google/gemini-3-flash-preview` model.

See `.lovable/plan.md` for the document extraction enhancement plan.

---

## Product Requirements Document

The full PRD with implementation status is maintained in **[Smart_Agent_Platform_PRD_v2.md](./Smart_Agent_Platform_PRD_v2.md)**.

The development task board is maintained in **[TASK_BOARD.md](./TASK_BOARD.md)**.

---

## Skills Usage Guide

### mobile-ios-design

**When to Use:** Apply iOS Human Interface Guidelines principles to mobile-responsive web design. Use when improving mobile UX, creating touch-friendly interfaces, or ensuring the web app feels native-like on iOS devices.

**Key Principles (adapted for React/Tailwind):**

1. **Clarity, Deference, Depth**
   - Content-first design with subtle UI elements
   - Visual hierarchy through shadows, spacing, typography
   - Touch targets minimum 44x44px (use `min-h-11 min-w-11` in Tailwind)

2. **Mobile-Responsive Patterns**
   - Use `sm:`, `md:`, `lg:` breakpoints for adaptive layouts
   - Stack vertically on mobile, horizontal on desktop
   - Bottom navigation on mobile (fixed footer), sidebar on desktop
   - Full-screen modals on mobile, dialog sheets on desktop

3. **iOS-Inspired Components**
   - Card-based layouts with rounded corners (`rounded-xl`, `rounded-2xl`)
   - Subtle shadows (`shadow-sm`, `shadow-md`)
   - System-style lists with dividers
   - Pull-to-refresh patterns where applicable
   - Swipe gestures for actions (delete, archive)

4. **Typography & Spacing**
   - Use semantic heading hierarchy (`text-2xl font-semibold` for h1)
   - Comfortable touch spacing (`space-y-4`, `gap-4` minimum)
   - Line height 1.5+ for readability on small screens
   - 16px minimum font size to prevent iOS zoom

5. **Dark Mode Support**
   - Already using Tailwind dark mode variants
   - Follow iOS dark mode color semantics (elevated surfaces, reduced contrast)
   - Test all components in both modes

6. **Touch-Friendly Interactions**
   - Generous padding on buttons (`px-6 py-3` minimum)
   - Clear active/pressed states (`:active` styles)
   - Avoid hover-only interactions on mobile
   - Use native scrolling (avoid custom scrollbars)

**Implementation Checklist:**
- [ ] Mobile viewport meta tag in index.html
- [ ] Touch target sizes ≥44px
- [ ] Horizontal scroll areas use `-webkit-overflow-scrolling: touch`
- [ ] Fixed bottom navigation on mobile screens
- [ ] Modals use full screen on mobile (`sm:max-w-lg` for desktop dialog)
- [ ] Form inputs have proper input types (`type="email"`, `type="tel"`)
- [ ] Disable zoom on inputs (16px min font-size)
- [ ] Test on real iOS devices (Safari, not just Chrome DevTools)

**Note:** This skill provides iOS HIG principles. Since Smart Agent is a React web app (not native SwiftUI), apply the design principles and interaction patterns to our Tailwind/shadcn components rather than using SwiftUI code directly.

---

### mobile-android-design

**When to Use:** Apply Material Design 3 principles for Android-optimized mobile experiences. Use when implementing Android-friendly UI patterns, ensuring cross-platform mobile consistency, or following Material Design guidelines for web.

**Key Principles (adapted for React/Tailwind):**

1. **Material Design 3 Core Concepts**
   - **Personalization**: Adaptive theming (already using Tailwind dark mode)
   - **Accessibility**: High contrast ratios, clear touch targets
   - **Responsive**: Layouts adapt to phones, tablets, foldables

2. **Material Components (shadcn/ui equivalents)**
   - Cards: Use `Card` component with `rounded-xl` or `rounded-2xl`
   - Buttons: Primary (default), Tonal (secondary), Outlined, Text (ghost)
   - FABs: Fixed positioned buttons with `rounded-full` (e.g., Add button)
   - Navigation: Bottom nav on mobile, side drawer on desktop
   - Dialogs/Sheets: Use `Dialog` or `Sheet` components

3. **Touch Targets & Spacing**
   - Minimum 48px (12 Tailwind units) for all interactive elements
   - Use `h-12 w-12` minimum for icon buttons on mobile
   - Comfortable spacing: `space-y-4` (16px) or `gap-4` between touch elements
   - Padding on cards/containers: `p-4` (16px) minimum

4. **Material Typography Scale**
   - Display: `text-5xl` (57px) for hero text
   - Headline: `text-3xl` (30px) for page titles
   - Title: `text-xl` (20px) for card headers
   - Body: `text-base` (16px) for content
   - Label: `text-sm` (14px) for buttons, badges

5. **Material Color System**
   - Primary: Main brand actions (Tailwind `bg-primary`, `text-primary`)
   - Secondary: Supporting actions (Tailwind `bg-secondary`)
   - Surface variants: `bg-muted`, `bg-accent` for elevated cards
   - On-surface variants: `text-muted-foreground`, `text-accent-foreground`

6. **Android-Specific Patterns**
   - **Bottom Navigation**: Fixed `bottom-0` nav bar on mobile (`md:hidden`)
   - **FAB Positioning**: `fixed bottom-20 right-6` (above bottom nav)
   - **Top App Bar**: Sticky header with menu/back button on left
   - **Navigation Drawer**: Sheet sliding from left with menu items
   - **Swipe Actions**: Use gesture libraries for swipe-to-delete

7. **Adaptive Breakpoints**
   - **Compact** (< 640px): Single column, bottom nav, full-screen modals
   - **Medium** (640-1024px): Two columns, side nav, dialog modals
   - **Expanded** (> 1024px): Multi-column, persistent nav, popovers

**Implementation Checklist:**
- [ ] Bottom navigation bar on mobile screens (hidden on desktop)
- [ ] FAB for primary actions on mobile
- [ ] Card elevations using `shadow-md` or `shadow-lg`
- [ ] Ripple effects on buttons (use `:active:scale-95` transform)
- [ ] System back button support (browser back)
- [ ] Gesture-friendly lists (swipe actions where appropriate)
- [ ] Material color tokens in Tailwind config
- [ ] 48px minimum touch targets on mobile
- [ ] Test on real Android devices (Chrome mobile, not just DevTools)

**Material Design Resources:**
- [Material Design 3](https://m3.material.io/)
- [Material Web Components](https://material-web.dev/)
- [Tailwind Material Colors](https://tailwindcss.com/docs/customizing-colors)

**Note:** This skill provides Material Design 3 / Jetpack Compose patterns for native Android. Adapt the design system, component hierarchy, and interaction patterns to our React/Tailwind stack using shadcn/ui components as Material Design equivalents.

---

### mobile-design

**When to Use:** Apply mobile-first engineering doctrine when implementing ANY mobile-responsive features. Use to avoid desktop-thinking, validate mobile feasibility, ensure touch-first interactions, and optimize performance for mobile web.

**Core Philosophy:**
- **Touch-First**: Finger ≠ cursor. Design for imprecise taps, not hover states.
- **Battery-Conscious**: Minimize animations, optimize re-renders, reduce network calls.
- **Platform-Respectful**: iOS and Android have different conventions - respect both.
- **Offline-Capable**: Handle poor network gracefully, show loading states, enable retries.

**Mobile Feasibility & Risk Index (MFRI)** - Assess before implementing mobile features:

| Dimension | Assessment for Smart Agent Web App |
|-----------|-----------------------------------|
| **Platform Clarity** | ✅ Web responsive (iOS Safari + Android Chrome) |
| **Interaction Complexity** | Medium (forms, lists, modals, chat) |
| **Performance Risk** | Medium (large document lists, AI streaming) |
| **Offline Dependence** | High (requires network for AI, sync) |
| **Accessibility Risk** | Medium (complex forms, real-time updates) |

**MFRI Score:** ~3-4 (Moderate) → Requires performance validation + progressive enhancement

**Key Constraints for Web Mobile:**

1. **Touch Targets** (Critical)
   - Minimum 44px height on all clickable elements
   - Use `min-h-11` (44px) or `h-12` (48px) for buttons on mobile
   - Increase tap area with invisible padding: `p-3` on icon buttons
   - Space interactive elements 8px minimum (`gap-2`)

2. **Performance Optimization**
   - ❌ NEVER: `Array.map()` for 100+ items without virtualization
   - ✅ ALWAYS: Use `react-window` or `@tanstack/react-virtual` for long lists
   - ❌ NEVER: Inline functions in renderItem callbacks
   - ✅ ALWAYS: `useCallback` + `React.memo` for list items
   - Monitor: Use React DevTools Profiler for re-render analysis

3. **Network & Offline Handling**
   - Show explicit loading states (spinners, skeletons)
   - Handle errors with retry buttons
   - Debounce search inputs (300-500ms)
   - Cache data with React Query (staleTime, cacheTime)
   - Show "Offline" banner when network lost

4. **Mobile-Specific UX Patterns**
   - **Bottom sheets** for actions on mobile (use shadcn Sheet component)
   - **Full-screen modals** on mobile (`sm:max-w-lg` for desktop dialogs)
   - **Pull-to-refresh** on lists (swipe down gesture)
   - **Swipe actions** for delete/archive (gesture libraries)
   - **Fixed bottom navigation** instead of sidebar (`md:hidden`)

5. **Anti-Patterns to Avoid**
   - ❌ Hover-only interactions (no hover on touch devices)
   - ❌ Small text inputs (<16px triggers iOS zoom)
   - ❌ Thin scrollbars or custom scroll behavior
   - ❌ Dense tables on mobile (use card layout instead)
   - ❌ Multi-step forms without progress indicator
   - ❌ Auto-playing videos or heavy animations

6. **Security for Mobile Web**
   - ✅ Tokens stored in memory (React state) or httpOnly cookies
   - ✅ HTTPS only in production
   - ❌ Never log auth tokens or PII to console
   - ✅ Validate file uploads client-side (type, size)

**Mobile Development Checklist:**
- [ ] Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Touch targets ≥44px on all interactive elements
- [ ] Text inputs use `text-base` (16px) minimum to prevent iOS zoom
- [ ] Loading states for all async operations
- [ ] Error boundaries with retry functionality
- [ ] Debounced search/filter inputs
- [ ] Virtualized lists for 50+ items
- [ ] Offline detection with user feedback
- [ ] Test on real devices (iOS Safari, Android Chrome)
- [ ] Lighthouse mobile score >90

**Performance Monitoring:**
```bash
# Check for performance issues
npm run build
# Analyze bundle size
npx vite-bundle-visualizer

# Lighthouse mobile audit
npx lighthouse https://localhost:8080 --preset=mobile --view
```

**Mobile Testing Strategy:**
1. **Chrome DevTools** (responsive mode) - Initial layout check
2. **Real iOS device** (Safari) - Touch interactions, gestures, performance
3. **Real Android device** (Chrome) - Material Design consistency
4. **Slow 3G throttling** - Network resilience testing
5. **Battery saver mode** - Performance under constraints

**Note:** This skill provides mobile engineering doctrine for React Native/Flutter. For Smart Agent (React web app), apply the **principles** (touch-first, performance-conscious, offline-aware) rather than framework-specific code. Use this skill to guide mobile-responsive decisions and validate UX patterns.

---

### mobile-development

**When to Use:** Apply comprehensive mobile development best practices when building mobile-responsive features. Use for performance budgets, architecture decisions, testing strategies, and ensuring production-ready mobile web experiences.

**Performance Budgets for Mobile Web:**

| Metric | Target | Smart Agent Status |
|--------|--------|-------------------|
| **Initial Load** | <2s to interactive | Verify with Lighthouse |
| **Screen Load** | <1s for cached data | ✅ React Query caching |
| **API Requests** | <3s timeout | ✅ Supabase edge functions |
| **Memory** | <100MB typical screens | Monitor with DevTools |
| **Frame Rate** | 60 FPS (16.67ms/frame) | Test animations on device |
| **Bundle Size** | <500KB initial JS | Check with `vite-bundle-visualizer` |

**Mobile-First Architecture Principles:**

1. **State Management**
   - ✅ Using: React Query for server state (caching, revalidation)
   - ✅ Using: React useState/Context for UI state
   - Pattern: Zustand recommended if app state grows complex
   - Keep state minimal - derive computed values

2. **Offline-First Strategy**
   - React Query staleTime for offline tolerance
   - Service workers for offline page loading (optional)
   - Optimistic updates with rollback on error
   - Clear offline/online status indicators

3. **Data Persistence**
   - ✅ Current: Supabase (server-side persistence)
   - Client-side: localStorage for preferences only
   - IndexedDB for large offline datasets (if needed)
   - Never store tokens in localStorage (memory only)

4. **Network Optimization**
   - Batch API requests where possible
   - Debounce search inputs (300-500ms)
   - ✅ Using: React Query for deduplication
   - Pagination for large lists (implement infinite scroll)
   - Progressive image loading

**Mobile Testing Strategy:**

1. **Performance Testing**
   ```bash
   # Lighthouse mobile audit
   npm run build
   npx lighthouse http://localhost:8080 --preset=mobile --view

   # Bundle size analysis
   npx vite-bundle-visualizer

   # Target: Performance score >90, FCP <2s
   ```

2. **Cross-Device Testing**
   - Chrome DevTools responsive mode (quick iteration)
   - iOS Safari (real iPhone) - Required before release
   - Android Chrome (real device) - Required before release
   - iPad/tablet sizes (responsive breakpoints)
   - Slow 3G network throttling

3. **Accessibility Testing**
   - VoiceOver (iOS) and TalkBack (Android) testing
   - Keyboard navigation (for tablet users)
   - Color contrast ratio ≥4.5:1
   - Focus indicators visible
   - ARIA labels on interactive elements

**Security Best Practices (OWASP Mobile):**

| Risk | Mitigation in Smart Agent |
|------|--------------------------|
| **Insecure Data Storage** | ✅ Tokens in memory, httpOnly cookies for refresh |
| **Insecure Communication** | ✅ HTTPS only, Supabase handles SSL |
| **Insecure Authentication** | ✅ Supabase Auth with JWT, RLS policies |
| **Client Code Tampering** | ⚠️ Minimize sensitive logic in frontend |
| **Reverse Engineering** | ⚠️ Obfuscate build, env vars server-side only |

**Mobile Optimization Checklist:**
- [ ] Lazy load routes with React.lazy() and Suspense
- [ ] Code splitting for large features (Documents, Pipeline)
- [ ] Image optimization (WebP format, responsive sizes)
- [ ] Virtual scrolling for lists >50 items
- [ ] Debounced search and filter inputs
- [ ] React Query caching configured (staleTime: 5min)
- [ ] Error boundaries for graceful degradation
- [ ] Loading skeletons for all async content
- [ ] Offline detection with user feedback
- [ ] Service worker for offline page shell (optional)

**10 Commandments Applied to Smart Agent:**

1. **Performance is Foundation** → Monitor bundle size, optimize re-renders
2. **Every Kilobyte Matters** → Code split routes, compress images, tree-shake unused code
3. **Offline-First** → React Query caching, show clear network status, retry mechanisms
4. **User Context** → Real estate agents on-the-go need fast property lookup, quick document access
5. **Platform Awareness** → Respect iOS/Android navigation conventions in responsive design
6. **Iterate** → Ship mobile-responsive MVP, gather metrics, improve based on data
7. **Security & A11y** → RLS policies secure data, WCAG 2.1 AA compliance for accessibility
8. **Real Device Testing** → Test on iPhone (Safari), Android (Chrome) before release
9. **Scale Architecture** → Current stack (React Query + Supabase) appropriate for scope
10. **Continuous Learning** → Monitor Web Vitals, Core Web Vitals, performance metrics

**Pre-Release Mobile Checklist:**
- [ ] Lighthouse mobile score >90
- [ ] Performance profiling on real devices
- [ ] Network throttling tests (Slow 3G)
- [ ] Memory leak analysis (Chrome DevTools)
- [ ] Touch target validation (44px minimum)
- [ ] Offline behavior graceful
- [ ] iOS Safari testing (required)
- [ ] Android Chrome testing (required)
- [ ] Accessibility audit (aXe DevTools)
- [ ] Security headers configured

**Note:** This skill provides comprehensive mobile app development framework (React Native, Flutter, native). For Smart Agent (React PWA/web app), apply the **best practices, performance budgets, testing strategies, and mobile-first mindset** to our Vite + React + Tailwind stack. Focus on progressive web app patterns rather than native app store deployment.

---

### mobile-app-testing

**When to Use:** Apply comprehensive mobile testing strategies when implementing or validating mobile-responsive features. Use for unit testing, E2E testing, performance testing, and ensuring mobile web quality.

**Testing Strategy for Mobile Web (Smart Agent):**

**1. Unit Testing (Vitest + React Testing Library)**

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

**2. Integration Testing (Vitest)**

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

**3. E2E Testing (Playwright - Mobile Emulation)**

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

**4. Performance Testing (Lighthouse + Custom Metrics)**

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

**5. Accessibility Testing (Mobile-Specific)**

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

**Testing Commands:**

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

**Mobile Testing Checklist:**

**Unit Tests (Vitest + RTL):**
- [ ] Hooks: useDocumentProjects, useAIStreaming, useSubscription
- [ ] Components: All mobile-responsive components
- [ ] Touch target validation in component tests
- [ ] Offline behavior mocking
- [ ] Error state handling

**Integration Tests:**
- [ ] Document upload → indexing → display flow
- [ ] AI chat → streaming → persistence flow
- [ ] Trial signup → countdown → upgrade flow
- [ ] Project creation → add docs → filtering flow

**E2E Tests (Playwright - when implemented):**
- [ ] Login flow (iOS Safari)
- [ ] Login flow (Android Chrome)
- [ ] Document search and filtering
- [ ] AI chat conversation
- [ ] Mobile navigation between pages
- [ ] Touch gestures (swipe, tap, scroll)

**Performance Tests:**
- [ ] Lighthouse mobile score >90
- [ ] Bundle size <500KB initial
- [ ] Time to Interactive <3s
- [ ] Virtual scrolling for long lists
- [ ] Memory usage <100MB

**Accessibility Tests:**
- [ ] Axe-core violations = 0
- [ ] Touch targets ≥24px (WCAG), prefer 44-48px
- [ ] Color contrast ≥4.5:1
- [ ] Keyboard navigation (tablet users)
- [ ] Screen reader labels (VoiceOver/TalkBack)

**Real Device Testing:**
- [ ] iOS Safari: iPhone SE, iPhone 15 Pro
- [ ] Android Chrome: Pixel 5, Samsung Galaxy
- [ ] Tablet: iPad Pro, Samsung Tab
- [ ] Network: Slow 3G throttling
- [ ] Offline: Airplane mode behavior

**Current Testing Status:**
- ✅ Vitest configured (`npm run test`)
- ✅ React Testing Library available
- ⚠️ E2E framework not yet implemented (Playwright recommended)
- ⚠️ Coverage target not enforced (add to CI/CD)
- ⚠️ Mobile-specific tests needed for responsive components

**Next Steps for Mobile Testing:**
1. Add Playwright with mobile device emulation
2. Write E2E tests for critical mobile flows
3. Add visual regression testing (Percy or Chromatic)
4. Set up CI/CD to run tests on mobile viewports
5. Implement real device testing in staging

**Note:** This skill provides mobile app testing strategies for React Native, Flutter, and native apps. For Smart Agent (React web), adapt the **testing pyramid, performance targets, and quality gates** using Vitest (unit), Playwright (E2E), and Lighthouse (performance) rather than Detox, XCTest, or Espresso.

---

### mobile-app-debugging

**When to Use:** Debug mobile-specific issues including performance problems, network failures, device-specific bugs, touch interaction issues, and responsive layout problems on mobile web.

**Mobile Web Debugging Tools & Techniques:**

**1. Chrome DevTools (Primary Tool)**

```bash
# Remote debugging on real Android device
1. Enable USB debugging on Android device
2. Connect via USB
3. Chrome → More Tools → Remote devices (chrome://inspect)
4. Inspect mobile viewport, debug JS, check network

# Mobile emulation
1. DevTools → Toggle device toolbar (Cmd+Shift+M)
2. Select device preset (iPhone 13 Pro, Pixel 5)
3. Throttle network (Slow 3G, Offline)
4. Enable touch emulation
```

**Mobile DevTools Features:**
- **Performance tab**: Record mobile runtime performance, check FPS, identify jank
- **Memory tab**: Heap snapshots, detect memory leaks, monitor allocation
- **Network tab**: Throttle to Slow 3G, check request waterfall, verify caching
- **Lighthouse**: Mobile audit with performance score, accessibility, best practices
- **Coverage tab**: Find unused CSS/JS on mobile viewport

**2. iOS Safari Web Inspector (Required for iOS Testing)**

```bash
# Remote debugging on real iPhone/iPad
1. iPhone → Settings → Safari → Advanced → Enable Web Inspector
2. Connect iPhone via USB
3. Mac Safari → Develop → [Device Name] → [Page]
4. Debug with Safari DevTools

# Common iOS Safari issues:
- Position: fixed behavior differs from Chrome
- 100vh includes address bar (use 100dvh instead)
- Viewport units recalculate on scroll
- Touch events need -webkit-touch-callout: none
- Input zoom if font-size <16px
```

**3. Common Mobile Web Debugging Scenarios**

**Performance Issues:**

```typescript
// Debug: Component re-rendering too often
import { useEffect, useRef } from 'react';

function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

// Usage
useRenderCount('PropertyCardGrid'); // Add to suspect components

// Fix: Memoize expensive components
const PropertyCard = React.memo(({ property }) => {
  return <div>{property.name}</div>;
});

// Fix: Memoize callbacks
const handleSearch = useCallback((query: string) => {
  // search logic
}, []); // Empty deps if no dependencies
```

**Network Debugging:**

```typescript
// Debug: API calls timing out on mobile
// Add request timing logging
const fetchWithTiming = async (url: string, options: RequestInit) => {
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - start;
    console.log(`[Network] ${url} completed in ${duration.toFixed(0)}ms`);
    return response;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Network] ${url} failed after ${duration.toFixed(0)}ms`, error);
    throw error;
  }
};

// Check: Network waterfall in DevTools Network tab
// Fix: Batch requests, add retries, implement exponential backoff
```

**Memory Leaks:**

```bash
# Debug memory leaks on mobile
1. Chrome DevTools → Memory → Take heap snapshot
2. Interact with app (navigate, open modals, close)
3. Take second snapshot
4. Compare snapshots → look for objects not garbage collected
5. Common culprits:
   - Event listeners not cleaned up
   - Timers/intervals not cleared
   - React Query cache growing unbounded
   - Large state objects retained
```

**Touch/Gesture Issues:**

```typescript
// Debug: Buttons not responding on mobile
// Check touch target size
const button = document.querySelector('button');
const rect = button.getBoundingClientRect();
console.log(`Touch target: ${rect.width}x${rect.height}px`);
// Should be ≥44x44px

// Fix: Increase touch area
<Button className="min-h-11 min-w-11 p-3">Click</Button>

// Debug: Scroll issues on iOS
// Issue: -webkit-overflow-scrolling deprecated
// Fix: Use standard overflow-y-auto, remove -webkit-overflow-scrolling
```

**4. Mobile-Specific Bug Patterns**

| Issue | Symptom | Debug Method | Solution |
|-------|---------|--------------|----------|
| **iOS Input Zoom** | Input focus zooms page | Check font-size <16px | Set `font-size: 16px` minimum on inputs |
| **Position Fixed** | Header jumps on scroll | Test on real iOS Safari | Use `position: sticky` or adjust with viewport units |
| **Touch Delay** | 300ms click delay | Check if using :hover | Remove hover states, use touch events |
| **Viewport Height** | Layout breaks on scroll | Using `100vh` | Use `100dvh` (dynamic viewport height) |
| **Memory Crash** | Page reloads on navigation | Memory profiling | Reduce image sizes, clear unused state |
| **Slow Scrolling** | Janky scroll on lists | Performance tab, FPS meter | Implement virtual scrolling |

**5. Mobile Debugging Workflow**

```bash
# Step 1: Reproduce on real device
# Use real iPhone (Safari) and Android (Chrome), not just DevTools emulation

# Step 2: Collect diagnostic data
npm run build  # Test production build
# Check Console tab for errors
# Check Network tab for failed requests
# Check Performance tab for long tasks

# Step 3: Isolate the issue
# Disable features one by one
# Check if issue is CSS, JS, or network
# Verify if device-specific or universal

# Step 4: Profile performance
# DevTools → Performance → Record
# Interact with problematic feature
# Stop recording → analyze flame graph
# Look for: Long tasks >50ms, excessive re-renders, layout thrashing

# Step 5: Fix and verify
# Implement fix
# Test on same device/network conditions
# Verify metrics improved (FPS, memory, load time)
```

**6. Debugging Checklist**

**Device Testing:**
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro (modern iOS)
- [ ] Test on Android Pixel (standard)
- [ ] Test on Samsung Galaxy (vendor-specific)
- [ ] Test on iPad (tablet layout)

**Network Conditions:**
- [ ] Fast WiFi (baseline)
- [ ] Slow 3G (throttled network)
- [ ] Offline mode (airplane mode)
- [ ] Intermittent connection (toggle WiFi on/off)
- [ ] API timeout scenarios

**Performance Profiling:**
- [ ] Record page load with Performance tab
- [ ] Check First Contentful Paint <2s
- [ ] Check Time to Interactive <3s
- [ ] Verify 60 FPS during animations
- [ ] Monitor memory usage <100MB

**Common Fixes:**
- [ ] Remove console.log from production build
- [ ] Add error boundaries for graceful failures
- [ ] Implement retry logic for network requests
- [ ] Add loading skeletons for async content
- [ ] Use React.memo for expensive components
- [ ] Debounce search inputs (300-500ms)
- [ ] Virtualize long lists (50+ items)
- [ ] Optimize images (WebP, responsive sizes)

**Debugging Tools for Smart Agent:**

```bash
# Production build analysis
npm run build
npx vite-bundle-visualizer  # Check bundle size

# Network debugging
# DevTools → Network → Throttle to Slow 3G
# DevTools → Network → Disable cache

# Performance profiling
# DevTools → Performance → Record page load
# DevTools → Performance → Record interaction

# Memory leak detection
# DevTools → Memory → Take heap snapshot
# Navigate around app
# Take second snapshot → Compare

# Lighthouse mobile audit
npx lighthouse http://localhost:8080 --preset=mobile --view

# React DevTools profiling
# Install React DevTools extension
# Profiler tab → Record → Interact → Stop
# Analyze component render times
```

**Mobile Browser Quirks:**

| Browser | Quirk | Workaround |
|---------|-------|------------|
| **iOS Safari** | 100vh includes address bar | Use `100dvh` (dynamic vh) |
| **iOS Safari** | Input zoom if <16px | Set `font-size: 16px` on inputs |
| **iOS Safari** | Touch delay on clickable divs | Add `cursor: pointer` or use `<button>` |
| **iOS Safari** | Position fixed + keyboard issues | Test keyboard open/close behavior |
| **Android Chrome** | Different font rendering | Test typography on real device |
| **Android Chrome** | Pull-to-refresh conflicts | Use `overscroll-behavior: contain` |

**Emergency Debugging Commands:**

```bash
# Clear React Query cache (if stale data suspected)
# Add to browser console:
queryClient.clear()

# Clear localStorage (if corrupted state)
localStorage.clear()

# Force re-render (debugging only)
# Add to component temporarily:
const [, forceUpdate] = useReducer(x => x + 1, 0);
// Call forceUpdate() to trigger re-render

# Check if component is mounted
useEffect(() => {
  console.log('Component mounted');
  return () => console.log('Component unmounted');
}, []);
```

**Production Monitoring (Future):**

- Sentry for error tracking (mobile browser context)
- Web Vitals for performance monitoring
- LogRocket for session replay (see user interactions)
- Google Analytics for mobile vs desktop usage patterns

**Note:** This skill provides native mobile app debugging techniques (Xcode, Android Studio). For Smart Agent (mobile web), apply the **debugging methodology and issue patterns** using Chrome DevTools (Android), Safari Web Inspector (iOS), network throttling, performance profiling, and real device testing rather than native debugging tools.

---

### mobile-responsiveness

**When to Use:** Implement mobile-first responsive layouts using Tailwind breakpoints. Use when building adaptive components, implementing touch interactions, creating mobile navigation, or ensuring proper viewport handling across devices.

**Tailwind Breakpoints (Mobile-First):**

Smart Agent uses Tailwind's default breakpoints (mobile-first approach):

```typescript
// Default styles = Mobile (< 640px)
// sm: 640px+   (Large phones, small tablets)
// md: 768px+   (Tablets)
// lg: 1024px+  (Laptops, small desktops)
// xl: 1280px+  (Large desktops)
// 2xl: 1536px+ (Extra large screens)
```

**Responsive Layout Patterns:**

```tsx
// 1. Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// 2. Hide sidebar on mobile, show on desktop
<div className="hidden md:block md:w-64">Sidebar</div>
<div className="flex-1">Main content</div>

// 3. Full-screen modal on mobile, dialog on desktop
<DialogContent className="
  w-full h-full max-w-none m-0 rounded-none
  sm:w-auto sm:h-auto sm:max-w-lg sm:rounded-lg
">

// 4. Bottom nav on mobile, sidebar on desktop
<nav className="
  fixed bottom-0 left-0 right-0 border-t
  md:static md:w-64 md:border-r md:border-t-0
">

// 5. Responsive padding/spacing
<div className="p-4 md:p-6 lg:p-8">
  <div className="space-y-4 md:space-y-6">
    {/* Content */}
  </div>
</div>
```

**Touch Interaction Patterns:**

```tsx
// Swipeable card for delete/archive actions
import { useState } from 'react';

function SwipeableDocumentCard({ doc, onDelete }) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const minSwipeDistance = 80;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    if (touchStart !== null) {
      setSwipeOffset(currentTouch - touchStart);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe) {
      onDelete();
    }

    setSwipeOffset(0);
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${Math.min(swipeOffset, 0)}px)` }}
    >
      <div className="bg-destructive absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center">
        <Trash2 className="h-5 w-5 text-white" />
      </div>
      <Card className="relative bg-background">
        {/* Card content */}
      </Card>
    </div>
  );
}
```

**Mobile Navigation Implementation:**

```tsx
// Current: AppSidebar (desktop only)
// TODO: Add bottom navigation for mobile

function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: MessageSquare, label: 'Chat' },
    { path: '/documents', icon: FileText, label: 'Docs' },
    { path: '/properties', icon: Home, label: 'Properties' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-50
      bg-background border-t border-border
      md:hidden
      pb-safe
    ">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 min-w-[64px]",
                "active:scale-95 transition-transform", // Touch feedback
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Add to AppLayout for mobile
<div className="pb-16 md:pb-0"> {/* Bottom nav spacer on mobile */}
  <main>{children}</main>
  <MobileBottomNav />
</div>
```

**Safe Area Support (iPhone Notch):**

```css
/* Add to global CSS (index.css) */
@supports (padding: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .pt-safe {
    padding-top: env(safe-area-inset-top);
  }
}

/* Update viewport meta in index.html */
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Viewport Units (iOS Safe):**

```tsx
// ❌ Avoid: 100vh includes address bar on iOS
<div className="h-screen"> {/* May be cut off by iOS address bar */}

// ✅ Use: Dynamic viewport height
<div className="h-dvh"> {/* Adjusts for address bar */}

// For older browsers, add fallback in Tailwind config:
// tailwind.config.ts
export default {
  theme: {
    extend: {
      height: {
        'screen-safe': ['100vh', '100dvh'], // Fallback, then modern
      }
    }
  }
}
```

**useMediaQuery Hook (Already Available):**

```tsx
// Create utility hook if not exists
// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage in components
function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {!isMobile && !isTablet && <DesktopView />}
    </div>
  );
}
```

**Responsive Component Examples for Smart Agent:**

```tsx
// Property card - grid adapts to screen size
<div className="
  grid grid-cols-1           /* Mobile: 1 column */
  sm:grid-cols-2             /* Large phones: 2 columns */
  lg:grid-cols-3             /* Desktop: 3 columns */
  gap-4 md:gap-6
">
  {properties.map(p => <PropertyCard key={p.id} property={p} />)}
</div>

// Document table - switch to cards on mobile
{isMobile ? (
  <div className="space-y-4">
    {documents.map(doc => (
      <Card key={doc.id} className="p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-10 w-10" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{doc.name}</p>
            <p className="text-sm text-muted-foreground">{doc.category}</p>
          </div>
        </div>
      </Card>
    ))}
  </div>
) : (
  <Table>
    {/* Desktop table view */}
  </Table>
)}

// AI Chat input - fixed on mobile, inline on desktop
<div className="
  fixed bottom-0 left-0 right-0 p-4 bg-background border-t
  md:static md:border-t-0 md:p-0
">
  <form onSubmit={handleSubmit}>
    <div className="flex gap-2">
      <Input placeholder="Ask me anything..." />
      <Button type="submit" size="icon">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  </form>
</div>
```

**Mobile Responsiveness Checklist:**

**Viewport & Meta:**
- [ ] Viewport meta tag with `viewport-fit=cover`
- [ ] Safe area insets for notch/home indicator
- [ ] Use `dvh` instead of `vh` for full-height layouts
- [ ] Test on iOS Safari notch behavior

**Layout Patterns:**
- [ ] Mobile-first Tailwind classes (base styles for mobile, `md:` for desktop)
- [ ] Stack vertically on mobile, horizontal on desktop
- [ ] Hide desktop sidebar on mobile, show bottom nav
- [ ] Full-screen modals on mobile, dialog on desktop
- [ ] Responsive grid: 1 column → 2 columns → 3 columns

**Touch Interactions:**
- [ ] Touch targets ≥44px (use `min-h-11` class)
- [ ] Active states for touch feedback (`:active:scale-95`)
- [ ] Swipe gestures for mobile actions (delete, dismiss)
- [ ] No hover-only interactions on mobile
- [ ] Pull-to-refresh on lists (optional)

**Component Adaptations:**
- [ ] Tables switch to cards on mobile
- [ ] Forms use single column on mobile
- [ ] Dialogs full-screen on mobile
- [ ] Navigation hamburger on mobile
- [ ] Sticky headers with proper z-index

**Typography:**
- [ ] Responsive font sizes: `text-base md:text-lg`
- [ ] Minimum 16px on inputs (prevent iOS zoom)
- [ ] Line height ≥1.5 for readability
- [ ] Truncate long text with ellipsis on mobile

**Testing:**
- [ ] Chrome DevTools responsive mode (all breakpoints)
- [ ] Real iPhone (test notch, safe areas, gestures)
- [ ] Real Android (test navigation, soft keyboard)
- [ ] Landscape orientation
- [ ] Tablet sizes (iPad, Android tablets)

**Current Smart Agent Status:**
- ✅ Tailwind configured with responsive utilities
- ✅ AppSidebar hides on mobile (already responsive)
- ⚠️ Bottom navigation not implemented (sidebar disappears on mobile)
- ⚠️ Some modals/dialogs may need mobile-first adjustments
- ⚠️ Tables need card view fallback on mobile
- ✅ Touch targets generally adequate (buttons use default shadcn sizing)
- ⚠️ Safe area insets not configured for notch support

**Priority Implementation Tasks:**
1. Add bottom navigation for mobile (AppSidebar hidden <768px)
2. Convert document/property tables to cards on mobile
3. Add safe area insets for iPhone notch
4. Implement swipe gestures for document/contact actions
5. Test all pages on mobile viewports
6. Add pull-to-refresh on document lists (optional enhancement)

**Note:** This skill provides responsive web design patterns perfectly suited for Smart Agent. Use this as the **primary reference** for implementing mobile layouts, breakpoints, and touch interactions in our React + Tailwind stack. Unlike the native mobile skills, this one directly applies to web development.

---

### qa-testing-mobile

**When to Use:** Plan and execute comprehensive mobile web QA strategy. Use when defining test coverage, device matrix, automation frameworks, release gates, and quality metrics for mobile-responsive features.

**Mobile Web Testing Strategy (Adapted for Smart Agent):**

**1. Test Layers (Pyramid Approach)**

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

**2. Device + Browser Matrix**

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

**3. Automation Framework Selection**

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

**4. Mobile-Specific Test Coverage**

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

test('retries failed requests @mobile', async ({ page, context }) => {
  // Simulate slow 3G
  await context.route('**/*', route => {
    setTimeout(() => route.continue(), 2000);
  });

  await page.goto('/documents');
  // Should show loading state, then content
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText(/documents/i)).toBeVisible({ timeout: 10000 });
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

**5. Performance Testing Thresholds**

**Mobile Performance Budgets:**

| Metric | Target | Critical Threshold | Test Method |
|--------|--------|--------------------|-------------|
| **First Contentful Paint** | <2s | <3s | Lighthouse mobile |
| **Time to Interactive** | <3s | <5s | Lighthouse mobile |
| **Total Blocking Time** | <200ms | <500ms | Lighthouse mobile |
| **Cumulative Layout Shift** | <0.1 | <0.25 | Lighthouse mobile |
| **Largest Contentful Paint** | <2.5s | <4s | Lighthouse mobile |

**Automated Performance Tests:**

```typescript
// tests/e2e/performance/lighthouse.spec.ts
import { test } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test('meets mobile performance budgets', async ({ page }) => {
  await page.goto('/');

  await playAudit({
    page,
    thresholds: {
      performance: 90,
      accessibility: 95,
      'best-practices': 90,
      seo: 90,
    },
    port: 9222,
    opts: {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
      },
    },
  });
});
```

**6. Flake Management**

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

**7. Release Readiness Checklist**

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

**8. CI/CD Integration**

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

**9. Test Maintenance Strategy**

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

**10. Quality Metrics (SLIs)**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Crash-free sessions** | >99.5% | <99% |
| **Page load time (mobile)** | <2s (p90) | >3s |
| **API success rate** | >99% | <98% |
| **E2E test pass rate** | >95% | <90% |
| **Test flake rate** | <5% | >10% |
| **Lighthouse mobile** | >90 | <85 |

**Smart Agent Mobile QA Roadmap:**

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

**Immediate Actions:**
1. Set up Playwright with mobile device presets
2. Write smoke tests for critical user flows
3. Add Lighthouse mobile to CI/CD
4. Create real device testing checklist
5. Define mobile performance SLIs

**Note:** This skill provides comprehensive QA strategy for native mobile apps (iOS, Android). For Smart Agent (mobile web), apply the **testing pyramid, device matrix planning, flake management, and release gate methodology** using Playwright (E2E), Lighthouse (performance), and real device testing rather than XCUITest, Espresso, or Firebase Test Lab.

---

### ui-ux-pro-max

**When to Use:** Generate comprehensive design systems, select color palettes, choose typography pairings, and get UX best practices for UI components. Use when designing new pages, implementing UI improvements, or reviewing code for UX issues.

**Capabilities:**
- 50+ UI styles (glassmorphism, minimalism, brutalism, neumorphism, bento grid, etc.)
- 97 color palettes organized by product type
- 57 font pairings (Google Fonts)
- 99 UX guidelines (accessibility, touch, performance, layout)
- 25 chart types with recommendations
- 9 tech stacks (React, Next.js, Tailwind, shadcn/ui, etc.)

**Python CLI Tool Required:**

```bash
# Check Python installation
python3 --version  # macOS/Linux
# If not installed: brew install python3 (macOS)

# Skill location
~/.agents/skills/ui-ux-pro-max/scripts/search.py
```

**Primary Workflow:**

**Step 1: Generate Design System (Always Start Here)**

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

**Step 2: Persist Design System (Recommended)**

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

**Step 3: Domain-Specific Searches (As Needed)**

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

**Step 4: Stack-Specific Guidelines**

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

**Critical UX Rules (Priority 1-2):**

**Accessibility (P1 - CRITICAL):**
- ✅ Color contrast ≥4.5:1 for text (use Tailwind semantic colors)
- ✅ Focus states visible on all interactive elements
- ✅ Alt text on images (decorative images use empty alt="")
- ✅ ARIA labels on icon-only buttons
- ✅ Keyboard navigation works (tab order matches visual order)
- ✅ Form labels use `<label>` with `htmlFor` attribute

**Touch & Interaction (P2 - CRITICAL):**
- ✅ Touch targets ≥44px (use `min-h-11 min-w-11`)
- ✅ Loading states on async buttons (disable + spinner)
- ✅ Error feedback near problem (inline form errors)
- ✅ Cursor pointer on clickable elements
- ❌ No hover-only interactions on mobile
- ✅ Primary interactions use click/tap, not hover

**Common Professional UI Issues to Avoid:**

| Issue | ❌ Don't | ✅ Do |
|-------|---------|------|
| **Emoji icons** | 🎨 🚀 ⚙️ in UI | Use Lucide icons (already using) |
| **Layout shift on hover** | `hover:scale-110` causing reflow | `hover:opacity-90` or color change |
| **Low contrast light mode** | `text-gray-400` on `bg-white` | `text-slate-700` minimum |
| **Invisible borders** | `border-white/10` in light mode | `border-gray-200` visible border |
| **Content behind navbar** | Fixed nav without padding compensation | Add `pt-16` for fixed header height |
| **Inconsistent spacing** | Mix of gap-2, gap-4, gap-6 randomly | Use design tokens: gap-4, gap-6, gap-8 |

**Smart Agent Current Design System:**

**Stack:** ✅ React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
**Style:** ✅ Modern minimalism with subtle shadows
**Colors:** ✅ Using Tailwind semantic colors (primary, secondary, muted, accent)
**Typography:** ✅ System fonts with Tailwind typography scale
**Components:** ✅ shadcn/ui (accessible, customizable)

**Design System Improvements Needed:**

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

**Pre-Delivery UX Checklist (From Skill):**

**Visual Quality:**
- [ ] No emojis as UI icons (use Lucide icons only)
- [ ] Consistent icon set across app
- [ ] Hover states don't shift layout
- [ ] Theme colors used correctly (bg-primary, text-muted-foreground)

**Interaction:**
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover/active states provide visual feedback
- [ ] Transitions smooth (150-300ms using Tailwind duration)
- [ ] Focus rings visible for keyboard users

**Light/Dark Mode:**
- [ ] Sufficient contrast in both modes (test with contrast checker)
- [ ] Glass/transparent cards visible in light mode
- [ ] Borders visible in both modes
- [ ] Colors adapt appropriately (semantic Tailwind classes)

**Layout:**
- [ ] Fixed elements have edge spacing (not stuck to edges)
- [ ] Content padding accounts for fixed headers
- [ ] Responsive at key breakpoints (375px, 768px, 1024px)
- [ ] No horizontal scroll on mobile

**Recommended Actions:**
1. Run design system generator for Smart Agent
2. Create design-system/MASTER.md for consistent reference
3. Define page-specific overrides for complex pages (property-search, ai-chat)
4. Apply professional UI rules to existing components
5. Validate against pre-delivery checklist before new feature releases

**Note:** This skill provides a searchable database with Python CLI for design system generation. Use it to **establish consistent design tokens** (colors, typography, spacing) and **validate UX quality** (accessibility, touch targets, performance). The design system generator creates reusable design documentation that ensures consistency across features.

---

### agent-browser

**When to Use:** Automate browser interactions for manual testing, E2E test development, form validation, screenshot generation, and mobile device emulation. Use when manually testing Smart Agent on mobile viewports or debugging user flows.

**Core Use Cases for Smart Agent:**

1. **Manual Mobile Testing**
2. **Screenshot Generation** (documentation, bug reports)
3. **Form Testing** (login, document upload, contact creation)
4. **Mobile Device Emulation** (iPhone, Android)
5. **E2E Test Script Development** (prototype before Playwright)

**Quick Start Workflow:**

```bash
# 1. Navigate to local dev server
agent-browser open http://localhost:8080

# 2. Emulate mobile device
agent-browser set device "iPhone 13 Pro"
# Or set custom viewport
agent-browser set viewport 375 667

# 3. Take snapshot to see interactive elements
agent-browser snapshot -i
# Output: Lists all buttons, inputs, links with refs (@e1, @e2, etc.)

# 4. Interact using refs
agent-browser click @e1                    # Click login button
agent-browser fill @e2 "user@example.com"  # Fill email
agent-browser fill @e3 "password123"       # Fill password
agent-browser click @e4                    # Submit form

# 5. Wait for navigation
agent-browser wait --url "**/documents"

# 6. Take screenshot
agent-browser screenshot login-success-mobile.png
```

**Mobile Testing Scenarios:**

**Test 1: Login Flow on Mobile**
```bash
# iPhone emulation
agent-browser set device "iPhone 13 Pro"
agent-browser open http://localhost:8080/login
agent-browser snapshot -i

# Fill login form (refs from snapshot)
agent-browser fill @email "test@example.com"
agent-browser fill @password "password"
agent-browser click @submit

# Verify success
agent-browser wait --url "**/documents"
agent-browser screenshot mobile-login-success.png
```

**Test 2: Document Upload on Android**
```bash
# Android emulation
agent-browser set device "Pixel 5"
agent-browser open http://localhost:8080/documents
agent-browser snapshot -i

# Click upload button
agent-browser click @upload-btn

# Fill upload dialog (refs from snapshot after dialog opens)
agent-browser snapshot -i
agent-browser upload @file-input ./test-document.pdf
agent-browser fill @category "contract"
agent-browser click @submit-upload

# Verify document appears
agent-browser wait --text "test-document.pdf"
agent-browser screenshot android-upload-success.png
```

**Test 3: Touch Target Validation**
```bash
# Check if buttons meet 44px minimum
agent-browser set device "iPhone 13 Pro"
agent-browser open http://localhost:8080
agent-browser snapshot -i

# Get button dimensions
agent-browser get box @e1
# Output shows width/height - verify ≥44px
```

**Test 4: Dark Mode Testing**
```bash
# Set dark mode preference
agent-browser set media dark
agent-browser open http://localhost:8080

# Take screenshot for visual comparison
agent-browser screenshot dark-mode-home.png

# Switch to light mode
agent-browser set media light
agent-browser screenshot light-mode-home.png
```

**Test 5: Offline Behavior**
```bash
# Simulate offline mode
agent-browser open http://localhost:8080/documents
agent-browser set offline on

# Try to upload document
agent-browser click @upload-btn
# Should show offline error message

# Verify error displayed
agent-browser wait --text "offline"
agent-browser screenshot offline-error.png
```

**Test 6: Network Throttling (Slow 3G)**
```bash
# Note: agent-browser doesn't have built-in throttling
# Use Chrome DevTools Protocol instead:
agent-browser open http://localhost:8080
agent-browser eval "
  const connection = navigator.connection;
  console.log('Network:', connection.effectiveType);
"
```

**Video Recording for Demos:**
```bash
# Record user flow for documentation
agent-browser set device "iPhone 13 Pro"
agent-browser open http://localhost:8080/login
agent-browser record start ./demo-login-mobile.webm

# Perform login flow
agent-browser fill @email "demo@example.com"
agent-browser fill @password "demo123"
agent-browser click @submit
agent-browser wait --url "**/documents"

# Stop recording
agent-browser record stop
# Creates: demo-login-mobile.webm
```

**Debugging Mobile Issues:**
```bash
# Show browser window to see what's happening
agent-browser --headed set device "iPhone 13 Pro"
agent-browser open http://localhost:8080

# View console errors
agent-browser console
agent-browser errors

# Highlight element to verify positioning
agent-browser snapshot -i
agent-browser highlight @e1  # Flash element on screen

# Get computed styles to debug CSS
agent-browser get styles @button
# Shows: font-size, color, background, padding, etc.
```

**Session Management (Parallel Testing):**
```bash
# Test on iOS and Android simultaneously
agent-browser --session ios set device "iPhone 13 Pro"
agent-browser --session ios open http://localhost:8080

agent-browser --session android set device "Pixel 5"
agent-browser --session android open http://localhost:8080

# List active sessions
agent-browser session list
```

**Common Commands for Smart Agent Testing:**

```bash
# Quick mobile snapshot
agent-browser set device "iPhone 13 Pro" && agent-browser open http://localhost:8080 && agent-browser snapshot -i

# Test form with validation
agent-browser open http://localhost:8080/contacts/new
agent-browser snapshot -i
agent-browser fill @name ""  # Empty field
agent-browser click @submit
agent-browser wait --text "required"  # Check validation message

# Check responsive breakpoint
agent-browser set viewport 768 1024  # Tablet
agent-browser reload
agent-browser screenshot tablet-view.png

# Extract text content
agent-browser open http://localhost:8080
agent-browser get text @heading  # Get specific element text
agent-browser get title           # Get page title
```

**Integration with Testing Workflow:**

**Prototype E2E Tests:**
1. Use `agent-browser` to manually test flow
2. Record commands that work
3. Convert to Playwright test:
   ```typescript
   // agent-browser: fill @e1 "test@example.com"
   // Playwright equivalent:
   await page.locator('[data-testid="email-input"]').fill('test@example.com');
   ```

**Mobile Device Presets Available:**
- iPhone SE, iPhone 13 Pro, iPhone 14 Pro Max
- iPad Pro, iPad Mini
- Pixel 5, Pixel 7, Samsung Galaxy S21
- Custom: `agent-browser set viewport <width> <height>`

**When to Use agent-browser vs Playwright:**

| Use Case | Tool | Why |
|----------|------|-----|
| **Manual exploratory testing** | agent-browser | Faster iteration, no test code needed |
| **Quick mobile screenshots** | agent-browser | Simple CLI, easy device emulation |
| **Prototyping test flows** | agent-browser | Validate flow before writing test code |
| **Automated CI/CD testing** | Playwright | Programmatic, parallel, better reporting |
| **Regression test suite** | Playwright | Stable, maintainable, version controlled |

**Practical Examples:**

```bash
# Daily dev workflow: Test feature on mobile
agent-browser set device "iPhone 13 Pro"
agent-browser open http://localhost:8080/documents
agent-browser snapshot -i
agent-browser click @new-project  # Test new feature
agent-browser screenshot feature-test.png

# Bug reproduction
agent-browser --session bug-123 set device "Pixel 5"
agent-browser --session bug-123 open http://localhost:8080/properties
agent-browser --session bug-123 record start bug-123-repro.webm
# Reproduce steps...
agent-browser --session bug-123 record stop

# Accessibility audit
agent-browser open http://localhost:8080
agent-browser snapshot  # Full accessibility tree
# Review ARIA labels, roles, semantic structure
```

**Note:** This skill provides browser automation via CLI tool (agent-browser). Use for **manual mobile testing, screenshot generation, and E2E test prototyping** for Smart Agent. Complements Playwright by enabling quick exploratory testing without writing test code. Particularly useful for mobile device emulation and visual regression checking.

---

### audit-website

**When to Use:** Audit Smart Agent for SEO, performance, security, accessibility, technical, and content issues using the squirrelscan CLI (150+ rules across 20 categories). Use before releases, after major UI changes, or when optimizing for production.

**squirrelscan CLI Required:**

```bash
# Check if installed
squirrel --version

# Install if needed (macOS/Linux)
curl -fsSL https://squirrelscan.com/install | bash
export PATH="$HOME/.local/bin:$PATH"

# Windows (PowerShell)
irm https://squirrelscan.com/install.ps1 | iex
```

**Setup for Smart Agent:**

```bash
# Initialize squirrel config in project root
cd /Users/sam.irizarry/exact-screenshot
squirrel init -n "smart-agent" --force

# This creates squirrel.toml and sets up project database at:
# ~/.squirrel/projects/smart-agent
```

**Audit Workflow:**

**Step 1: Run Audit (Always use --format llm)**

```bash
# Audit local dev server (preferred during development)
npm run dev  # Start server on port 8080
squirrel audit http://localhost:8080 --format llm

# Audit production site (when deployed)
squirrel audit https://smartagent.app --format llm

# Deep audit with full coverage (before release)
squirrel audit http://localhost:8080 --coverage full --format llm
```

**Coverage Modes:**

| Mode | Pages | Use Case |
|------|-------|----------|
| `quick` | 25 | CI checks, daily health monitoring |
| `surface` | 100 | General audits (samples URL patterns) |
| `full` | 500 | Pre-release, comprehensive analysis |

```bash
# Quick daily check (CI/CD)
squirrel audit http://localhost:8080 -C quick --format llm

# Surface audit (default - smart sampling)
squirrel audit http://localhost:8080 --format llm

# Full audit (pre-launch, quarterly deep-dive)
squirrel audit http://localhost:8080 -C full --format llm
```

**Step 2: Fix Issues Systematically**

**Issue Categories to Expect:**

| Category | Likely Issues | Fix Location |
|----------|--------------|--------------|
| **SEO** | Missing meta descriptions, titles too short | Page components, metadata |
| **Technical** | Broken links, slow load times, missing sitemap | Components, routing, build config |
| **Performance** | Large images, unoptimized assets, render blocking | Image optimization, lazy loading |
| **Content** | Missing H1, heading hierarchy, alt text | Page components, content |
| **Security** | Missing CSP headers, HTTP links | Vite config, content files |
| **Accessibility** | Missing alt text, low contrast, no ARIA labels | Components, design system |
| **Mobile** | Touch targets too small, text too small, not responsive | Tailwind classes, component sizing |

**Fix Priority & Targets:**

| Starting Score | Target | Expected Work |
|----------------|--------|---------------|
| <50 (Grade F) | 75+ (C) | Major fixes required |
| 50-70 (Grade D) | 85+ (B) | Moderate fixes |
| 70-85 (Grade C) | 90+ (A) | Polish and optimization |
| >85 (Grade B+) | 95+ (A+) | Fine-tuning |

**🎯 Completion Criteria: Score >95 with --coverage full**

**Step 3: Iterate Until Complete**

```bash
# Fix batch 1 (critical errors)
# ... make fixes ...

# Re-audit to check progress
squirrel audit http://localhost:8080 --format llm

# Fix batch 2 (warnings)
# ... make fixes ...

# Final audit with full coverage
squirrel audit http://localhost:8080 -C full --format llm

# Should see: Score 95+ (Grade A+)
```

**Common Fixes for Smart Agent:**

**Meta Tags (SEO):**
```typescript
// Add to each page component or use react-helmet
<Helmet>
  <title>Documents - Smart Agent</title>
  <meta name="description" content="Manage and analyze real estate documents with AI-powered insights." />
  <meta property="og:title" content="Documents - Smart Agent" />
  <meta property="og:description" content="AI-powered document management for real estate professionals" />
  <meta property="og:image" content="/og-image.png" />
</Helmet>
```

**Image Alt Text:**
```tsx
// ❌ Before
<img src="/logo.png" />

// ✅ After
<img src="/logo.png" alt="Smart Agent - Real Estate AI Assistant" />
```

**Heading Hierarchy:**
```tsx
// ❌ Before: Skips H2, goes straight to H3
<h1>Documents</h1>
<h3>Recent Files</h3>

// ✅ After: Proper hierarchy
<h1>Documents</h1>
<h2>Recent Files</h2>
```

**HTTPS Links:**
```bash
# Fix HTTP links in content (bulk replace)
find src -type f -name "*.tsx" -o -name "*.md" | xargs sed -i '' 's|http://|https://|g'
```

**Structured Data (JSON-LD):**
```typescript
// Add to landing/marketing pages
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Smart Agent",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

**Parallelization Strategy:**

```bash
# If audit finds 20+ files needing alt text
# Spawn subagents to fix in parallel:
# Agent 1: Fix files 1-10
# Agent 2: Fix files 11-20

# If audit finds security headers missing
# Single fix in vite.config.ts or netlify.toml
```

**Audit Commands Reference:**

```bash
# Basic audit
squirrel audit http://localhost:8080 --format llm

# Audit specific pages only
squirrel audit http://localhost:8080 -m 50 --format llm

# Fresh audit (ignore cache)
squirrel audit http://localhost:8080 --refresh --format llm

# View previous audit reports
squirrel report --list

# Export specific audit
squirrel report <audit-id> --format llm

# Filter by severity
squirrel report <audit-id> --severity error --format llm

# Filter by category
squirrel report <audit-id> --category "seo,performance" --format llm

# Export as HTML for sharing
squirrel report <audit-id> --format html -o audit-report.html
```

**Pre-Launch Audit Checklist:**

```bash
# 1. Run full coverage audit
squirrel audit http://localhost:8080 -C full --format llm

# 2. Verify score ≥95 across categories:
# - Core SEO: 95+
# - Technical SEO: 95+
# - Content Quality: 95+
# - Security: 95+
# - Accessibility: 95+
# - Performance: 90+

# 3. Fix all errors (severity: error)
# 4. Fix all warnings (severity: warning)
# 5. Address notices where applicable

# 6. Re-audit production URL after deployment
squirrel audit https://smartagent.app -C full --format llm
```

**Integration with Development:**

```bash
# Daily health check (add to package.json scripts)
"scripts": {
  "audit": "squirrel audit http://localhost:8080 -C quick --format llm",
  "audit:full": "squirrel audit http://localhost:8080 -C full --format llm"
}

# Run audit
npm run audit

# CI/CD integration (GitHub Actions)
# Add to .github/workflows/audit.yml
- name: Audit website
  run: |
    squirrel audit https://preview-${{ github.event.number }}.vercel.app -C surface --format llm
```

**When to Audit:**

- ✅ Before major releases (full coverage)
- ✅ After significant UI/UX changes
- ✅ Weekly during active development (surface coverage)
- ✅ After deploying to production (verify live site)
- ✅ When SEO performance drops (analytics data)
- ✅ Before marketing campaigns (ensure quality)

**Expected Issues for Smart Agent:**

Based on typical SaaS apps, expect to find:
- Missing meta descriptions on some pages
- Images without alt text (especially dynamic content)
- Potential heading hierarchy issues
- Missing structured data (JSON-LD)
- Performance optimization opportunities
- Missing security headers (CSP, X-Frame-Options)
- Mobile-specific issues (touch targets, font sizes)

**Fix All Issues, Don't Stop Early:**
- Iterate: Fix batch → re-audit → fix remaining → re-audit
- Parallelize: Use subagents for bulk content fixes (alt text, headings)
- Target: Score 95+ with full coverage before considering complete
- Only pause for issues requiring human judgment (e.g., broken external links)

**Note:** This skill provides website auditing via squirrelscan CLI (150+ rules). Use to **comprehensively audit Smart Agent** for SEO, performance, security, accessibility, and technical issues. Run audits before releases and iterate until score >95. Particularly valuable for catching mobile-specific issues, accessibility violations, and performance regressions.

---

### brainstorming

**When to Use:** REQUIRED before creating features, building components, adding functionality, or modifying behavior. Use to explore user intent, refine requirements, and validate design approach through collaborative dialogue before implementation.

**Process:**

**1. Understanding Phase**
- ✅ Check current project state (read relevant files, recent commits)
- ✅ Ask questions **one at a time** to refine the idea
- ✅ Prefer multiple-choice questions when possible (easier to answer)
- ✅ Focus on: purpose, constraints, success criteria, user needs

**Example Questions:**
```
Q: "What's the primary goal of this feature?"
   A) Improve user efficiency
   B) Add new capability
   C) Fix existing problem
   D) Other (please specify)

Q: "Who will use this feature most?"
   A) Real estate agents (primary users)
   B) Admins managing teams
   C) Both equally

Q: "Should this work offline or require internet?"
   A) Must work offline
   B) Online only is fine
   C) Graceful degradation preferred
```

**2. Exploring Approaches**
- ✅ Propose 2-3 different approaches with trade-offs
- ✅ Lead with recommended option and explain why
- ✅ Present conversationally, not as formal list

**Example:**
```
I see three approaches for mobile navigation:

**Option A: Bottom Tab Bar (Recommended)**
Most mobile-friendly. Users expect tabs at the bottom on iOS/Android.
Requires: New MobileBottomNav component, route active state tracking.
Trade-off: Takes vertical space (56px), but feels native.

**Option B: Hamburger Menu**
Saves screen space. Standard pattern users understand.
Trade-off: Extra tap to access navigation. Less discoverable.

**Option C: Hybrid (Bottom tabs + More menu)**
Best of both worlds - 4 main tabs, overflow in "More".
Trade-off: More complex to implement, may confuse users.

My recommendation: Option A for Smart Agent because real estate agents
need quick access to Documents/Properties/Contacts while on the go.
```

**3. Presenting Design (Incremental Validation)**
- ✅ Present design in **200-300 word sections**
- ✅ Ask after each section: "Does this look right so far?"
- ✅ Cover: architecture, components, data flow, error handling, testing
- ✅ Be ready to go back and clarify

**Example Sectioned Design:**
```
Section 1: Component Architecture
---
We'll create a MobileBottomNav component with 4 tabs: Chat, Documents,
Properties, Contacts. It'll use React Router's useLocation to highlight
the active tab. The component will be fixed to the bottom with z-50,
hidden on desktop (md:hidden).

Does this look right so far?

[Wait for confirmation]

Section 2: Responsive Integration
---
AppLayout will render MobileBottomNav below the main content on mobile.
We'll add pb-16 to the main area to prevent content from hiding behind
the nav. On desktop (md:), the sidebar remains visible and bottom nav is hidden.

Does this approach work for you?

[Continue after validation]
```

**4. Documentation (After Validation)**

```bash
# Save validated design to docs/plans/
# Format: YYYY-MM-DD-<topic>-design.md
# Example: docs/plans/2026-01-29-mobile-bottom-navigation-design.md

# Commit to git
git add docs/plans/2026-01-29-mobile-bottom-navigation-design.md
git commit -m "Add mobile bottom navigation design document"
```

**5. Implementation Transition (Optional)**

After design validated:
```
Ready to set up for implementation?

[If yes:]
- Create git worktree for isolated development
- Create detailed implementation plan
- Begin implementation following design
```

**Key Principles:**

| Principle | Application |
|-----------|-------------|
| **One question at a time** | Don't ask "What's the goal AND who uses it AND..." |
| **Multiple choice preferred** | Faster for user, clearer options |
| **YAGNI ruthlessly** | Remove unnecessary features from designs |
| **Explore alternatives** | Always propose 2-3 approaches |
| **Incremental validation** | Present 200-300 words → validate → continue |
| **Be flexible** | Go back and clarify when needed |

**When to Use Brainstorming for Smart Agent:**

**New Features (Always):**
- "Add export to Excel feature" → Brainstorm: format, which data, filtering?
- "Implement notifications" → Brainstorm: push/email, triggers, frequency?
- "Add team collaboration" → Brainstorm: permissions, sharing model, real-time?

**UI/UX Changes (Required):**
- "Redesign property cards" → Brainstorm: layout, info hierarchy, mobile?
- "Improve AI chat UX" → Brainstorm: streaming indicators, source citations, mobile?
- "Add bottom navigation" → Brainstorm: which tabs, icons, active states?

**Architectural Decisions (Critical):**
- "Add real-time updates" → Brainstorm: WebSockets vs polling, conflicts, fallback?
- "Implement document sharing" → Brainstorm: permissions model, link types, expiration?
- "Add email notifications" → Brainstorm: provider (SendGrid/SES), triggers, templates?

**Don't Use for:**
- Bug fixes (unless design change needed)
- Simple refactoring (unless architectural)
- Documentation updates
- Dependency upgrades

**Example Workflow for Mobile UI Improvements:**

```
User: "Make the app mobile-friendly"

Brainstorming:
1. Check current mobile state (read AppLayout, AppSidebar, responsive classes)
2. Ask: "What's the top priority?"
   A) Bottom navigation for mobile
   B) Optimize forms for touch
   C) Improve property card layout
   D) All of the above

[User chooses A]

3. Ask: "Which sections should be in bottom nav?"
   A) 4 tabs: Chat, Documents, Properties, Contacts
   B) 5 tabs: Add Pipeline to above
   C) 3 tabs: Home, Documents, Profile (simplified)

[User chooses A]

4. Present design section 1 (architecture)
   Wait for validation

5. Present design section 2 (responsive behavior)
   Wait for validation

6. Present design section 3 (implementation details)
   Wait for validation

7. Save to docs/plans/2026-01-29-mobile-bottom-nav-design.md
8. Ask: "Ready to implement?"
```

**Note:** This skill enforces **design-before-implementation** workflow. Use **BEFORE** building features or making significant changes. The incremental validation approach (ask one question, present one section, validate before continuing) ensures alignment and prevents wasted effort on wrong assumptions.

---

### copywriting

**When to Use:** Write or improve marketing copy for landing pages, feature pages, pricing pages, CTAs, error messages, onboarding flows, or any user-facing text. Use when optimizing conversion, clarifying value propositions, or improving UX microcopy.

**Core Principles:**

| Principle | Bad Example | Good Example |
|-----------|-------------|--------------|
| **Clarity > Cleverness** | "Synergize your workflow" | "Manage documents in one place" |
| **Benefits > Features** | "AI-powered search" | "Find any clause in seconds" |
| **Specific > Vague** | "Save time" | "Cut document review from 2 hours to 10 minutes" |
| **Customer Language** | "Document intelligence platform" | "Your AI assistant for real estate paperwork" |
| **Active > Passive** | "Documents are analyzed" | "We analyze your documents" |
| **Show > Tell** | "Very fast" | "Results in under 3 seconds" |

**Before Writing - Gather Context:**

1. **Page Purpose**: Homepage, landing page, pricing, feature page, about?
2. **Primary Action**: What should users do? (Sign up, start trial, book demo, learn more)
3. **Audience**: Real estate agents, brokers, teams?
4. **Problem**: What pain are they trying to solve?
5. **Differentiation**: What makes Smart Agent unique vs competitors?

**Smart Agent Context:**
- **Product**: AI assistant for real estate professionals
- **Core Value**: Analyze documents, manage CRM, chat with AI about deals
- **Primary Users**: Real estate agents drowning in paperwork
- **Key Benefit**: Turn hours of document review into minutes
- **Differentiation**: Multi-document chat, real estate-specific AI

**Copywriting Patterns for SaaS:**

**Headlines (H1):**
```
❌ "The Future of Real Estate Technology"
✅ "Your AI Assistant for Real Estate Documents"

❌ "Streamline Your Workflow with Smart Agent"
✅ "Analyze Contracts in Minutes, Not Hours"
```

**Subheadlines (H2):**
```
❌ "Innovative AI-Powered Platform"
✅ "Upload a contract. Ask questions. Get instant answers."
```

**CTAs (Call to Action):**
```
❌ "Get Started"
✅ "Start Free Trial - No Credit Card"

❌ "Learn More"
✅ "See How It Works (2 min demo)"

❌ "Sign Up"
✅ "Analyze Your First Document Free"
```

**Feature Descriptions:**
```
❌ "Advanced AI capabilities for document analysis"
✅ "Ask 'What's the closing date?' — Get answers from any document instantly"

❌ "Comprehensive CRM solution"
✅ "Track every contact, property, and deal in one place"

❌ "Multi-document intelligent search"
✅ "Search across all your documents like talking to a colleague"
```

**Error Messages (UX Microcopy):**
```
❌ "Upload failed"
✅ "Couldn't upload document. Check your connection and try again."

❌ "Invalid input"
✅ "Email address should look like: name@example.com"

❌ "Error 500"
✅ "Something went wrong on our end. We're looking into it."
```

**Onboarding (Empty States):**
```
❌ "No documents"
✅ "No documents yet. Upload your first contract to get started."

❌ "No results"
✅ "No properties match your search. Try adjusting your filters."
```

**Style Rules for Smart Agent:**

1. **Simple words**: Use → Utilize, Help → Facilitate, Buy → Purchase
2. **Remove filler**: "very," "really," "actually," "basically"
3. **Active voice**: "We analyze" not "Documents are analyzed"
4. **No exclamation points** (feels pushy in B2B SaaS)
5. **Honest claims**: Never fabricate statistics or testimonials
6. **Avoid buzzwords**: "Streamline," "Optimize," "Revolutionary," "Game-changing"

**Application Areas in Smart Agent:**

```tsx
// Homepage hero section
<h1>Your AI Assistant for Real Estate Documents</h1>
<p>Upload contracts, disclosures, and inspections. Ask questions in plain English. Get instant answers.</p>
<Button>Start Free 14-Day Trial</Button>

// Feature benefit (not feature list)
❌ "Multi-document RAG chat with vector embeddings"
✅ "Ask one question across all your documents. Like searching your entire filing cabinet instantly."

// Pricing page value prop
❌ "Professional Plan - $49/month"
✅ "Professional - $49/month
    Everything in Starter, plus:
    • Unlimited AI questions
    • 500 documents
    • Priority support

    Perfect for agents closing 5+ deals/month"

// Trial banner copy (already implemented)
✅ "5 days left in your trial"  // Clear, specific
✅ "Upgrade Now"                // Direct CTA

// Empty state copy
❌ "No contacts"
✅ "No contacts yet. Add your first client to track deals and communication."
```

**Content Checklist:**

Before publishing copy:
- [ ] Jargon-free (understandable to non-technical agents)
- [ ] One idea per section
- [ ] Benefits clearly stated (not just features)
- [ ] Specific numbers where possible ("2 hours to 10 minutes" not "faster")
- [ ] Customer language (not company jargon)
- [ ] Direct CTAs (what happens when they click)
- [ ] No exclamation points
- [ ] Active voice throughout
- [ ] Mobile-friendly (short sentences, scannable)

**Quick Copy Audit:**
1. Read aloud - Does it sound natural?
2. So what test - After each claim, ask "So what?" Can you answer?
3. Clarity test - Would your grandma understand it?
4. Benefit test - Does it answer "What's in it for me?"

**Note:** This skill provides conversion copywriting techniques for marketing pages and UX microcopy. Use for **landing pages, feature descriptions, CTAs, error messages, onboarding flows, and empty states**. Apply principles to improve clarity, conversion, and user experience throughout Smart Agent's interface.

---

### writing-plans

**When to Use:** Create detailed implementation plans with task breakdowns, file lists, testing strategies, and acceptance criteria. Use after brainstorming/design phase and before implementation.

**Purpose:** Structure complex features into actionable tasks with clear deliverables, dependencies, and success metrics.

**Plan Structure:**
- Context and goals
- Technical approach
- File changes (create, modify, delete)
- Task breakdown with estimates
- Testing strategy
- Acceptance criteria
- Risks and mitigations

**Example:** See Sprint 7 plan already created - this skill would formalize that format for future features.

---

### executing-plans

**When to Use:** Execute implementation plans systematically with progress tracking, checkpoint validation, and quality gates. Use when implementing features from a validated plan.

**Purpose:** Ensure plans are followed methodically with validation at each milestone, preventing scope creep and ensuring quality.

**Execution Pattern:**
- Check prerequisites
- Implement tasks in dependency order
- Validate at checkpoints
- Run tests after each major step
- Document deviations from plan
- Update plan if requirements change

---

### web-artifacts-builder

**When to Use:** Build standalone web artifacts (HTML/CSS/JS prototypes, landing pages, demos) for quick iteration or client previews. Use for rapid prototyping before integrating into main app.

**Purpose:** Create self-contained web artifacts for testing design concepts, gathering feedback, or building isolated components.

**Use Cases:**
- Prototype new UI patterns before full implementation
- Build demo pages for user testing
- Create standalone landing pages
- Rapid iteration on mobile designs

---

### social-content

**When to Use:** Write social media content (Twitter/X, LinkedIn, Facebook) for product launches, feature announcements, tips, or engagement. Use when promoting Smart Agent features or sharing updates.

**Purpose:** Create platform-optimized social content that drives awareness and engagement.

**Platform Guidelines:**
- **Twitter/X**: 280 chars, punchy, hook in first line
- **LinkedIn**: Professional, value-driven, 1-3 paragraphs
- **Facebook**: Conversational, community-focused

**Example for Smart Agent:**
```
Twitter: "Upload a 40-page contract. Ask 'What's the contingency period?' Get an answer in 3 seconds. That's Smart Agent. Try it free → [link]"

LinkedIn: "Real estate agents spend 4+ hours/week reviewing contracts. Smart Agent's AI reads documents instantly and answers questions in plain English. Our beta users are closing deals 30% faster. Free trial → [link]"
```

---

### mcp-builder

**When to Use:** Build Model Context Protocol (MCP) servers to expose Smart Agent's capabilities to AI agents (Claude, Copilot) for autonomous development and operations.

**Purpose:** Create custom MCP servers that allow AI agents to interact with Smart Agent's backend, database, and deployment infrastructure.

**Framework:** TypeScript MCP SDK (recommended for Smart Agent - matches our stack)

**Potential MCP Servers for Smart Agent:**

**1. Smart Agent Dev MCP** (Recommended for your use case)
```typescript
// Tools to expose:
- list_documents(tenant_id) → Get documents for analysis
- query_database(table, filters) → Read Supabase tables
- run_migration(migration_file) → Execute database migrations
- deploy_edge_function(function_name) → Deploy to Supabase
- check_build_status() → Get CI/CD status
- read_logs(function_name, limit) → Get edge function logs
- create_test_data(type) → Seed test data for development
```

**2. Supabase MCP** (If one doesn't already exist)
```typescript
// Tools to expose:
- query(table, select, filters) → Run Supabase queries
- insert(table, data) → Insert records
- update(table, id, data) → Update records
- call_rpc(function_name, params) → Call database functions
- get_schema(table) → Get table structure
- check_rls(table) → Validate RLS policies
```

**Building Your MCP:**

```bash
# 1. Create MCP server project
mkdir smart-agent-mcp
cd smart-agent-mcp
npm init -y
npm install @modelcontextprotocol/sdk

# 2. Create server with tools (TypeScript)
# See mcp-builder skill references for full implementation guide

# 3. Configure in Claude Code
# Add to ~/.config/claude/config.json:
{
  "mcpServers": {
    "smart-agent-dev": {
      "command": "node",
      "args": ["/path/to/smart-agent-mcp/dist/index.js"]
    }
  }
}

# 4. Test the MCP server
# Claude Code will now have access to your custom tools
```

**Autonomous Development Capabilities:**

With a Smart Agent Dev MCP, AI agents could:
- ✅ Read current project structure and database schema
- ✅ Query production data for debugging
- ✅ Run database migrations
- ✅ Deploy edge functions
- ✅ Monitor logs and errors
- ✅ Create test data
- ⚠️ **Cannot**: Directly modify code files (would need file system MCP)
- ⚠️ **Cannot**: Run git commands (would need separate git MCP)

**Recommendation:**
Build a **read-only Smart Agent MCP first** (query database, read logs, check status) before adding write operations. This minimizes risk while providing valuable development tools.

---

### ai-chat

**When to Use:** Reference implementation patterns for AI chat features. Smart Agent already has AI chat implemented - use this skill to compare patterns or improve existing implementation.

**Already Implemented in Smart Agent:**
- ✅ Multi-document RAG chat (ai-chat edge function)
- ✅ Streaming responses with SSE
- ✅ Conversation persistence (ai_conversations, ai_messages tables)
- ✅ Document context injection
- ✅ Embedded components (property cards)

**Use This Skill For:**
- Comparing our implementation vs best practices
- Adding features like conversation titles, sharing, export
- Optimizing streaming performance
- Improving error handling patterns

---

## Skills Summary

**Mobile & Responsive (6 skills):**
- mobile-ios-design → iOS HIG principles for web
- mobile-android-design → Material Design 3 for web
- mobile-design → Mobile-first doctrine & MFRI
- mobile-development → Cross-platform best practices
- mobile-responsiveness → Tailwind responsive patterns ⭐ PRIMARY
- mobile-app-testing → Testing strategies

**Quality & Testing (3 skills):**
- mobile-app-debugging → Debugging mobile web issues
- qa-testing-mobile → QA strategy & device matrix
- audit-website → squirrelscan CLI for comprehensive audits

**UI/UX & Design (2 skills):**
- ui-ux-pro-max → Design system generator ⭐ PRIMARY
- copywriting → Marketing & UX copy

**Development Process (3 skills):**
- brainstorming → Design-before-implementation ⭐ USE FIRST
- writing-plans → Structured implementation plans
- executing-plans → Systematic execution with validation

**Tools & Integration (2 skills):**
- agent-browser → Browser automation CLI
- mcp-builder → Build MCP servers for AI agent integration ⭐ FOR YOUR MCP QUESTION
- ai-chat → AI chat patterns reference
