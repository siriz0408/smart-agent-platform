#!/bin/bash

# Document Management Testing Script
# Tests: Document Upload, Indexing, Viewing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source ./config.sh

SESSION="$SESSION_NAME"

echo "========================================="
echo "  DOCUMENT MANAGEMENT TESTING"
echo "========================================="
echo ""

# Check prerequisites
check_agent_browser || exit 1

# Restore authenticated session
if [ -f "$TEST_RESULTS_DIR/auth-state.json" ]; then
    log_info "Restoring authenticated session"
    $AGENT_BROWSER --session "$SESSION" state load "$TEST_RESULTS_DIR/auth-state.json"
else
    log_warning "No saved auth state found. Please run 01-auth-test.sh first"
    log_info "Opening production URL - you may need to log in"
    $AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
    read -p "Press Enter after logging in..."
fi

# Test 3.1: Navigate to Documents Page
echo ""
log_info "TEST 3.1: Navigate to Documents Page"
echo "-------------------------------------------"

log_info "Looking for Documents navigation"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/04-pre-documents-snapshot.txt"

log_warning "MANUAL NAVIGATION REQUIRED:"
echo "  Navigate to the Documents page using one of:"
echo "  - $AGENT_BROWSER --session $SESSION find text 'Documents' click"
echo "  - $AGENT_BROWSER --session $SESSION open $PROD_URL/documents"
echo ""

read -p "Press Enter after navigating to Documents page..."

take_screenshot "04-documents-page.png"
$AGENT_BROWSER --session "$SESSION" get url > "$TEST_RESULTS_DIR/04-documents-url.txt"

log_success "Documents page loaded"

# Test 3.2: Document Upload
echo ""
log_info "TEST 3.2: Document Upload"
echo "-------------------------------------------"

# Check if test document exists
if [ ! -f "$TEST_DATA_DIR/sample-document.pdf" ]; then
    log_warning "Sample document not found at: $TEST_DATA_DIR/sample-document.pdf"
    log_info "Creating a placeholder text file instead"
    echo "This is a test document for Smart Agent Platform testing." > "$TEST_DATA_DIR/sample-document.txt"
    echo "It contains sample text to test document upload and indexing." >> "$TEST_DATA_DIR/sample-document.txt"
    echo "Date: $(date)" >> "$TEST_DATA_DIR/sample-document.txt"
fi

log_info "Current page snapshot"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/05-documents-page-snapshot.txt"

log_warning "MANUAL UPLOAD REQUIRED:"
echo "  1. Locate the 'Upload' button in the UI"
echo "  2. Click it: $AGENT_BROWSER --session $SESSION find role button click --name 'Upload'"
echo "  3. Use file upload (varies by implementation)"
echo ""
echo "  Note: agent-browser file upload syntax varies. You may need to:"
echo "  - Use the browser's file picker dialog manually"
echo "  - Or find the file input element and set its value"
echo ""

read -p "Press Enter after uploading a document..."

log_info "Waiting for document processing..."
sleep 5

take_screenshot "05-document-uploaded.png"

log_info "Checking for indexed status"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/05-post-upload-snapshot.txt"

log_success "Document upload test completed"

# Test 3.3: Document Viewing
echo ""
log_info "TEST 3.3: Document Viewing"
echo "-------------------------------------------"

log_warning "MANUAL STEP:"
echo "  Click on the uploaded document to view details"
echo ""

read -p "Press Enter after clicking on a document..."

sleep 2
take_screenshot "06-document-view.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/06-document-view-snapshot.txt"

log_success "Document viewing test completed"

# Summary
echo ""
echo "========================================="
echo "  DOCUMENT TESTS COMPLETE"
echo "========================================="
echo ""
log_info "Screenshots saved to: $TEST_RESULTS_DIR"
echo ""
log_warning "Review screenshots and snapshots to verify:"
echo "  ✓ Documents page loads correctly"
echo "  ✓ Document upload works"
echo "  ✓ Document appears in list"
echo "  ✓ Document indexing completes"
echo "  ✓ Document details are viewable"
echo ""
