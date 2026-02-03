# Manual Test Checklist - Smart Agent Platform

**Test Date:** _____________
**Tester:** _____________
**Environment:** https://smart-agent-platform-sigma.vercel.app
**Test User:** siriz04081@gmail.com
**Password:** Test1234

---

## Pre-Test Setup

- [ ] Open Chrome/Firefox browser
- [ ] Clear browser cache and cookies
- [ ] Open DevTools (F12) → Console tab
- [ ] Have screenshot tool ready (Cmd+Shift+4 on Mac, Win+Shift+S on Windows)

---

## Test 1: Login Flow

**Time Started:** ___________

- [ ] Navigate to https://smart-agent-platform-sigma.vercel.app/login
- [ ] Page loads without errors
- [ ] Screenshot: `01-login-page.png`
- [ ] Enter email: siriz04081@gmail.com
- [ ] Enter password: Test1234
- [ ] Click "Login" button
- [ ] Screenshot: `02-login-filled.png`
- [ ] Page redirects to `/documents`
- [ ] No error messages appear
- [ ] Screenshot: `03-login-success.png`

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 2: Search - Type "sarah"

**Time Started:** ___________

- [ ] Navigate to home page (/)
- [ ] Click in global search bar (top navigation)
- [ ] Type "s" → wait 1 second
- [ ] Screenshot: `04-search-s.png`
- [ ] Type "sa" → wait 1 second
- [ ] Screenshot: `05-search-sa.png`
- [ ] Type "sar" → wait 1 second
- [ ] Screenshot: `06-search-sar.png`
- [ ] Type "sarah" → wait 2 seconds
- [ ] Screenshot: `07-search-sarah.png`
- [ ] Search dropdown appears
- [ ] **CRITICAL:** Sarah Johnson contact(s) appear in results
- [ ] **CRITICAL:** 922 Sharondale does NOT appear in results

**Search Results Found:**
- Sarah Johnson: ⬜ Yes  ⬜ No
- 922 Sharondale: ⬜ Yes (FAIL)  ⬜ No (PASS)

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 3: Search - See All Results Button

**Time Started:** ___________

- [ ] Continue from previous test (search for "sarah")
- [ ] Verify "See All Results" button appears in dropdown
- [ ] Screenshot: `08-see-all-button.png`
- [ ] Click "See All Results" button
- [ ] Page navigates to `/search?q=sarah`
- [ ] Search results page loads
- [ ] Screenshot: `09-search-results-page.png`

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 4: Search - Filter Tabs

**Time Started:** ___________

- [ ] Continue on `/search?q=sarah` page
- [ ] Verify filter tabs are visible
- [ ] Screenshot: `10-filter-tabs.png`

**Tabs Found:**
- [ ] All
- [ ] Documents
- [ ] Contacts
- [ ] Properties
- [ ] Deals

**Total Tabs Found:** _______ (minimum 3 required)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:** _________________________________

---

## Test 5: Search - Type "922"

**Time Started:** ___________

- [ ] Navigate to home page (/)
- [ ] Clear search bar
- [ ] Type "922"
- [ ] Wait 2 seconds
- [ ] Screenshot: `11-search-922.png`
- [ ] Search dropdown appears
- [ ] **CRITICAL:** 922 Sharondale property appears in results
- [ ] Result shows under "Properties" section

**Search Results Found:**
- 922 Sharondale: ⬜ Yes  ⬜ No

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 6: Documents Page

**Time Started:** ___________

- [ ] Navigate to /documents
- [ ] Page loads without errors
- [ ] Documents list/table appears
- [ ] Screenshot: `12-documents-page.png`
- [ ] No console errors in DevTools

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 7: Properties Page

**Time Started:** ___________

- [ ] Navigate to /properties
- [ ] Page loads without errors
- [ ] Properties grid/cards appear
- [ ] Screenshot: `13-properties-page.png`
- [ ] No console errors in DevTools

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test 8: Contacts Page

**Time Started:** ___________

- [ ] Navigate to /contacts
- [ ] Page loads without errors
- [ ] Contacts list/table appears
- [ ] Screenshot: `14-contacts-page.png`
- [ ] No console errors in DevTools

**Result:** ⬜ Pass  ⬜ Fail
**Duration:** _______ seconds
**Notes:** _________________________________

---

## Test Summary

**Total Tests:** 8
**Passed:** _______
**Failed:** _______
**Pass Rate:** _______%

**Critical Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Search Functionality Status:**
- [ ] ✅ "sarah" returns Sarah Johnson
- [ ] ✅ "sarah" does NOT return 922 Sharondale
- [ ] ✅ "See All Results" button works
- [ ] ✅ Filter tabs appear
- [ ] ✅ "922" returns 922 Sharondale property

**Overall Result:** ⬜ All Pass  ⬜ Some Failures  ⬜ Critical Failures

---

## Browser Console Errors

**Copy any errors from DevTools Console:**

```
(paste errors here)
```

---

## Screenshots Saved To

All screenshots should be saved to:
```
/Users/sam.irizarry/Downloads/ReAgentOS_V1/test-artifacts/screenshots/
```

---

## Next Steps

- [ ] Update `state.json` with test results
- [ ] Review all screenshots for visual verification
- [ ] Create bug reports for any failures
- [ ] Share results with development team

---

## Bug Report Template (if needed)

**Bug Title:** _________________________________

**Test:** _________________________________

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**


**Actual Result:**


**Screenshot:** _________________________________

**Browser:** _________________________________

**Console Errors:**
```
(paste errors)
```

**Severity:** ⬜ Critical  ⬜ High  ⬜ Medium  ⬜ Low

**Notes:**

