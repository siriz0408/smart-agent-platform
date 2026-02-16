# PM-Experience Memory

> **Last Updated:** 2026-02-15 (Cycle 15 - Animation Polish)
> **Purpose:** Retain learnings, patterns, and context across cycles

---

## Key Learnings

### Architecture Patterns Discovered

**Theme System Pattern:**
- Use `next-themes` for theme management (light/dark/system)
- Prevent FOUC with inline script in `index.html`
- Dynamic `meta theme-color` for mobile
- Theme context provides `theme`, `setTheme`, `resolvedTheme`

**Component Pattern:**
- Use shadcn/ui components as base
- Tailwind CSS for styling
- Mobile-first responsive design
- Accessibility (WCAG 2.1 AA) required

**Layout Pattern:**
- Sidebar navigation (desktop)
- Bottom navigation (mobile - future)
- Responsive breakpoints: sm, md, lg, xl
- Consistent padding: p-4 mobile, p-6 desktop

### Common Issues & Solutions

**Issue:** Navigation cluttered
- **Solution:** Use dropdown for secondary nav items (Help, Admin, Settings)
- **Pattern:** Keep primary nav clean, secondary items in dropdown

**Issue:** Workspace not centered
- **Solution:** Use `mx-auto` and `max-w-*` classes
- **Pattern:** Consistent centering across pages

**Issue:** Chat history lacks padding
- **Solution:** Add responsive padding (p-4 mobile, p-6 desktop)
- **Pattern:** Minimum 16px padding for touch targets

**Issue:** FOUC (Flash of Unstyled Content)
- **Solution:** Inline script in `index.html` sets theme before render
- **Pattern:** Critical CSS inline, theme set early

**Issue:** UI feels static/unresponsive
- **Solution:** Add micro-interactions with consistent timing
- **Pattern:** Use `transition-all duration-200 ease-out` for most interactions
- **Pattern:** Use `active:scale-[0.98]` for button press feedback
- **Pattern:** Use `hover:-translate-y-0.5` for card lift effect
- **Pattern:** Use shimmer effect for skeleton loading states

### Domain-Specific Knowledge

**Design System:**
- Colors: Defined in CSS variables
- Typography: System fonts (-apple-system, BlinkMacSystemFont)
- Spacing: Tailwind scale (4px base)
- Components: shadcn/ui library

**Accessibility:**
- WCAG 2.1 AA compliance required
- Keyboard navigation support
- Screen reader friendly
- Focus indicators visible

**Mobile Optimization:**
- Touch targets minimum 44x44px
- Responsive breakpoints
- Mobile-first CSS
- Performance budgets

### Cross-PM Coordination Patterns

**With PM-Intelligence:**
- Chat UI components need real-time updates
- Thinking indicators require streaming state
- Button interactions need proper handlers

**With PM-Integration:**
- Settings UI for integrations
- OAuth flow UI components
- Connector toggle interfaces

**With PM-Context:**
- Document upload UI
- Document list components
- Search result cards

**With PM-Transactions:**
- Pipeline/Kanban board UI
- Deal detail components
- Revenue forecast panel

---

## Recent Work Context

### Last Cycle (Cycle 15 - 2026-02-15)
- **Worked on:** EXP-008 - Animation polish across application
- **Implemented:**
  - Added 8 new keyframe animations to tailwind.config.ts (fade-in-up, fade-in-down, slide-in-right, slide-in-up, scale-in, shimmer, pulse-subtle, spin-slow)
  - Enhanced button with scale effect on click, shadow on hover
  - Enhanced card with transition-all for smooth animations
  - Enhanced tabs with hover states and content fade-in
  - Added shimmer effect to skeleton loading states
  - Enhanced QuickActionCard with lift effect and icon scaling
  - Enhanced badge with scale effect on hover
  - Improved dialog close button with scale animation
  - Enhanced input/textarea with border hover transitions
  - Enhanced switch with thumb scale animation
  - Enhanced checkbox with scale and indicator animation
  - Enhanced progress bar with smooth 500ms transitions
  - Enhanced avatar with transition support
- **Pattern established:** Use `transition-all duration-200 ease-out` for consistent micro-interactions
- **Blocked by:** None
- **Handoffs created:** None

### Cycle 9
- **Worked on:** EXP-011/12/13 - Navigation & layout fixes
- **Discovered:** Sidebar cluttered, workspace not centered, chat history needs padding
- **Blocked by:** None
- **Handoffs created:** None

### Previous Cycles

**Cycle 8:**
- Implemented dark mode (light/dark/system)
- Fixed FOUC prevention
- Created Settings UI for theme selection

**Cycle 7:**
- Established component patterns
- Created design system foundation

---

## Preferences & Patterns

**Prefers:**
- Using `smart-agent-brainstorming` for UI improvements
- Mobile-first responsive design
- Accessibility-first approach

**Avoids:**
- Breaking existing UI patterns
- Skipping accessibility checks
- Hardcoding colors or spacing

**Works well with:**
- PM-Intelligence (chat UI)
- PM-Integration (Settings UI)
- PM-Context (document UI)
- PM-Transactions (pipeline UI)

---

*This memory is updated after each development cycle. PM-Experience should read this before starting new work.*
