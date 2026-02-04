# Option B: Manual Testing Checklist

**Purpose:** Step-by-step guide for manual QA testing of messaging system and profile features.

---

## Prerequisites

- [ ] Two browsers or incognito windows for multi-user testing
- [ ] Two test accounts created (e.g., agent1@test.com, agent2@test.com)
- [ ] DevTools open (for mobile emulation and console monitoring)
- [ ] Screen reader installed (optional, for accessibility testing)

---

## Test Suite 1: Unread Message Counts

### Scenario: New Message Creates Unread Count

**Steps:**
1. Open browser A, log in as User A
2. Navigate to `/messages`
3. Open browser B (incognito), log in as User B
4. User B: Send message to User A in a conversation
5. User A: Refresh `/messages` page

**Expected Results:**
- [ ] Conversation shows unread badge (number > 0) next to conversation name
- [ ] Last message text is **bold**
- [ ] Sidebar "Messages" icon shows total unread badge (red)
- [ ] Badge shows exact count (e.g., "1" or "5")
- [ ] Badge shows "99+" if count > 99

### Scenario: Opening Conversation Marks as Read

**Steps:**
1. User A: Click on conversation with unread messages
2. Wait 2 seconds (for markAsRead mutation)
3. Navigate back to conversation list

**Expected Results:**
- [ ] Unread badge disappears from conversation
- [ ] Last message text is no longer bold
- [ ] Sidebar unread count decrements by the amount that was unread
- [ ] If no more unread messages, sidebar badge disappears

### Scenario: Multiple Conversations with Unread

**Steps:**
1. User B: Send messages in 3 different conversations
2. User A: Refresh `/messages`

**Expected Results:**
- [ ] All 3 conversations show unread badges
- [ ] Sidebar badge shows sum of all unread (e.g., if 2+3+1=6, shows "6")
- [ ] User A opens 1 conversation
- [ ] Only that conversation's badge disappears
- [ ] Sidebar badge decrements by that conversation's count

---

## Test Suite 2: Real-Time Presence Indicators

### Scenario: User Comes Online

**Steps:**
1. Browser A: Navigate to `/contacts`
2. Browser B (incognito): Log in as a contact that exists in User A's contact list
3. Wait 5 seconds

**Expected Results:**
- [ ] Contact avatar in Browser A shows **green dot** (online)
- [ ] Dot is positioned at bottom-right of avatar
- [ ] Dot has pulse animation
- [ ] Presence appears in both mobile card view and desktop table view

### Scenario: User Goes Away (Idle)

**Steps:**
1. Browser B: Remain idle for 5 minutes (don't move mouse or type)
2. Browser A: Wait for presence refresh (30-second interval)

**Expected Results:**
- [ ] Contact avatar shows **yellow dot** (away)
- [ ] Pulse animation stops

### Scenario: User Goes Offline

**Steps:**
1. Browser B: Close tab or sign out
2. Browser A: Wait for presence refresh (30 seconds)

**Expected Results:**
- [ ] Contact avatar shows **gray dot** (offline)
- [ ] Dot remains visible but no pulse

### Scenario: Presence in Messages Page

**Steps:**
1. Browser A: Navigate to `/messages`
2. Verify presence dots appear in conversation list

**Expected Results:**
- [ ] Presence dots appear on participant avatars in conversation list
- [ ] Same color logic (green/yellow/gray)
- [ ] Position: bottom-right of avatar

---

## Test Suite 3: Typing Indicators

### Scenario: User Types, Indicator Appears

**Steps:**
1. Browser A: Open conversation with User B
2. Browser B: Open same conversation
3. Browser B: Click in message input and start typing (don't send)
4. Browser A: Observe message thread

**Expected Results:**
- [ ] "User B is typing..." appears below message input in Browser A
- [ ] Text has animated dots (...)
- [ ] Indicator appears within 500ms of typing start

### Scenario: User Stops Typing, Indicator Clears

**Steps:**
1. Browser B: Stop typing for 3 seconds
2. Browser A: Observe indicator

**Expected Results:**
- [ ] Indicator disappears after 3 seconds of no typing
- [ ] Smooth fade-out transition (optional)

### Scenario: User Sends Message, Indicator Clears

**Steps:**
1. Browser B: Type message and press Enter
2. Browser A: Observe indicator and message thread

**Expected Results:**
- [ ] Indicator disappears immediately when message is sent
- [ ] New message appears in thread instantly (realtime)

### Scenario: Multiple Users Typing

**Steps:**
1. Browser C: Log in as User C, join same conversation
2. Browser B and C: Both start typing
3. Browser A: Observe indicator

**Expected Results:**
- [ ] Shows "User B and User C are typing..." or similar
- [ ] Handles multiple typers gracefully

---

## Test Suite 4: Profile Extensions

### Scenario: Fill Professional Profile

**Steps:**
1. Navigate to `/settings`
2. Scroll to "Professional Profile" card
3. Fill in:
   - Headline: "Top Producer | Luxury Homes"
   - Bio: "Over 10 years of experience in luxury real estate..." (< 500 chars)
   - Brokerage: "Keller Williams Realty"
   - License Number: "RE123456"
   - License State: "CA"
   - Years Experience: "10"
   - Specialties: "Luxury Homes, First-Time Buyers, Relocation"
   - Service Areas: "Beverly Hills, Santa Monica, Malibu"
   - Website: "https://www.mywebsite.com"
4. Click "Save Changes"

**Expected Results:**
- [ ] Toast notification: "Profile updated successfully"
- [ ] Reload page → all fields persist
- [ ] Character counters update as you type (headline: x/100, bio: y/500)
- [ ] Profile completion percentage increases (check header)

### Scenario: Add Credential

**Steps:**
1. Scroll to "Credentials & Certifications" card
2. Click "Add" button
3. Fill dialog:
   - Type: "Real Estate License"
   - Title: "California Real Estate Salesperson"
   - Issuing Organization: "California DRE"
   - Issue Date: "2015-06-01"
   - Expiry Date: "2027-06-01"
   - Credential Number: "01234567"
   - Verification URL: "https://www.dre.ca.gov/verify"
4. Click "Add Credential"

**Expected Results:**
- [ ] Toast notification: "Credential added"
- [ ] New credential appears in list
- [ ] Shows issue/expiry dates in "MMM yyyy" format
- [ ] Shows verification link with external icon
- [ ] "Verified" badge does NOT appear (is_verified defaults to false)
- [ ] "Expired" badge does NOT appear (expiry is in future)

### Scenario: Delete Credential

**Steps:**
1. Click delete icon on credential
2. Confirm deletion in alert dialog

**Expected Results:**
- [ ] Confirmation dialog appears: "Are you sure you want to delete this credential?"
- [ ] After confirm: Toast notification "Credential removed"
- [ ] Credential disappears from list

### Scenario: Add Social Link

**Steps:**
1. Scroll to "Social Media Links" card
2. Click "Add" button
3. Select platform: "LinkedIn"
4. Enter URL: "https://www.linkedin.com/in/johndoe"
5. Click "Add Link"

**Expected Results:**
- [ ] Toast notification: "Social link added"
- [ ] New link appears with LinkedIn icon
- [ ] URL is truncated if too long (max-w-[300px])
- [ ] Clicking URL opens in new tab

### Scenario: Upload Photo

**Steps:**
1. Scroll to "Photo Gallery" card
2. Click "Upload" button
3. Select image file (< 10MB, JPG/PNG)
4. Wait for upload

**Expected Results:**
- [ ] Button shows "Uploading..." with spinner
- [ ] Toast notification: "Photo uploaded successfully"
- [ ] Photo appears in grid (2 cols mobile, 3 cols desktop)
- [ ] Hover over photo → delete button appears
- [ ] Photo count updates: "X photos in your gallery"

### Scenario: Upload Photo - File Too Large

**Steps:**
1. Click "Upload" button
2. Select image file > 10MB

**Expected Results:**
- [ ] Toast error: "File size must be less than 10MB"
- [ ] Upload does NOT proceed
- [ ] No photo added to gallery

### Scenario: Privacy Settings

**Steps:**
1. Scroll to "Privacy Settings" card
2. Change "Profile Visibility" to "Team Only"
3. Toggle OFF "Show Email"
4. Toggle ON "Show Social Links"

**Expected Results:**
- [ ] Each change triggers toast: "Privacy settings updated"
- [ ] Reload page → settings persist
- [ ] (Manual check in another user's view: email hidden, social links visible)

---

## Test Suite 5: Mobile Responsiveness

### Scenario: Messages Page on Mobile

**Steps:**
1. Open DevTools → Toggle device toolbar
2. Select "iPhone SE" (375px width)
3. Navigate to `/messages`

**Expected Results:**
- [ ] Conversation list shows in full width (no message thread visible)
- [ ] Tap conversation → thread slides in, list slides out
- [ ] Back button appears in conversation header
- [ ] Tap back → returns to conversation list
- [ ] Touch targets ≥ 44px (measure dropdown menu, buttons)

### Scenario: Settings Page on Mobile

**Steps:**
1. DevTools → iPhone SE (375px)
2. Navigate to `/settings`

**Expected Results:**
- [ ] All cards stack vertically
- [ ] Photo gallery shows 2 columns
- [ ] Credential cards stack (not side-by-side)
- [ ] Dialogs fit within viewport
- [ ] No horizontal scrolling

### Scenario: Contacts Page on Mobile

**Steps:**
1. DevTools → iPhone SE
2. Navigate to `/contacts`

**Expected Results:**
- [ ] Card layout (not table)
- [ ] Contact cards show avatar + presence dot
- [ ] Dropdown menu (3-dot) fits within screen
- [ ] Stats cards stack 2x2 grid on mobile

---

## Test Suite 6: Accessibility

### Scenario: Keyboard Navigation

**Steps:**
1. Navigate to `/messages` using keyboard only (no mouse)
2. Press Tab to move through conversation list
3. Press Enter on a conversation
4. Tab through message thread
5. Tab to message input, type message
6. Press Enter to send

**Expected Results:**
- [ ] Focus indicators visible on all interactive elements
- [ ] Logical tab order (conversation list → thread → input)
- [ ] Enter key opens conversation
- [ ] Enter key sends message
- [ ] No keyboard traps

### Scenario: Screen Reader (VoiceOver/NVDA)

**Steps:**
1. Enable screen reader
2. Navigate to `/messages`
3. Arrow through conversation list
4. Open conversation
5. Listen to message thread

**Expected Results:**
- [ ] Page title announced: "Messages"
- [ ] Conversations announced with name and unread count
- [ ] Message content announced correctly
- [ ] Typing indicator announced as live region
- [ ] Buttons have accessible labels

### Scenario: Color Contrast

**Steps:**
1. Use browser extension (e.g., "WCAG Color Contrast Checker")
2. Check contrast ratios:
   - Unread badge (destructive variant) on white background
   - Presence dots on avatar backgrounds
   - Message text on bubble backgrounds

**Expected Results:**
- [ ] All text meets WCAG AA: 4.5:1 minimum
- [ ] All icons/badges meet WCAG AA: 3:1 minimum
- [ ] No contrast failures reported

### Scenario: Lighthouse Audit

**Steps:**
1. Open DevTools → Lighthouse
2. Select "Accessibility" category
3. Run audit on `/messages` page

**Expected Results:**
- [ ] Score ≥ 90
- [ ] No critical accessibility violations
- [ ] All images have alt attributes
- [ ] All form inputs have labels

---

## Test Suite 7: Performance

### Scenario: Message Load Time

**Steps:**
1. DevTools → Network tab
2. Throttle: "Slow 3G"
3. Navigate to `/messages`
4. Select conversation with 50+ messages

**Expected Results:**
- [ ] Conversation list loads within 3 seconds
- [ ] Message thread loads within 5 seconds
- [ ] No janky scrolling or layout shifts
- [ ] Loading states show (skeletons)

### Scenario: Presence Polling

**Steps:**
1. DevTools → Network tab
2. Navigate to `/contacts`
3. Observe network requests for 60 seconds

**Expected Results:**
- [ ] Presence queries made every 30 seconds (not more frequently)
- [ ] No redundant queries (React Query deduplication)
- [ ] Query payload is small (< 1KB)

---

## Regression Testing

### Scenario: Existing Features Still Work

**After completing all Option B tests, verify:**
- [ ] AI Chat (Home page) still works
- [ ] Document upload still works
- [ ] Contacts CRUD still works
- [ ] Properties CRUD still works
- [ ] Pipeline/Deals still work
- [ ] Settings (non-profile sections) still work
- [ ] Login/logout still works

---

## Sign-Off

**Tester Name:** ___________________________

**Date:** ___________________________

**Overall Status:**
- [ ] ✅ All tests passed
- [ ] ⚠️ Minor issues found (documented below)
- [ ] ❌ Critical issues found (documented below)

**Issues Found:**
```
1. [Issue description]
   Severity: Critical / Major / Minor
   Steps to reproduce: ...
   Expected: ...
   Actual: ...

2. [Issue description]
   ...
```

**Deployment Recommendation:**
- [ ] ✅ Ready for production
- [ ] ⚠️ Ready for production with known issues (list above)
- [ ] ❌ Not ready, must fix critical issues first

**Notes:** ___________________________
