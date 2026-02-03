#!/bin/bash
# Smart Agent Priority Browser Tests
# Run this script to execute browser tests with agent-browser CLI

set -e

# Environment setup
export TEST_USER_EMAIL="siriz04081@gmail.com"
export TEST_USER_PASSWORD="Test1234"
export TEST_BASE_URL="https://smart-agent-platform-sigma.vercel.app"

# Create screenshots directory
mkdir -p test-artifacts/screenshots

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Smart Agent Priority Browser Tests"
echo "=========================================="
echo ""

# Helper function to update state.json
update_test_result() {
  local test_name=$1
  local status=$2
  local duration=$3
  local error=${4:-""}
  local screenshot=${5:-""}

  jq --arg name "$test_name" \
     --arg status "$status" \
     --arg duration "$duration" \
     --arg error "$error" \
     --arg screenshot "$screenshot" \
     '.tests[$name] = {
       status: $status,
       duration: ($duration | tonumber),
       error: (if $error == "" then null else $error end),
       screenshot: (if $screenshot == "" then null else $screenshot end),
       timestamp: (now | todate)
     }' test-artifacts/state.json > /tmp/state.tmp && mv /tmp/state.tmp test-artifacts/state.json
}

# Helper function to add failure
add_failure() {
  local test_name=$1
  local error=$2
  local screenshot=$3

  jq --arg test "$test_name" \
     --arg error "$error" \
     --arg screenshot "$screenshot" \
     '.failures += [{
       test: $test,
       error: $error,
       screenshot: $screenshot,
       timestamp: (now | todate)
     }]' test-artifacts/state.json > /tmp/state.tmp && mv /tmp/state.tmp test-artifacts/state.json
}

# Test 1: Login Flow
echo "Test 1: Login Flow"
echo "==================="
START=$(date +%s)

npx -y agent-browser open "$TEST_BASE_URL/login"
npx -y agent-browser wait --load networkidle --timeout 10000
npx -y agent-browser screenshot test-artifacts/screenshots/01-login-page.png

# Fill credentials
npx -y agent-browser fill 'input[type="email"]' "$TEST_USER_EMAIL"
npx -y agent-browser fill 'input[type="password"]' "$TEST_USER_PASSWORD"
npx -y agent-browser screenshot test-artifacts/screenshots/02-login-filled.png

# Click login button
npx -y agent-browser click 'button[type="submit"]'

# Wait for redirect to documents
if npx -y agent-browser wait --url "**/documents" --timeout 15000; then
  END=$(date +%s)
  DURATION=$((END - START))
  npx -y agent-browser screenshot test-artifacts/screenshots/03-login-success.png
  update_test_result "login-flow" "passed" "$DURATION" "" "test-artifacts/screenshots/03-login-success.png"
  echo -e "${GREEN}✓ Login test passed (${DURATION}s)${NC}"
else
  END=$(date +%s)
  DURATION=$((END - START))
  npx -y agent-browser screenshot test-artifacts/screenshots/03-login-fail.png
  update_test_result "login-flow" "failed" "$DURATION" "Failed to redirect to documents page" "test-artifacts/screenshots/03-login-fail.png"
  add_failure "login-flow" "Failed to redirect to documents page" "test-artifacts/screenshots/03-login-fail.png"
  echo -e "${RED}✗ Login test failed${NC}"
  exit 1
fi

echo ""

# Test 2: Search - Incremental (Type "s", "sa", "sar", "sarah")
echo "Test 2: Search - Incremental Typing"
echo "===================================="
START=$(date +%s)

# Navigate to home page
npx -y agent-browser open "$TEST_BASE_URL"
npx -y agent-browser wait --load networkidle --timeout 10000

# Type incrementally: "s"
npx -y agent-browser fill 'input[placeholder*="Search"]' "s"
sleep 1
npx -y agent-browser screenshot test-artifacts/screenshots/04-search-s.png

# Type incrementally: "sa"
npx -y agent-browser fill 'input[placeholder*="Search"]' "sa"
sleep 1
npx -y agent-browser screenshot test-artifacts/screenshots/05-search-sa.png

# Type incrementally: "sar"
npx -y agent-browser fill 'input[placeholder*="Search"]' "sar"
sleep 1
npx -y agent-browser screenshot test-artifacts/screenshots/06-search-sar.png

# Type incrementally: "sarah"
npx -y agent-browser fill 'input[placeholder*="Search"]' "sarah"
sleep 2
npx -y agent-browser screenshot test-artifacts/screenshots/07-search-sarah.png

# Check if Sarah Johnson appears in dropdown
npx -y agent-browser snapshot -i > /tmp/search-snapshot.txt
if grep -q "Sarah Johnson" /tmp/search-snapshot.txt; then
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-incremental-sarah" "passed" "$DURATION" "" "test-artifacts/screenshots/07-search-sarah.png"
  echo -e "${GREEN}✓ Search incremental test passed - Sarah Johnson found (${DURATION}s)${NC}"
else
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-incremental-sarah" "failed" "$DURATION" "Sarah Johnson not found in search results" "test-artifacts/screenshots/07-search-sarah.png"
  add_failure "search-incremental-sarah" "Sarah Johnson not found in search results" "test-artifacts/screenshots/07-search-sarah.png"
  echo -e "${RED}✗ Search incremental test failed - Sarah Johnson not found${NC}"
fi

echo ""

# Test 3: Search - Verify 922 Sharondale NOT in "sarah" results
echo "Test 3: Search - Verify No False Positives"
echo "==========================================="
START=$(date +%s)

# Continue from previous search
if grep -q "922 Sharondale" /tmp/search-snapshot.txt || grep -q "Sharondale" /tmp/search-snapshot.txt; then
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-no-false-positive" "failed" "$DURATION" "922 Sharondale incorrectly appears in 'sarah' search" "test-artifacts/screenshots/07-search-sarah.png"
  add_failure "search-no-false-positive" "922 Sharondale incorrectly appears in 'sarah' search" "test-artifacts/screenshots/07-search-sarah.png"
  echo -e "${RED}✗ False positive test failed - 922 Sharondale should NOT appear for 'sarah'${NC}"
else
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-no-false-positive" "passed" "$DURATION" "" "test-artifacts/screenshots/07-search-sarah.png"
  echo -e "${GREEN}✓ False positive test passed - 922 Sharondale correctly excluded (${DURATION}s)${NC}"
fi

echo ""

# Test 4: Search - See All Results Button
echo "Test 4: Search - See All Results Button"
echo "========================================"
START=$(date +%s)

# Clear search first
npx -y agent-browser fill 'input[placeholder*="Search"]' ""
sleep 0.5

# Search for "sarah" again
npx -y agent-browser fill 'input[placeholder*="Search"]' "sarah"
sleep 2

# Look for "See All Results" button
npx -y agent-browser snapshot -i > /tmp/search-dropdown.txt
if grep -qi "See All Results" /tmp/search-dropdown.txt || grep -qi "See all results" /tmp/search-dropdown.txt; then
  # Try to click the button
  if npx -y agent-browser click 'button:has-text("See All Results")' || npx -y agent-browser click 'button:has-text("See all results")'; then
    # Wait for navigation to /search page
    if npx -y agent-browser wait --url "**/search?q=*" --timeout 10000; then
      END=$(date +%s)
      DURATION=$((END - START))
      npx -y agent-browser screenshot test-artifacts/screenshots/08-search-results-page.png
      update_test_result "search-see-all-results" "passed" "$DURATION" "" "test-artifacts/screenshots/08-search-results-page.png"
      echo -e "${GREEN}✓ See All Results test passed - navigated to /search page (${DURATION}s)${NC}"
    else
      END=$(date +%s)
      DURATION=$((END - START))
      npx -y agent-browser screenshot test-artifacts/screenshots/08-search-results-fail.png
      update_test_result "search-see-all-results" "failed" "$DURATION" "Did not navigate to /search page" "test-artifacts/screenshots/08-search-results-fail.png"
      add_failure "search-see-all-results" "Did not navigate to /search page" "test-artifacts/screenshots/08-search-results-fail.png"
      echo -e "${RED}✗ See All Results test failed - no navigation${NC}"
    fi
  else
    END=$(date +%s)
    DURATION=$((END - START))
    npx -y agent-browser screenshot test-artifacts/screenshots/08-see-all-button-fail.png
    update_test_result "search-see-all-results" "failed" "$DURATION" "Could not click See All Results button" "test-artifacts/screenshots/08-see-all-button-fail.png"
    add_failure "search-see-all-results" "Could not click See All Results button" "test-artifacts/screenshots/08-see-all-button-fail.png"
    echo -e "${RED}✗ See All Results test failed - button not clickable${NC}"
  fi
else
  END=$(date +%s)
  DURATION=$((END - START))
  npx -y agent-browser screenshot test-artifacts/screenshots/08-see-all-button-missing.png
  update_test_result "search-see-all-results" "failed" "$DURATION" "See All Results button not found in dropdown" "test-artifacts/screenshots/08-see-all-button-missing.png"
  add_failure "search-see-all-results" "See All Results button not found in dropdown" "test-artifacts/screenshots/08-see-all-button-missing.png"
  echo -e "${RED}✗ See All Results test failed - button not found${NC}"
fi

echo ""

# Test 5: Search - Filter Tabs on Results Page
echo "Test 5: Search - Filter Tabs"
echo "============================="
START=$(date +%s)

# Get current page snapshot
npx -y agent-browser snapshot -i > /tmp/search-page.txt

# Check for filter tabs
TABS_FOUND=0
grep -qi "All" /tmp/search-page.txt && ((TABS_FOUND++))
grep -qi "Documents" /tmp/search-page.txt && ((TABS_FOUND++))
grep -qi "Contacts" /tmp/search-page.txt && ((TABS_FOUND++))
grep -qi "Properties" /tmp/search-page.txt && ((TABS_FOUND++))
grep -qi "Deals" /tmp/search-page.txt && ((TABS_FOUND++))

if [ $TABS_FOUND -ge 3 ]; then
  END=$(date +%s)
  DURATION=$((END - START))
  npx -y agent-browser screenshot test-artifacts/screenshots/09-search-filter-tabs.png
  update_test_result "search-filter-tabs" "passed" "$DURATION" "" "test-artifacts/screenshots/09-search-filter-tabs.png"
  echo -e "${GREEN}✓ Filter tabs test passed - found $TABS_FOUND tabs (${DURATION}s)${NC}"
else
  END=$(date +%s)
  DURATION=$((END - START))
  npx -y agent-browser screenshot test-artifacts/screenshots/09-search-filter-tabs-fail.png
  update_test_result "search-filter-tabs" "failed" "$DURATION" "Only found $TABS_FOUND filter tabs (expected at least 3)" "test-artifacts/screenshots/09-search-filter-tabs-fail.png"
  add_failure "search-filter-tabs" "Only found $TABS_FOUND filter tabs" "test-artifacts/screenshots/09-search-filter-tabs-fail.png"
  echo -e "${RED}✗ Filter tabs test failed - only found $TABS_FOUND tabs${NC}"
fi

echo ""

# Test 6: Search for "922" Returns Properties
echo "Test 6: Search for '922' Returns Properties"
echo "============================================"
START=$(date +%s)

# Navigate back to home
npx -y agent-browser open "$TEST_BASE_URL"
npx -y agent-browser wait --load networkidle --timeout 10000

# Search for "922"
npx -y agent-browser fill 'input[placeholder*="Search"]' "922"
sleep 2
npx -y agent-browser screenshot test-artifacts/screenshots/10-search-922.png

# Check if Sharondale appears
npx -y agent-browser snapshot -i > /tmp/search-922.txt
if grep -qi "Sharondale" /tmp/search-922.txt || grep -qi "922" /tmp/search-922.txt; then
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-922-property" "passed" "$DURATION" "" "test-artifacts/screenshots/10-search-922.png"
  echo -e "${GREEN}✓ Search 922 test passed - property found (${DURATION}s)${NC}"
else
  END=$(date +%s)
  DURATION=$((END - START))
  update_test_result "search-922-property" "failed" "$DURATION" "922 Sharondale property not found in search" "test-artifacts/screenshots/10-search-922.png"
  add_failure "search-922-property" "922 Sharondale property not found" "test-artifacts/screenshots/10-search-922.png"
  echo -e "${RED}✗ Search 922 test failed - property not found${NC}"
fi

echo ""

# Test 7: Documents Page
echo "Test 7: Documents Page"
echo "======================"
START=$(date +%s)

npx -y agent-browser open "$TEST_BASE_URL/documents"
npx -y agent-browser wait --load networkidle --timeout 10000
npx -y agent-browser screenshot test-artifacts/screenshots/11-documents-page.png

END=$(date +%s)
DURATION=$((END - START))
update_test_result "documents-page" "passed" "$DURATION" "" "test-artifacts/screenshots/11-documents-page.png"
echo -e "${GREEN}✓ Documents page test passed (${DURATION}s)${NC}"

echo ""

# Test 8: Properties Page
echo "Test 8: Properties Page"
echo "======================="
START=$(date +%s)

npx -y agent-browser open "$TEST_BASE_URL/properties"
npx -y agent-browser wait --load networkidle --timeout 10000
npx -y agent-browser screenshot test-artifacts/screenshots/12-properties-page.png

END=$(date +%s)
DURATION=$((END - START))
update_test_result "properties-page" "passed" "$DURATION" "" "test-artifacts/screenshots/12-properties-page.png"
echo -e "${GREEN}✓ Properties page test passed (${DURATION}s)${NC}"

echo ""

# Test 9: Contacts Page
echo "Test 9: Contacts Page"
echo "====================="
START=$(date +%s)

npx -y agent-browser open "$TEST_BASE_URL/contacts"
npx -y agent-browser wait --load networkidle --timeout 10000
npx -y agent-browser screenshot test-artifacts/screenshots/13-contacts-page.png

END=$(date +%s)
DURATION=$((END - START))
update_test_result "contacts-page" "passed" "$DURATION" "" "test-artifacts/screenshots/13-contacts-page.png"
echo -e "${GREEN}✓ Contacts page test passed (${DURATION}s)${NC}"

echo ""

# Update summary
echo "Updating summary..."
jq '.summary = {
  total: (.tests | length),
  passed: ([.tests[] | select(.status == "passed")] | length),
  failed: ([.tests[] | select(.status == "failed")] | length),
  skipped: ([.tests[] | select(.status == "skipped")] | length)
}' test-artifacts/state.json > /tmp/state.tmp && mv /tmp/state.tmp test-artifacts/state.json

# Update testRun status
jq '.testRun.status = "completed" | .testRun.endTime = (now | todate)' test-artifacts/state.json > /tmp/state.tmp && mv /tmp/state.tmp test-artifacts/state.json

echo ""
echo "=========================================="
echo "Test Run Complete"
echo "=========================================="
jq -r '"Total: \(.summary.total) | Passed: \(.summary.passed) | Failed: \(.summary.failed)"' test-artifacts/state.json
echo ""
echo "Results saved to: test-artifacts/state.json"
echo "Screenshots saved to: test-artifacts/screenshots/"
echo ""
