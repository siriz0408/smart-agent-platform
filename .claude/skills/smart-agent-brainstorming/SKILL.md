---
name: smart-agent-brainstorming
description: REQUIRED before creating features, building components, or modifying behavior (USE FIRST)
---

# Brainstorming

**When to Use:** REQUIRED before creating features, building components, adding functionality, or modifying behavior. Use to explore user intent, refine requirements, and validate design approach through collaborative dialogue before implementation.

## Process

### 1. Understanding Phase
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

### 2. Exploring Approaches
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

### 3. Presenting Design (Incremental Validation)
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

### 4. Documentation (After Validation)

```bash
# Save validated design to docs/plans/
# Format: YYYY-MM-DD-<topic>-design.md
# Example: docs/plans/2026-01-29-mobile-bottom-navigation-design.md

# Commit to git
git add docs/plans/2026-01-29-mobile-bottom-navigation-design.md
git commit -m "Add mobile bottom navigation design document"
```

### 5. Implementation Transition (Optional)

After design validated:
```
Ready to set up for implementation?

[If yes:]
- Create git worktree for isolated development
- Create detailed implementation plan
- Begin implementation following design
```

## Key Principles

| Principle | Application |
|-----------|-------------|
| **One question at a time** | Don't ask "What's the goal AND who uses it AND..." |
| **Multiple choice preferred** | Faster for user, clearer options |
| **YAGNI ruthlessly** | Remove unnecessary features from designs |
| **Explore alternatives** | Always propose 2-3 approaches |
| **Incremental validation** | Present 200-300 words → validate → continue |
| **Be flexible** | Go back and clarify when needed |

## When to Use Brainstorming for Smart Agent

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

## Example Workflow for Mobile UI Improvements

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
