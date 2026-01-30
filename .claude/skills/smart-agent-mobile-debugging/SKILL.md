---
name: smart-agent-mobile-debugging
description: Debug mobile-specific issues including performance, network, device-specific bugs, and responsive layout problems
---

# Mobile App Debugging

**When to Use:** Debug mobile-specific issues including performance problems, network failures, device-specific bugs, touch interaction issues, and responsive layout problems on mobile web.

## Mobile Web Debugging Tools & Techniques

### 1. Chrome DevTools (Primary Tool)

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

### 2. iOS Safari Web Inspector (Required for iOS Testing)

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

### 3. Common Mobile Web Debugging Scenarios

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

### 4. Mobile-Specific Bug Patterns

| Issue | Symptom | Debug Method | Solution |
|-------|---------|--------------|----------|
| **iOS Input Zoom** | Input focus zooms page | Check font-size <16px | Set `font-size: 16px` minimum on inputs |
| **Position Fixed** | Header jumps on scroll | Test on real iOS Safari | Use `position: sticky` or adjust with viewport units |
| **Touch Delay** | 300ms click delay | Check if using :hover | Remove hover states, use touch events |
| **Viewport Height** | Layout breaks on scroll | Using `100vh` | Use `100dvh` (dynamic viewport height) |
| **Memory Crash** | Page reloads on navigation | Memory profiling | Reduce image sizes, clear unused state |
| **Slow Scrolling** | Janky scroll on lists | Performance tab, FPS meter | Implement virtual scrolling |

### 5. Mobile Debugging Workflow

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

### 6. Debugging Checklist

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

## Debugging Tools for Smart Agent

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

## Mobile Browser Quirks

| Browser | Quirk | Workaround |
|---------|-------|------------|
| **iOS Safari** | 100vh includes address bar | Use `100dvh` (dynamic vh) |
| **iOS Safari** | Input zoom if <16px | Set `font-size: 16px` on inputs |
| **iOS Safari** | Touch delay on clickable divs | Add `cursor: pointer` or use `<button>` |
| **iOS Safari** | Position fixed + keyboard issues | Test keyboard open/close behavior |
| **Android Chrome** | Different font rendering | Test typography on real device |
| **Android Chrome** | Pull-to-refresh conflicts | Use `overscroll-behavior: contain` |

## Emergency Debugging Commands

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

## Production Monitoring (Future)

- Sentry for error tracking (mobile browser context)
- Web Vitals for performance monitoring
- LogRocket for session replay (see user interactions)
- Google Analytics for mobile vs desktop usage patterns

**Note:** This skill provides native mobile app debugging techniques (Xcode, Android Studio). For Smart Agent (mobile web), apply the **debugging methodology and issue patterns** using Chrome DevTools (Android), Safari Web Inspector (iOS), network throttling, performance profiling, and real device testing rather than native debugging tools.
