---
name: smart-agent-web-artifacts
description: Build standalone web artifacts (HTML/CSS/JS prototypes, landing pages, demos) for quick iteration
---

# Web Artifacts Builder

**When to Use:** Build standalone web artifacts (HTML/CSS/JS prototypes, landing pages, demos) for quick iteration or client previews. Use for rapid prototyping before integrating into main app.

## Purpose

Create self-contained web artifacts for testing design concepts, gathering feedback, or building isolated components.

## Use Cases

1. **Prototype new UI patterns** before full implementation
2. **Build demo pages** for user testing
3. **Create standalone landing pages**
4. **Rapid iteration on mobile designs**
5. **A/B test variations** without touching main codebase
6. **Client previews** for design approval

## Artifact Types

### Single-File HTML Prototype

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feature Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <div class="container mx-auto p-4">
    <!-- Prototype content -->
  </div>
  <script>
    // Prototype interactivity
  </script>
</body>
</html>
```

### React Sandbox (CodeSandbox/StackBlitz)

```typescript
// Use for complex component prototypes
// Export to CodeSandbox for sharing
// Import back when approved

import React from 'react';

export function FeaturePrototype() {
  return (
    <div className="p-4">
      {/* Prototype component */}
    </div>
  );
}
```

## Workflow

### 1. Create Artifact
```bash
# Create prototype directory
mkdir -p prototypes/feature-name
touch prototypes/feature-name/index.html
```

### 2. Develop
- Use Tailwind via CDN for quick styling
- Keep JavaScript minimal and inline
- Focus on visual/UX, not production code
- Include mobile viewport testing

### 3. Share
- Open in browser for local review
- Deploy to Vercel/Netlify for remote sharing
- Use Live Server extension for hot reload

### 4. Iterate
- Gather feedback
- Make quick changes
- Test on mobile devices
- Document decisions

### 5. Integrate
- Extract patterns to main codebase
- Create proper React components
- Add tests and documentation
- Delete prototype when done

## Best Practices

- **Keep it simple** - No build step needed
- **Mobile-first** - Test on real devices
- **Document intent** - Comments explaining purpose
- **Version control** - Track iterations
- **Clean up** - Remove prototypes when integrated

## Example Artifacts for Smart Agent

```
prototypes/
├── mobile-bottom-nav/     # Test navigation patterns
│   └── index.html
├── document-card-redesign/ # New card layout options
│   └── index.html
├── ai-chat-streaming/     # Chat UX experiments
│   └── index.html
└── pricing-page/          # Landing page variations
    └── index.html
```

## Quick Start Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Agent - [Feature] Prototype</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#6366f1',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-background text-foreground">
  <!-- Prototype: [Description] -->
  <!-- Date: [YYYY-MM-DD] -->
  <!-- Purpose: [What we're testing] -->

  <div class="min-h-screen">
    <!-- Your prototype content -->
  </div>

  <script>
    // Interactivity goes here
  </script>
</body>
</html>
```

**Note:** Prototypes are throwaway code for learning. Don't over-engineer them. The goal is fast feedback, not production quality.
