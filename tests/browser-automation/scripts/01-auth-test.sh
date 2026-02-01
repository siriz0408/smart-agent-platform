#!/bin/bash

# Authentication Testing Script
# Tests: Signup, Login, Session Persistence

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source ./config.sh

SESSION="$SESSION_NAME"

echo "========================================="
echo "  AUTHENTICATION TESTING"
echo "========================================="
echo ""

# Check prerequisites
check_agent_browser || exit 1

# Create test session
create_session

# Test 2.1: Landing Page
echo ""
log_info "TEST 2.1: Landing Page Load"
echo "-------------------------------------------"

log_info "Navigating to: $PROD_URL"
$AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
sleep 2

take_screenshot "01-landing-page.png"

log_info "Getting page snapshot"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/01-landing-snapshot.txt"

log_success "Landing page loaded"

# Test 2.2: Login Flow
echo ""
log_info "TEST 2.2: Login Flow"
echo "-------------------------------------------"

log_info "Looking for Sign In button"
# Note: User will need to adjust selectors based on actual UI
$AGENT_BROWSER --session "$SESSION" get url

log_warning "MANUAL STEP REQUIRED:"
echo "  1. Locate the 'Sign In' or 'Login' button in 01-landing-snapshot.txt"
echo "  2. Click it using: $AGENT_BROWSER --session $SESSION find text 'Sign In' click"
echo "  3. Fill email: $AGENT_BROWSER --session $SESSION find label 'Email' fill '$TEST_EMAIL'"
echo "  4. Fill password: $AGENT_BROWSER --session $SESSION find label 'Password' fill '$TEST_PASSWORD'"
echo "  5. Submit: $AGENT_BROWSER --session $SESSION find role button click --name 'Sign In'"
echo ""
echo "OR run interactively with:"
echo "  $AGENT_BROWSER --session $SESSION interactive"
echo ""

read -p "Press Enter after completing login manually, or Ctrl+C to exit..."

# Wait for navigation after login
sleep 3
$AGENT_BROWSER --session "$SESSION" get url > "$TEST_RESULTS_DIR/02-post-login-url.txt"

take_screenshot "02-logged-in-state.png"

log_success "Login flow completed"

# Test 2.3: Session Persistence
echo ""
log_info "TEST 2.3: Session Persistence"
echo "-------------------------------------------"

log_info "Saving authentication state"
$AGENT_BROWSER --session "$SESSION" state save "$TEST_RESULTS_DIR/auth-state.json"

log_info "Reloading page"
$AGENT_BROWSER --session "$SESSION" reload
sleep 2

$AGENT_BROWSER --session "$SESSION" get url > "$TEST_RESULTS_DIR/03-after-reload-url.txt"

log_info "Checking if still authenticated"
CURRENT_URL=$($AGENT_BROWSER --session "$SESSION" get url)

if [[ "$CURRENT_URL" == *"auth"* ]] || [[ "$CURRENT_URL" == *"login"* ]]; then
    log_error "Session was lost! Redirected to auth page"
else
    log_success "Session persisted after reload"
fi

take_screenshot "03-session-persistence.png"

# Summary
echo ""
echo "========================================="
echo "  AUTHENTICATION TESTS COMPLETE"
echo "========================================="
echo ""
log_info "Screenshots saved to: $TEST_RESULTS_DIR"
log_info "Session state saved to: $TEST_RESULTS_DIR/auth-state.json"
echo ""
log_warning "Review screenshots and snapshots to verify:"
echo "  ✓ Landing page loads correctly"
echo "  ✓ Login form appears and works"
echo "  ✓ User is redirected after login"
echo "  ✓ Session persists after reload"
echo ""
