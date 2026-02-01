#!/bin/bash

# CRM Features Testing Script
# Tests: Contacts, Properties, Pipeline/Deals

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source ./config.sh

SESSION="$SESSION_NAME"

echo "========================================="
echo "  CRM FEATURES TESTING"
echo "========================================="
echo ""

# Check prerequisites
check_agent_browser || exit 1

# Restore authenticated session
if [ -f "$TEST_RESULTS_DIR/auth-state.json" ]; then
    log_info "Restoring authenticated session"
    $AGENT_BROWSER --session "$SESSION" state load "$TEST_RESULTS_DIR/auth-state.json"
else
    log_warning "No saved auth state found"
    $AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
    read -p "Press Enter after logging in..."
fi

# Test 5.1: Contacts Management
echo ""
log_info "TEST 5.1: Contacts Management"
echo "-------------------------------------------"

log_warning "MANUAL NAVIGATION:"
echo "  Navigate to Contacts page"
echo ""

read -p "Press Enter after navigating to Contacts..."

take_screenshot "11-contacts-page.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/11-contacts-snapshot.txt"

log_warning "MANUAL CONTACT CREATION:"
echo "  1. Click 'Add Contact' or similar button"
echo "  2. Fill in contact details:"
echo "     - Name: John Doe"
echo "     - Email: john@example.com"
echo "     - Phone: 555-1234"
echo "  3. Save the contact"
echo ""

read -p "Press Enter after creating contact..."

sleep 2
take_screenshot "12-contact-created.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/12-contact-created-snapshot.txt"

log_success "Contacts test completed"

# Test 5.2: Properties
echo ""
log_info "TEST 5.2: Properties"
echo "-------------------------------------------"

log_warning "MANUAL NAVIGATION:"
echo "  Navigate to Properties page"
echo ""

read -p "Press Enter after navigating to Properties..."

take_screenshot "13-properties-page.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/13-properties-snapshot.txt"

log_info "Checking properties page content"
$AGENT_BROWSER --session "$SESSION" get url > "$TEST_RESULTS_DIR/13-properties-url.txt"

log_success "Properties test completed"

# Test 5.3: Pipeline/Deals
echo ""
log_info "TEST 5.3: Pipeline/Deals"
echo "-------------------------------------------"

log_warning "MANUAL NAVIGATION:"
echo "  Navigate to Pipeline or Deals page"
echo ""

read -p "Press Enter after navigating to Pipeline..."

take_screenshot "14-pipeline-page.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/14-pipeline-snapshot.txt"

log_info "Checking for kanban board or pipeline stages"
grep -i "stage\|pipeline\|deal\|kanban" "$TEST_RESULTS_DIR/14-pipeline-snapshot.txt" && \
    log_success "Found pipeline elements" || \
    log_warning "Pipeline elements not found in snapshot"

log_success "Pipeline test completed"

# Summary
echo ""
echo "========================================="
echo "  CRM TESTS COMPLETE"
echo "========================================="
echo ""
log_info "Screenshots saved to: $TEST_RESULTS_DIR"
echo ""
log_warning "Review screenshots and snapshots to verify:"
echo "  ✓ Contacts page loads"
echo "  ✓ Contact creation works"
echo "  ✓ Properties page displays"
echo "  ✓ Pipeline/deals view renders"
echo ""
