---
name: smart-agent-browser-automation
description: Automate browser interactions for manual testing, E2E test development, form validation, and mobile device emulation
---

# Agent Browser

**When to Use:** Automate browser interactions for manual testing, E2E test development, form validation, screenshot generation, and mobile device emulation. Use when manually testing Smart Agent on mobile viewports or debugging user flows.

## Core Use Cases for Smart Agent

1. **Manual Mobile Testing**
2. **Screenshot Generation** (documentation, bug reports)
3. **Form Testing** (login, document upload, contact creation)
4. **Mobile Device Emulation** (iPhone, Android)
5. **E2E Test Script Development** (prototype before Playwright)

## Quick Start Workflow

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

## Mobile Testing Scenarios

### Test 1: Login Flow on Mobile
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

### Test 2: Document Upload on Android
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

### Test 3: Touch Target Validation
```bash
# Check if buttons meet 44px minimum
agent-browser set device "iPhone 13 Pro"
agent-browser open http://localhost:8080
agent-browser snapshot -i

# Get button dimensions
agent-browser get box @e1
# Output shows width/height - verify ≥44px
```

### Test 4: Dark Mode Testing
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

### Test 5: Offline Behavior
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

### Test 6: Network Throttling (Slow 3G)
```bash
# Note: agent-browser doesn't have built-in throttling
# Use Chrome DevTools Protocol instead:
agent-browser open http://localhost:8080
agent-browser eval "
  const connection = navigator.connection;
  console.log('Network:', connection.effectiveType);
"
```

## Video Recording for Demos
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

## Debugging Mobile Issues
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

## Session Management (Parallel Testing)
```bash
# Test on iOS and Android simultaneously
agent-browser --session ios set device "iPhone 13 Pro"
agent-browser --session ios open http://localhost:8080

agent-browser --session android set device "Pixel 5"
agent-browser --session android open http://localhost:8080

# List active sessions
agent-browser session list
```

## Common Commands for Smart Agent Testing

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

## Integration with Testing Workflow

**Prototype E2E Tests:**
1. Use `agent-browser` to manually test flow
2. Record commands that work
3. Convert to Playwright test:
   ```typescript
   // agent-browser: fill @e1 "test@example.com"
   // Playwright equivalent:
   await page.locator('[data-testid="email-input"]').fill('test@example.com');
   ```

## Mobile Device Presets Available
- iPhone SE, iPhone 13 Pro, iPhone 14 Pro Max
- iPad Pro, iPad Mini
- Pixel 5, Pixel 7, Samsung Galaxy S21
- Custom: `agent-browser set viewport <width> <height>`

## When to Use agent-browser vs Playwright

| Use Case | Tool | Why |
|----------|------|-----|
| **Manual exploratory testing** | agent-browser | Faster iteration, no test code needed |
| **Quick mobile screenshots** | agent-browser | Simple CLI, easy device emulation |
| **Prototyping test flows** | agent-browser | Validate flow before writing test code |
| **Automated CI/CD testing** | Playwright | Programmatic, parallel, better reporting |
| **Regression test suite** | Playwright | Stable, maintainable, version controlled |

## Practical Examples

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
