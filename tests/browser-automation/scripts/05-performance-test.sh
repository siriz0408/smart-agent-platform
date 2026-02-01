#!/bin/bash

# Performance & Responsiveness Testing Script
# Tests: Mobile Viewport, Page Load Performance

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source ./config.sh

SESSION="$SESSION_NAME"

echo "========================================="
echo "  PERFORMANCE & RESPONSIVENESS TESTING"
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

# Test 6.1: Mobile Responsiveness
echo ""
log_info "TEST 6.1: Mobile Responsiveness"
echo "-------------------------------------------"

log_info "Setting mobile viewport (iPhone SE: 375x667)"
$AGENT_BROWSER --session "$SESSION" set viewport 375 667

log_info "Testing landing page on mobile"
$AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
sleep 2
take_screenshot "15-mobile-landing.png"

log_info "Testing documents page on mobile"
log_warning "MANUAL: Navigate to Documents page"
read -p "Press Enter after navigating to Documents..."
take_screenshot "16-mobile-documents.png"

log_info "Testing chat page on mobile"
log_warning "MANUAL: Navigate to Chat/Home page"
read -p "Press Enter after navigating to Chat..."
take_screenshot "17-mobile-chat.png"

log_info "Resetting to desktop viewport (1920x1080)"
$AGENT_BROWSER --session "$SESSION" set viewport 1920 1080

log_success "Mobile responsiveness test completed"

# Test 6.2: Page Load Performance
echo ""
log_info "TEST 6.2: Page Load Performance"
echo "-------------------------------------------"

log_info "Measuring page load times"

# Landing page
log_info "Loading landing page..."
START_TIME=$(date +%s%N)
$AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
$AGENT_BROWSER --session "$SESSION" wait --load networkidle --timeout 30000
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
log_info "Landing page load time: ${DURATION}ms"
echo "Landing: ${DURATION}ms" >> "$TEST_RESULTS_DIR/page-load-times.txt"

# Documents page (manual navigation required)
log_warning "MANUAL: Navigate to Documents page"
read -p "Press Enter to start timing Documents page..."
START_TIME=$(date +%s%N)
sleep 1  # Simulate page transition
$AGENT_BROWSER --session "$SESSION" wait --load networkidle --timeout 30000
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
log_info "Documents page load time: ${DURATION}ms"
echo "Documents: ${DURATION}ms" >> "$TEST_RESULTS_DIR/page-load-times.txt"

# Chat page
log_warning "MANUAL: Navigate to Chat/Home page"
read -p "Press Enter to start timing Chat page..."
START_TIME=$(date +%s%N)
sleep 1
$AGENT_BROWSER --session "$SESSION" wait --load networkidle --timeout 30000
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
log_info "Chat page load time: ${DURATION}ms"
echo "Chat: ${DURATION}ms" >> "$TEST_RESULTS_DIR/page-load-times.txt"

log_success "Performance testing completed"

# Test 6.3: Network Timing
echo ""
log_info "TEST 6.3: Network Analysis"
echo "-------------------------------------------"

log_info "Capturing network requests"
$AGENT_BROWSER --session "$SESSION" network requests --json > "$TEST_RESULTS_DIR/network-requests.json" 2>/dev/null || \
    log_warning "Network capture not supported or failed"

log_success "Network analysis completed"

# Summary
echo ""
echo "========================================="
echo "  PERFORMANCE TESTS COMPLETE"
echo "========================================="
echo ""
log_info "Results saved to: $TEST_RESULTS_DIR"
echo ""
log_warning "Review results to verify:"
echo "  ✓ Mobile viewport renders correctly"
echo "  ✓ All pages load within 3 seconds"
echo "  ✓ No console errors on key pages"
echo ""
cat "$TEST_RESULTS_DIR/page-load-times.txt"
echo ""
