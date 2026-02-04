# Launch Readiness QA Test Scripts

## Test Environment
- **Local URL**: http://localhost:8080
- **Production URL**: https://smart-agent-platform.vercel.app
- **Test Date**: 2026-02-04

---

## Phase 0: Foundation Tests

### TEST-P0-001: Analytics Integration
**Objective**: Verify PostHog and Sentry are properly initialized

**Preconditions**: App loads successfully

**Steps**:
1. Open browser DevTools Console
2. Navigate to http://localhost:8080
3. Check for PostHog initialization log: `[Analytics] PostHog initialized`
4. Check for Sentry initialization log: `[ErrorTracking] Sentry initialized`
5. Verify no console errors related to analytics

**Expected Results**:
- [ ] PostHog initialization message appears (or graceful skip if no key)
- [ ] Sentry initialization message appears (or graceful skip if no DSN)
- [ ] No console errors

**Actual Results**: _To be filled during testing_

---

### TEST-P0-002: Terms of Service Page
**Objective**: Verify Terms page loads and displays content

**Steps**:
1. Navigate to http://localhost:8080/terms
2. Verify page loads without auth requirement
3. Check page title: "Terms of Service"
4. Verify content sections exist:
   - Data Ownership
   - Acceptable Use
   - Subscription Terms
   - Privacy references
5. Verify link to Privacy Policy works

**Expected Results**:
- [ ] Page accessible without login
- [ ] Title displays correctly
- [ ] Content sections present
- [ ] Privacy link navigates to /privacy

**Actual Results**: _To be filled during testing_

---

### TEST-P0-003: Privacy Policy Page
**Objective**: Verify Privacy page loads and displays content

**Steps**:
1. Navigate to http://localhost:8080/privacy
2. Verify page loads without auth requirement
3. Check page title: "Privacy Policy"
4. Verify content sections exist:
   - Data Collection
   - Data Ownership
   - AI Privacy
   - Your Rights
5. Verify link to Terms works

**Expected Results**:
- [ ] Page accessible without login
- [ ] Title displays correctly
- [ ] Content sections present
- [ ] Terms link navigates to /terms

**Actual Results**: _To be filled during testing_

---

### TEST-P0-004: Legal Links on Auth Pages
**Objective**: Verify Terms/Privacy links appear on login and signup

**Steps**:
1. Navigate to http://localhost:8080/login
2. Verify Terms and Privacy links in footer
3. Click each link - verify navigation
4. Navigate to http://localhost:8080/signup
5. Verify Terms acceptance checkbox exists
6. Verify checkbox blocks signup if unchecked
7. Verify Terms/Privacy links in footer

**Expected Results**:
- [ ] Login page has Terms/Privacy links
- [ ] Signup page has Terms/Privacy links
- [ ] Signup has checkbox for Terms acceptance
- [ ] Links navigate correctly

**Actual Results**: _To be filled during testing_

---

## Phase 1: PWA & App Store Prep Tests

### TEST-P1-001: PWA Manifest
**Objective**: Verify PWA manifest is configured

**Steps**:
1. Navigate to http://localhost:8080
2. Open DevTools > Application > Manifest
3. Verify manifest loads
4. Check app name: "Smart Agent"
5. Check theme_color is set
6. Check icons are defined (192x192, 512x512)

**Expected Results**:
- [ ] Manifest loads in DevTools
- [ ] App name correct
- [ ] Theme color set
- [ ] Icons defined

**Actual Results**: _To be filled during testing_

---

### TEST-P1-002: PWA Meta Tags
**Objective**: Verify PWA meta tags in HTML

**Steps**:
1. View page source of http://localhost:8080
2. Check for: `<meta name="theme-color">`
3. Check for: `<meta name="apple-mobile-web-app-capable">`
4. Check for: `<link rel="manifest">`
5. Check for: `<link rel="apple-touch-icon">`

**Expected Results**:
- [ ] theme-color meta tag present
- [ ] apple-mobile-web-app-capable present
- [ ] manifest link present
- [ ] apple-touch-icon link present

**Actual Results**: _To be filled during testing_

---

### TEST-P1-003: Capacitor Configuration
**Objective**: Verify Capacitor is configured for native builds

**Steps**:
1. Check file exists: capacitor.config.ts
2. Verify appId is set
3. Verify webDir is "dist"
4. Check package.json has Capacitor scripts
5. Verify .gitignore excludes ios/ and android/

**Expected Results**:
- [ ] capacitor.config.ts exists
- [ ] Configuration is valid
- [ ] npm scripts for Capacitor exist
- [ ] Native folders gitignored

**Actual Results**: _To be filled during testing_

---

## Phase 2: Mobile UX Tests

### TEST-P2-001: Pipeline Mobile View
**Objective**: Verify Pipeline page has mobile-friendly layout

**Steps**:
1. Navigate to http://localhost:8080/pipeline (logged in)
2. Resize browser to mobile width (<768px)
3. Verify Kanban columns stack or become accordion
4. Check for view toggle buttons (Kanban/List)
5. Expand/collapse accordion sections on mobile
6. Resize back to desktop - verify Kanban returns

**Expected Results**:
- [ ] Mobile view shows accordion/list instead of horizontal scroll
- [ ] View toggle buttons visible
- [ ] Accordion expands/collapses
- [ ] Desktop returns to Kanban view

**Actual Results**: _To be filled during testing_

---

### TEST-P2-002: Responsive Padding
**Objective**: Verify pages have responsive padding (p-4 md:p-6)

**Steps**:
1. Check these pages at mobile width:
   - /contacts
   - /properties
   - /documents
   - /settings
   - /help
2. Verify content has appropriate padding (not too cramped)
3. Resize to desktop - verify padding increases

**Expected Results**:
- [ ] Mobile padding is comfortable (p-4)
- [ ] Desktop padding is larger (p-6)
- [ ] No content overflow issues

**Actual Results**: _To be filled during testing_

---

### TEST-P2-003: AppLayout Safe Areas
**Objective**: Verify safe area support for iOS

**Steps**:
1. Check AppLayout uses h-[100dvh] for dynamic viewport
2. Verify bottom padding accounts for mobile nav (pb-20)
3. Test on iOS simulator or device if available
4. Check no content hidden behind notch or home indicator

**Expected Results**:
- [ ] Dynamic viewport height used
- [ ] Bottom padding sufficient for mobile nav
- [ ] No content obscured by device UI

**Actual Results**: _To be filled during testing_

---

## Phase 3: Onboarding Tests

### TEST-P3-001: Onboarding Route
**Objective**: Verify onboarding page exists and is protected

**Steps**:
1. Navigate to http://localhost:8080/onboarding (logged in)
2. Verify OnboardingWizard component renders
3. Check progress indicator shows 6 steps
4. Verify step 1 (Welcome) displays

**Expected Results**:
- [ ] Route exists and loads
- [ ] Wizard component renders
- [ ] Progress indicator visible
- [ ] Welcome step displays

**Actual Results**: _To be filled during testing_

---

### TEST-P3-002: Onboarding Steps Navigation
**Objective**: Verify all 6 onboarding steps work

**Steps**:
1. Start at Step 1 (Welcome) - click Continue
2. Step 2 (Profile Setup) - fill name, click Continue
3. Step 3 (Role Selection) - select a role, click Continue
4. Step 4 (First Contact) - skip or add contact
5. Step 5 (First Document) - skip or upload
6. Step 6 (Completion) - click Finish
7. Verify redirect to dashboard

**Expected Results**:
- [ ] All 6 steps navigate correctly
- [ ] Skip buttons work on optional steps
- [ ] Form validation works
- [ ] Completion redirects to /

**Actual Results**: _To be filled during testing_

---

### TEST-P3-003: Onboarding Redirect
**Objective**: Verify new users are redirected to onboarding

**Steps**:
1. Find/create a user with onboarding_completed = false
2. Login with that user
3. Navigate to any protected route (e.g., /documents)
4. Verify redirect to /onboarding

**Expected Results**:
- [ ] User with incomplete onboarding redirected
- [ ] Redirect works from any protected route
- [ ] Users with completed onboarding not redirected

**Actual Results**: _To be filled during testing_

---

## Phase 4: Rate Limiting Tests

### TEST-P4-001: Rate Limit Module Exists
**Objective**: Verify rate limiting module is in place

**Steps**:
1. Check file exists: supabase/functions/_shared/rateLimit.ts
2. Verify exports: checkRateLimit, rateLimitResponse
3. Verify preset limits: AI_CHAT_LIMITS, EMAIL_LIMITS, etc.

**Expected Results**:
- [ ] rateLimit.ts exists
- [ ] Functions exported correctly
- [ ] Preset limits defined

**Actual Results**: _To be filled during testing_

---

### TEST-P4-002: AI Chat Rate Limiting
**Objective**: Verify ai-chat function imports rate limiting

**Steps**:
1. Check supabase/functions/ai-chat/index.ts
2. Verify import of checkRateLimit
3. Verify rate limit check is called after user auth
4. Verify rateLimitResponse returned when limit exceeded

**Expected Results**:
- [ ] Import statement present
- [ ] Rate limit check implemented
- [ ] Returns 429 when limit exceeded

**Actual Results**: _To be filled during testing_

---

### TEST-P4-003: Email Rate Limiting
**Objective**: Verify email functions have rate limiting

**Steps**:
1. Check supabase/functions/send-email/index.ts
2. Check supabase/functions/send-invite/index.ts
3. Verify both import and use rate limiting

**Expected Results**:
- [ ] send-email has rate limiting
- [ ] send-invite has rate limiting

**Actual Results**: _To be filled during testing_

---

## Phase 5: Stickiness Features Tests

### TEST-P5-001: Help Center Page
**Objective**: Verify Help Center loads and functions

**Steps**:
1. Navigate to http://localhost:8080/help (logged in)
2. Verify page title: "Help Center"
3. Check category cards display (6 categories)
4. Click a category - verify articles list
5. Click an article - verify content displays
6. Test search functionality
7. Verify FAQ accordion works

**Expected Results**:
- [ ] Help page loads
- [ ] Categories display
- [ ] Articles navigable
- [ ] Search works
- [ ] FAQ accordion expands/collapses

**Actual Results**: _To be filled during testing_

---

### TEST-P5-002: Help Link in Sidebar
**Objective**: Verify Help is accessible from navigation

**Steps**:
1. Login to the app
2. Check sidebar for Help link with HelpCircle icon
3. Click Help link - verify navigation to /help
4. Check user dropdown menu for Help Center option

**Expected Results**:
- [ ] Help link in sidebar
- [ ] Link navigates to /help
- [ ] Help in user dropdown menu

**Actual Results**: _To be filled during testing_

---

### TEST-P5-003: CSV Contact Import Dialog
**Objective**: Verify CSV import feature works

**Steps**:
1. Navigate to http://localhost:8080/contacts
2. Find "Import CSV" button
3. Click button - verify dialog opens
4. Click "Download Sample CSV" - verify download
5. Drag and drop a valid CSV file
6. Verify validation results display
7. Check preview table shows contacts
8. Click Import - verify contacts added

**Expected Results**:
- [ ] Import button exists
- [ ] Dialog opens
- [ ] Sample download works
- [ ] File validation works
- [ ] Preview displays
- [ ] Import adds contacts

**Actual Results**: _To be filled during testing_

---

### TEST-P5-004: Email Drip Campaign Tables
**Objective**: Verify email campaign database tables exist

**Steps**:
1. Check migration file exists: supabase/migrations/*_create_email_campaigns.sql
2. Verify tables defined:
   - email_campaigns
   - email_campaign_steps
   - email_campaign_recipients
   - email_send_history
3. Check RLS policies defined

**Expected Results**:
- [ ] Migration file exists
- [ ] All 4 tables defined
- [ ] RLS policies in place

**Actual Results**: _To be filled during testing_

---

### TEST-P5-005: Drip Email Edge Function
**Objective**: Verify drip email function exists

**Steps**:
1. Check supabase/functions/send-drip-email/index.ts exists
2. Verify function handles campaign processing
3. Check supabase/config.toml includes the function

**Expected Results**:
- [ ] Function file exists
- [ ] Logic for processing campaigns
- [ ] Configured in config.toml

**Actual Results**: _To be filled during testing_

---

## Bug Tracking

### Bugs Found

| ID | Phase | Severity | Description | Steps to Reproduce | Status |
|----|-------|----------|-------------|-------------------|--------|
| BUG-001 | | | | | |

### Severity Levels
- **Critical**: App crash, data loss, security issue
- **High**: Feature broken, major UX issue
- **Medium**: Feature partially working, workaround exists
- **Low**: Minor UI issue, cosmetic

---

## Test Summary

| Phase | Total Tests | Passed | Failed | Blocked |
|-------|-------------|--------|--------|---------|
| Phase 0 | 4 | | | |
| Phase 1 | 3 | | | |
| Phase 2 | 3 | | | |
| Phase 3 | 3 | | | |
| Phase 4 | 3 | | | |
| Phase 5 | 5 | | | |
| **Total** | **21** | | | |

---

## Sign-off

- **Tester**: AI Agent
- **Date**: 2026-02-04
- **Overall Status**: _To be determined_
