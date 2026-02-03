# Browser QA Test Plan - Smart Agent Platform

**Test Run ID:** qa-20260202-201016
**Environment:** Production (https://smart-agent-platform-sigma.vercel.app)
**Test User:** siriz04081@gmail.com
**Status:** Ready to Execute

---

## Priority Test Suite

### ⭐ HIGHEST PRIORITY: Search Functionality (Recently Fixed)

#### Test 2.1: Incremental Search
**Objective:** Verify that search supports incremental/prefix matching
**Steps:**
1. Navigate to home page
2. Type "s" in search bar → wait 1s → screenshot
3. Type "sa" in search bar → wait 1s → screenshot
4. Type "sar" in search bar → wait 1s → screenshot
5. Type "sarah" in search bar → wait 2s → screenshot

**Expected Results:**
- Search dropdown appears with each keystroke
- Results progressively narrow down
- Typing "sarah" shows Sarah Johnson contacts

**Pass Criteria:**
- Sarah Johnson contact appears in dropdown for "sarah" query
- No crashes or errors

---

#### Test 2.2: Search Results Accuracy
**Objective:** Verify "sarah" query returns Sarah Johnson, NOT 922 Sharondale
**Steps:**
1. Search for "sarah"
2. Capture dropdown results
3. Verify content

**Expected Results:**
- Sarah Johnson contact(s) appear
- 922 Sharondale property does NOT appear

**Pass Criteria:**
- ✅ Sarah Johnson found
- ✅ 922 Sharondale NOT found (no false positives)

**Bug Context:** Previously, "sarah" was matching "922 Sharondale" incorrectly. This was fixed by implementing proper prefix matching in the search query.

---

#### Test 2.3: See All Results Button
**Objective:** Verify "See All Results" button navigates to /search page
**Steps:**
1. Search for "sarah"
2. Wait for dropdown to appear
3. Click "See All Results" button
4. Verify navigation

**Expected Results:**
- Button is visible and clickable
- Navigation to `/search?q=sarah` occurs
- Search results page loads

**Pass Criteria:**
- URL matches `/search?q=*`
- Page loads without errors

---

#### Test 2.4: Filter Tabs on Search Results Page
**Objective:** Verify filter tabs work on /search page
**Steps:**
1. On /search page (from previous test)
2. Verify tabs are present: All, Documents, Contacts, Properties, Deals

**Expected Results:**
- At least 3 filter tabs visible
- Tabs are clickable

**Pass Criteria:**
- At least 3 tabs found (All, Documents, Contacts, Properties, or Deals)

---

#### Test 2.5: Property Search by Address Number
**Objective:** Verify searching "922" returns 922 Sharondale property
**Steps:**
1. Navigate to home page
2. Clear search bar
3. Type "922"
4. Wait 2s
5. Capture dropdown

**Expected Results:**
- 922 Sharondale property appears in results
- Result is categorized under Properties

**Pass Criteria:**
- "Sharondale" or "922" found in dropdown

---

### Test 1: Login Flow

#### Test 1.1: Valid Login
**Objective:** Verify user can log in with valid credentials
**Steps:**
1. Navigate to /login
2. Wait for page load
3. Fill email: siriz04081@gmail.com
4. Fill password: Test1234
5. Click login button
6. Wait for redirect

**Expected Results:**
- Redirects to /documents
- User is authenticated

**Pass Criteria:**
- URL is `/documents`
- No error messages

---

### Test 3: Documents Page

#### Test 3.1: Documents List Loads
**Objective:** Verify documents page loads correctly
**Steps:**
1. Navigate to /documents
2. Wait for networkidle
3. Take screenshot

**Expected Results:**
- Page loads without errors
- Document cards or table visible

**Pass Criteria:**
- Page loads successfully

---

### Test 4: Properties Page

#### Test 4.1: Properties List Loads
**Objective:** Verify properties page loads correctly
**Steps:**
1. Navigate to /properties
2. Wait for networkidle
3. Take screenshot

**Expected Results:**
- Page loads without errors
- Property cards or grid visible

**Pass Criteria:**
- Page loads successfully

---

### Test 5: Contacts Page

#### Test 5.1: Contacts List Loads
**Objective:** Verify contacts page loads correctly
**Steps:**
1. Navigate to /contacts
2. Wait for networkidle
3. Take screenshot

**Expected Results:**
- Page loads without errors
- Contact cards or table visible

**Pass Criteria:**
- Page loads successfully

---

## Test Execution

### Prerequisites
- agent-browser CLI installed: `npm install -g agent-browser`
- jq installed: `brew install jq` (macOS) or `apt-get install jq` (Linux)

### Run Tests
```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
./test-artifacts/run-priority-tests.sh
```

### Manual Execution
If the automated script has issues, run tests manually:

```bash
export TEST_USER_EMAIL="siriz04081@gmail.com"
export TEST_USER_PASSWORD="Test1234"
export TEST_BASE_URL="https://smart-agent-platform-sigma.vercel.app"

# Login
npx agent-browser open "$TEST_BASE_URL/login"
npx agent-browser fill 'input[type="email"]' "$TEST_USER_EMAIL"
npx agent-browser fill 'input[type="password"]' "$TEST_USER_PASSWORD"
npx agent-browser click 'button[type="submit"]'
npx agent-browser wait --url "**/documents" --timeout 15000
npx agent-browser screenshot test-artifacts/screenshots/login-success.png

# Search for "sarah"
npx agent-browser open "$TEST_BASE_URL"
npx agent-browser fill 'input[placeholder*="Search"]' "sarah"
sleep 2
npx agent-browser screenshot test-artifacts/screenshots/search-sarah.png
npx agent-browser snapshot -i | grep "Sarah Johnson"

# Search for "922"
npx agent-browser fill 'input[placeholder*="Search"]' "922"
sleep 2
npx agent-browser screenshot test-artifacts/screenshots/search-922.png
npx agent-browser snapshot -i | grep -i "sharondale"
```

---

## Expected Outcomes

### ✅ All Tests Pass
- All 9 tests complete successfully
- No failures in state.json
- Screenshots saved for all tests
- `state.json` shows:
  ```json
  {
    "summary": {
      "total": 9,
      "passed": 9,
      "failed": 0,
      "skipped": 0
    }
  }
  ```

### ⚠️ Search Tests Fail
If search tests fail, this indicates the recent search fix did not fully resolve the issue. Failures would show:
- "sarah" not returning Sarah Johnson
- "sarah" still returning 922 Sharondale (false positive)
- "See All Results" button not working
- Filter tabs missing

**Action:** File bug report in test-artifacts/reports/ with screenshots

### ⚠️ Page Load Tests Fail
If documents/properties/contacts pages fail to load:
- Check for authentication issues
- Verify RLS policies are working
- Check browser console for errors

---

## Test Artifacts

All test outputs are saved to:
- **State File:** `test-artifacts/state.json` - Test results and summary
- **Screenshots:** `test-artifacts/screenshots/*.png` - Visual evidence of each test
- **Reports:** `test-artifacts/reports/*.md` - Bug reports for failures

---

## Success Criteria

**Test Run Passes If:**
1. ✅ Login successful (redirects to /documents)
2. ✅ Search for "sarah" returns Sarah Johnson contacts
3. ✅ Search for "sarah" does NOT return 922 Sharondale
4. ✅ "See All Results" button navigates to /search page
5. ✅ Filter tabs visible on search results page
6. ✅ Search for "922" returns 922 Sharondale property
7. ✅ Documents page loads
8. ✅ Properties page loads
9. ✅ Contacts page loads

**Minimum Pass Rate:** 8/9 tests (88%)
**Ideal Pass Rate:** 9/9 tests (100%)

---

## Notes

- **Search Fix Verification:** The primary goal of this test run is to verify that the search functionality fix (implemented to resolve the "sarah" → 922 Sharondale bug) is working correctly in production.
- **Incremental Search:** Tests verify that prefix matching works at each character: "s", "sa", "sar", "sarah"
- **False Positive Check:** Critical test to ensure "sarah" does NOT match "Sharondale"
- **Environment:** Testing against production deployment at https://smart-agent-platform-sigma.vercel.app

---

## Troubleshooting

### agent-browser Not Found
```bash
npm install -g agent-browser
# or
npx -y agent-browser --version
```

### Screenshots Not Saving
```bash
mkdir -p test-artifacts/screenshots
chmod -R 755 test-artifacts/screenshots
```

### jq Not Available
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq

# Windows (WSL)
sudo apt-get install jq
```

### Browser Crashes
- Restart browser: `agent-browser close && agent-browser open $TEST_BASE_URL`
- Clear cache: `agent-browser cache clear`
- Check memory usage

### Tests Timeout
- Increase timeouts in script (change `--timeout` values)
- Check network connection
- Verify production site is up

---

## Next Steps

After test run completes:
1. Review `test-artifacts/state.json` for results
2. Check `test-artifacts/screenshots/` for visual verification
3. If failures exist, review failure details in state.json
4. File bug reports for any failed tests
5. Report results to development team
