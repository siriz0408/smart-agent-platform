---
name: smart-agent-responsive
description: Implement mobile-first responsive layouts using Tailwind breakpoints (PRIMARY skill for Smart Agent mobile)
---

# Mobile Responsiveness

**When to Use:** Implement mobile-first responsive layouts using Tailwind breakpoints. Use when building adaptive components, implementing touch interactions, creating mobile navigation, or ensuring proper viewport handling across devices.

## Tailwind Breakpoints (Mobile-First)

Smart Agent uses Tailwind's default breakpoints (mobile-first approach):

```typescript
// Default styles = Mobile (< 640px)
// sm: 640px+   (Large phones, small tablets)
// md: 768px+   (Tablets)
// lg: 1024px+  (Laptops, small desktops)
// xl: 1280px+  (Large desktops)
// 2xl: 1536px+ (Extra large screens)
```

## Responsive Layout Patterns

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

## Touch Interaction Patterns

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

## Mobile Navigation Implementation

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

## Safe Area Support (iPhone Notch)

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

## Viewport Units (iOS Safe)

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

## useMediaQuery Hook

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

## Responsive Component Examples for Smart Agent

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

## Mobile Responsiveness Checklist

### Viewport & Meta
- [ ] Viewport meta tag with `viewport-fit=cover`
- [ ] Safe area insets for notch/home indicator
- [ ] Use `dvh` instead of `vh` for full-height layouts
- [ ] Test on iOS Safari notch behavior

### Layout Patterns
- [ ] Mobile-first Tailwind classes (base styles for mobile, `md:` for desktop)
- [ ] Stack vertically on mobile, horizontal on desktop
- [ ] Hide desktop sidebar on mobile, show bottom nav
- [ ] Full-screen modals on mobile, dialog on desktop
- [ ] Responsive grid: 1 column → 2 columns → 3 columns

### Touch Interactions
- [ ] Touch targets ≥44px (use `min-h-11` class)
- [ ] Active states for touch feedback (`:active:scale-95`)
- [ ] Swipe gestures for mobile actions (delete, dismiss)
- [ ] No hover-only interactions on mobile
- [ ] Pull-to-refresh on lists (optional)

### Component Adaptations
- [ ] Tables switch to cards on mobile
- [ ] Forms use single column on mobile
- [ ] Dialogs full-screen on mobile
- [ ] Navigation hamburger on mobile
- [ ] Sticky headers with proper z-index

### Typography
- [ ] Responsive font sizes: `text-base md:text-lg`
- [ ] Minimum 16px on inputs (prevent iOS zoom)
- [ ] Line height ≥1.5 for readability
- [ ] Truncate long text with ellipsis on mobile

### Testing
- [ ] Chrome DevTools responsive mode (all breakpoints)
- [ ] Real iPhone (test notch, safe areas, gestures)
- [ ] Real Android (test navigation, soft keyboard)
- [ ] Landscape orientation
- [ ] Tablet sizes (iPad, Android tablets)

## Current Smart Agent Status
- ✅ Tailwind configured with responsive utilities
- ✅ AppSidebar hides on mobile (already responsive)
- ⚠️ Bottom navigation not implemented (sidebar disappears on mobile)
- ⚠️ Some modals/dialogs may need mobile-first adjustments
- ⚠️ Tables need card view fallback on mobile
- ✅ Touch targets generally adequate (buttons use default shadcn sizing)
- ⚠️ Safe area insets not configured for notch support

## Priority Implementation Tasks
1. Add bottom navigation for mobile (AppSidebar hidden <768px)
2. Convert document/property tables to cards on mobile
3. Add safe area insets for iPhone notch
4. Implement swipe gestures for document/contact actions
5. Test all pages on mobile viewports
6. Add pull-to-refresh on document lists (optional enhancement)

**Note:** This skill provides responsive web design patterns perfectly suited for Smart Agent. Use this as the **primary reference** for implementing mobile layouts, breakpoints, and touch interactions in our React + Tailwind stack. Unlike the native mobile skills, this one directly applies to web development.
