#!/bin/bash

# AI Chat Testing Script
# Tests: Basic Chat, RAG Queries, Multi-Document Chat

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
source ./config.sh

SESSION="$SESSION_NAME"

echo "========================================="
echo "  AI CHAT TESTING"
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

# Test 4.1: Navigate to Chat
echo ""
log_info "TEST 4.1: Navigate to Chat"
echo "-------------------------------------------"

log_info "Navigating to chat/home page"
$AGENT_BROWSER --session "$SESSION" open "$PROD_URL"
sleep 2

take_screenshot "07-chat-page.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/07-chat-snapshot.txt"

log_success "Chat page loaded"

# Test 4.2: Basic AI Chat
echo ""
log_info "TEST 4.2: Basic AI Chat"
echo "-------------------------------------------"

log_warning "MANUAL CHAT TEST:"
echo "  1. Find the chat input field"
echo "  2. Type: 'What is this platform?'"
echo "  3. Send the message"
echo ""
echo "  Example commands:"
echo "  $AGENT_BROWSER --session $SESSION find placeholder 'Ask' fill 'What is this platform?'"
echo "  $AGENT_BROWSER --session $SESSION press Enter"
echo ""

read -p "Press Enter after sending chat message..."

log_info "Waiting for AI response (timeout: ${AI_RESPONSE_TIMEOUT}ms)"
sleep 10

take_screenshot "08-ai-response.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/08-ai-response-snapshot.txt"

log_success "Basic chat test completed"

# Test 4.3: Document-Based Chat (RAG)
echo ""
log_info "TEST 4.3: Document-Based Chat (RAG)"
echo "-------------------------------------------"

log_warning "MANUAL RAG TEST:"
echo "  1. Ensure you have uploaded at least one document"
echo "  2. Ask: 'What information is in my uploaded documents?'"
echo "  3. Wait for AI to retrieve and respond"
echo ""

read -p "Press Enter after sending RAG query..."

sleep 10

take_screenshot "09-rag-response.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/09-rag-snapshot.txt"

log_info "Checking for document references in response"
grep -i "document\|chunk\|reference" "$TEST_RESULTS_DIR/09-rag-snapshot.txt" && \
    log_success "Found document references in AI response" || \
    log_warning "No obvious document references found"

log_success "RAG chat test completed"

# Test 4.4: Multi-Document Chat
echo ""
log_info "TEST 4.4: Multi-Document Chat"
echo "-------------------------------------------"

log_warning "MANUAL MULTI-DOC TEST:"
echo "  1. Ensure you have uploaded 2+ documents"
echo "  2. Ask: 'Compare the information across my documents'"
echo "  3. Wait for AI response"
echo ""

read -p "Press Enter after sending multi-doc query (or skip)..."

sleep 10

take_screenshot "10-multi-doc-chat.png"
$AGENT_BROWSER --session "$SESSION" snapshot -i > "$TEST_RESULTS_DIR/10-multi-doc-snapshot.txt"

log_success "Multi-document chat test completed"

# Summary
echo ""
echo "========================================="
echo "  AI CHAT TESTS COMPLETE"
echo "========================================="
echo ""
log_info "Screenshots saved to: $TEST_RESULTS_DIR"
echo ""
log_warning "Review screenshots and snapshots to verify:"
echo "  ✓ Chat interface loads correctly"
echo "  ✓ AI responds to basic queries"
echo "  ✓ RAG retrieves document information"
echo "  ✓ Multi-document queries work"
echo "  ✓ Responses appear within acceptable time"
echo ""
