---
name: smart-agent-mobile-design
description: Apply mobile-first engineering doctrine when implementing mobile-responsive features for Smart Agent
---

# Mobile Design Doctrine

**When to Use:** Apply mobile-first engineering doctrine when implementing ANY mobile-responsive features. Use to avoid desktop-thinking, validate mobile feasibility, ensure touch-first interactions, and optimize performance for mobile web.

## Core Philosophy
- **Touch-First**: Finger ≠ cursor. Design for imprecise taps, not hover states.
- **Battery-Conscious**: Minimize animations, optimize re-renders, reduce network calls.
- **Platform-Respectful**: iOS and Android have different conventions - respect both.
- **Offline-Capable**: Handle poor network gracefully, show loading states, enable retries.

## Mobile Feasibility & Risk Index (MFRI)

Assess before implementing mobile features:

| Dimension | Assessment for Smart Agent Web App |
|-----------|-----------------------------------|
| **Platform Clarity** | ✅ Web responsive (iOS Safari + Android Chrome) |
| **Interaction Complexity** | Medium (forms, lists, modals, chat) |
| **Performance Risk** | Medium (large document lists, AI streaming) |
| **Offline Dependence** | High (requires network for AI, sync) |
| **Accessibility Risk** | Medium (complex forms, real-time updates) |

**MFRI Score:** ~3-4 (Moderate) → Requires performance validation + progressive enhancement

## Key Constraints for Web Mobile

### 1. Touch Targets (Critical)
- Minimum 44px height on all clickable elements
- Use `min-h-11` (44px) or `h-12` (48px) for buttons on mobile
- Increase tap area with invisible padding: `p-3` on icon buttons
- Space interactive elements 8px minimum (`gap-2`)

### 2. Performance Optimization
- ❌ NEVER: `Array.map()` for 100+ items without virtualization
- ✅ ALWAYS: Use `react-window` or `@tanstack/react-virtual` for long lists
- ❌ NEVER: Inline functions in renderItem callbacks
- ✅ ALWAYS: `useCallback` + `React.memo` for list items
- Monitor: Use React DevTools Profiler for re-render analysis

### 3. Network & Offline Handling
- Show explicit loading states (spinners, skeletons)
- Handle errors with retry buttons
- Debounce search inputs (300-500ms)
- Cache data with React Query (staleTime, cacheTime)
- Show "Offline" banner when network lost

### 4. Mobile-Specific UX Patterns
- **Bottom sheets** for actions on mobile (use shadcn Sheet component)
- **Full-screen modals** on mobile (`sm:max-w-lg` for desktop dialogs)
- **Pull-to-refresh** on lists (swipe down gesture)
- **Swipe actions** for delete/archive (gesture libraries)
- **Fixed bottom navigation** instead of sidebar (`md:hidden`)

### 5. Anti-Patterns to Avoid
- ❌ Hover-only interactions (no hover on touch devices)
- ❌ Small text inputs (<16px triggers iOS zoom)
- ❌ Thin scrollbars or custom scroll behavior
- ❌ Dense tables on mobile (use card layout instead)
- ❌ Multi-step forms without progress indicator
- ❌ Auto-playing videos or heavy animations

### 6. Security for Mobile Web
- ✅ Tokens stored in memory (React state) or httpOnly cookies
- ✅ HTTPS only in production
- ❌ Never log auth tokens or PII to console
- ✅ Validate file uploads client-side (type, size)

## Mobile Development Checklist
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

## Performance Monitoring

```bash
# Check for performance issues
npm run build
# Analyze bundle size
npx vite-bundle-visualizer

# Lighthouse mobile audit
npx lighthouse https://localhost:8080 --preset=mobile --view
```

## Mobile Testing Strategy
1. **Chrome DevTools** (responsive mode) - Initial layout check
2. **Real iOS device** (Safari) - Touch interactions, gestures, performance
3. **Real Android device** (Chrome) - Material Design consistency
4. **Slow 3G throttling** - Network resilience testing
5. **Battery saver mode** - Performance under constraints

**Note:** This skill provides mobile engineering doctrine for React Native/Flutter. For Smart Agent (React web app), apply the **principles** (touch-first, performance-conscious, offline-aware) rather than framework-specific code. Use this skill to guide mobile-responsive decisions and validate UX patterns.
