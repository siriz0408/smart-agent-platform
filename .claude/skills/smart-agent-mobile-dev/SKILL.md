---
name: smart-agent-mobile-dev
description: Apply comprehensive mobile development best practices for production-ready mobile web experiences
---

# Mobile Development

**When to Use:** Apply comprehensive mobile development best practices when building mobile-responsive features. Use for performance budgets, architecture decisions, testing strategies, and ensuring production-ready mobile web experiences.

## Performance Budgets for Mobile Web

| Metric | Target | Smart Agent Status |
|--------|--------|-------------------|
| **Initial Load** | <2s to interactive | Verify with Lighthouse |
| **Screen Load** | <1s for cached data | ✅ React Query caching |
| **API Requests** | <3s timeout | ✅ Supabase edge functions |
| **Memory** | <100MB typical screens | Monitor with DevTools |
| **Frame Rate** | 60 FPS (16.67ms/frame) | Test animations on device |
| **Bundle Size** | <500KB initial JS | Check with `vite-bundle-visualizer` |

## Mobile-First Architecture Principles

### 1. State Management
- ✅ Using: React Query for server state (caching, revalidation)
- ✅ Using: React useState/Context for UI state
- Pattern: Zustand recommended if app state grows complex
- Keep state minimal - derive computed values

### 2. Offline-First Strategy
- React Query staleTime for offline tolerance
- Service workers for offline page loading (optional)
- Optimistic updates with rollback on error
- Clear offline/online status indicators

### 3. Data Persistence
- ✅ Current: Supabase (server-side persistence)
- Client-side: localStorage for preferences only
- IndexedDB for large offline datasets (if needed)
- Never store tokens in localStorage (memory only)

### 4. Network Optimization
- Batch API requests where possible
- Debounce search inputs (300-500ms)
- ✅ Using: React Query for deduplication
- Pagination for large lists (implement infinite scroll)
- Progressive image loading

## Mobile Testing Strategy

### 1. Performance Testing
```bash
# Lighthouse mobile audit
npm run build
npx lighthouse http://localhost:8080 --preset=mobile --view

# Bundle size analysis
npx vite-bundle-visualizer

# Target: Performance score >90, FCP <2s
```

### 2. Cross-Device Testing
- Chrome DevTools responsive mode (quick iteration)
- iOS Safari (real iPhone) - Required before release
- Android Chrome (real device) - Required before release
- iPad/tablet sizes (responsive breakpoints)
- Slow 3G network throttling

### 3. Accessibility Testing
- VoiceOver (iOS) and TalkBack (Android) testing
- Keyboard navigation (for tablet users)
- Color contrast ratio ≥4.5:1
- Focus indicators visible
- ARIA labels on interactive elements

## Security Best Practices (OWASP Mobile)

| Risk | Mitigation in Smart Agent |
|------|--------------------------|
| **Insecure Data Storage** | ✅ Tokens in memory, httpOnly cookies for refresh |
| **Insecure Communication** | ✅ HTTPS only, Supabase handles SSL |
| **Insecure Authentication** | ✅ Supabase Auth with JWT, RLS policies |
| **Client Code Tampering** | ⚠️ Minimize sensitive logic in frontend |
| **Reverse Engineering** | ⚠️ Obfuscate build, env vars server-side only |

## Mobile Optimization Checklist
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

## 10 Commandments Applied to Smart Agent

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

## Pre-Release Mobile Checklist
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
