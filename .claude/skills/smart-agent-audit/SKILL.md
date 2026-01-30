---
name: smart-agent-audit
description: Audit Smart Agent for SEO, performance, security, accessibility using squirrelscan CLI (150+ rules)
---

# Audit Website

**When to Use:** Audit Smart Agent for SEO, performance, security, accessibility, technical, and content issues using the squirrelscan CLI (150+ rules across 20 categories). Use before releases, after major UI changes, or when optimizing for production.

## squirrelscan CLI Required

```bash
# Check if installed
squirrel --version

# Install if needed (macOS/Linux)
curl -fsSL https://squirrelscan.com/install | bash
export PATH="$HOME/.local/bin:$PATH"

# Windows (PowerShell)
irm https://squirrelscan.com/install.ps1 | iex
```

## Setup for Smart Agent

```bash
# Initialize squirrel config in project root
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
squirrel init -n "smart-agent" --force

# This creates squirrel.toml and sets up project database at:
# ~/.squirrel/projects/smart-agent
```

## Audit Workflow

### Step 1: Run Audit (Always use --format llm)

```bash
# Audit local dev server (preferred during development)
npm run dev  # Start server on port 8080
squirrel audit http://localhost:8080 --format llm

# Audit production site (when deployed)
squirrel audit https://smartagent.app --format llm

# Deep audit with full coverage (before release)
squirrel audit http://localhost:8080 --coverage full --format llm
```

### Coverage Modes

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

### Step 2: Fix Issues Systematically

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

### Step 3: Iterate Until Complete

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

## Common Fixes for Smart Agent

### Meta Tags (SEO)
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

### Image Alt Text
```tsx
// ❌ Before
<img src="/logo.png" />

// ✅ After
<img src="/logo.png" alt="Smart Agent - Real Estate AI Assistant" />
```

### Heading Hierarchy
```tsx
// ❌ Before: Skips H2, goes straight to H3
<h1>Documents</h1>
<h3>Recent Files</h3>

// ✅ After: Proper hierarchy
<h1>Documents</h1>
<h2>Recent Files</h2>
```

### HTTPS Links
```bash
# Fix HTTP links in content (bulk replace)
find src -type f -name "*.tsx" -o -name "*.md" | xargs sed -i '' 's|http://|https://|g'
```

### Structured Data (JSON-LD)
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

## Parallelization Strategy

```bash
# If audit finds 20+ files needing alt text
# Spawn subagents to fix in parallel:
# Agent 1: Fix files 1-10
# Agent 2: Fix files 11-20

# If audit finds security headers missing
# Single fix in vite.config.ts or netlify.toml
```

## Audit Commands Reference

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

## Pre-Launch Audit Checklist

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

## Integration with Development

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

## When to Audit

- ✅ Before major releases (full coverage)
- ✅ After significant UI/UX changes
- ✅ Weekly during active development (surface coverage)
- ✅ After deploying to production (verify live site)
- ✅ When SEO performance drops (analytics data)
- ✅ Before marketing campaigns (ensure quality)

## Expected Issues for Smart Agent

Based on typical SaaS apps, expect to find:
- Missing meta descriptions on some pages
- Images without alt text (especially dynamic content)
- Potential heading hierarchy issues
- Missing structured data (JSON-LD)
- Performance optimization opportunities
- Missing security headers (CSP, X-Frame-Options)
- Mobile-specific issues (touch targets, font sizes)

## Fix All Issues, Don't Stop Early
- Iterate: Fix batch → re-audit → fix remaining → re-audit
- Parallelize: Use subagents for bulk content fixes (alt text, headings)
- Target: Score 95+ with full coverage before considering complete
- Only pause for issues requiring human judgment (e.g., broken external links)

**Note:** This skill provides website auditing via squirrelscan CLI (150+ rules). Use to **comprehensively audit Smart Agent** for SEO, performance, security, accessibility, and technical issues. Run audits before releases and iterate until score >95. Particularly valuable for catching mobile-specific issues, accessibility violations, and performance regressions.
