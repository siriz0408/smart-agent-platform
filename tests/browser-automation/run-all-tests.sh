#!/bin/bash

# Master Test Runner
# Runs all browser automation tests sequentially

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
source ./config.sh

echo ""
echo "========================================="
echo "  SMART AGENT PLATFORM"
echo "  BROWSER AUTOMATION TEST SUITE"
echo "========================================="
echo ""
echo "Production URL: $PROD_URL"
echo "Test Session: $SESSION_NAME"
echo "Results Directory: $TEST_RESULTS_DIR"
echo ""

# Check prerequisites
check_agent_browser || exit 1

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"
log_success "Test results directory ready"

# Confirm start
echo ""
log_warning "This will run all browser automation tests."
log_warning "Some tests require manual interaction."
echo ""
read -p "Press Enter to begin testing, or Ctrl+C to cancel..."

# Initialize test report
REPORT_FILE="$TEST_RESULTS_DIR/test-report.md"
echo "# Smart Agent Platform - Browser Automation Test Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Date**: $(date)" >> "$REPORT_FILE"
echo "**Production URL**: $PROD_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Phase 1: Setup
echo ""
log_info "PHASE 1: Environment Setup"
echo "-------------------------------------------"
create_session
log_success "Phase 1 complete"
echo "## Phase 1: Setup ✅" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Phase 2: Authentication
echo ""
log_info "PHASE 2: Authentication Testing"
echo "-------------------------------------------"
bash ./scripts/01-auth-test.sh
PHASE2_RESULT=$?

if [ $PHASE2_RESULT -eq 0 ]; then
    log_success "Phase 2 complete"
    echo "## Phase 2: Authentication ✅" >> "$REPORT_FILE"
else
    log_error "Phase 2 failed"
    echo "## Phase 2: Authentication ❌" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Phase 3: Document Management
echo ""
log_info "PHASE 3: Document Management Testing"
echo "-------------------------------------------"
bash ./scripts/02-documents-test.sh
PHASE3_RESULT=$?

if [ $PHASE3_RESULT -eq 0 ]; then
    log_success "Phase 3 complete"
    echo "## Phase 3: Document Management ✅" >> "$REPORT_FILE"
else
    log_error "Phase 3 failed"
    echo "## Phase 3: Document Management ❌" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Phase 4: AI Chat
echo ""
log_info "PHASE 4: AI Chat Testing"
echo "-------------------------------------------"
bash ./scripts/03-ai-chat-test.sh
PHASE4_RESULT=$?

if [ $PHASE4_RESULT -eq 0 ]; then
    log_success "Phase 4 complete"
    echo "## Phase 4: AI Chat ✅" >> "$REPORT_FILE"
else
    log_error "Phase 4 failed"
    echo "## Phase 4: AI Chat ❌" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Phase 5: CRM Features
echo ""
log_info "PHASE 5: CRM Features Testing"
echo "-------------------------------------------"
bash ./scripts/04-crm-test.sh
PHASE5_RESULT=$?

if [ $PHASE5_RESULT -eq 0 ]; then
    log_success "Phase 5 complete"
    echo "## Phase 5: CRM Features ✅" >> "$REPORT_FILE"
else
    log_error "Phase 5 failed"
    echo "## Phase 5: CRM Features ❌" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Phase 6: Performance
echo ""
log_info "PHASE 6: Performance & Responsiveness Testing"
echo "-------------------------------------------"
bash ./scripts/05-performance-test.sh
PHASE6_RESULT=$?

if [ $PHASE6_RESULT -eq 0 ]; then
    log_success "Phase 6 complete"
    echo "## Phase 6: Performance & Responsiveness ✅" >> "$REPORT_FILE"
else
    log_error "Phase 6 failed"
    echo "## Phase 6: Performance & Responsiveness ❌" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# Final Summary
echo ""
echo "========================================="
echo "  ALL TESTS COMPLETE"
echo "========================================="
echo ""

# Add summary to report
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Authentication: $([ $PHASE2_RESULT -eq 0 ] && echo '✅ Pass' || echo '❌ Fail')" >> "$REPORT_FILE"
echo "- Document Management: $([ $PHASE3_RESULT -eq 0 ] && echo '✅ Pass' || echo '❌ Fail')" >> "$REPORT_FILE"
echo "- AI Chat: $([ $PHASE4_RESULT -eq 0 ] && echo '✅ Pass' || echo '❌ Fail')" >> "$REPORT_FILE"
echo "- CRM Features: $([ $PHASE5_RESULT -eq 0 ] && echo '✅ Pass' || echo '❌ Fail')" >> "$REPORT_FILE"
echo "- Performance: $([ $PHASE6_RESULT -eq 0 ] && echo '✅ Pass' || echo '❌ Fail')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "Test report saved to: $REPORT_FILE"
echo ""
log_info "Review the following:"
echo "  1. Screenshots in $TEST_RESULTS_DIR/*.png"
echo "  2. Page snapshots in $TEST_RESULTS_DIR/*.txt"
echo "  3. Test report: $REPORT_FILE"
echo ""
log_success "Test suite execution complete!"
echo ""
