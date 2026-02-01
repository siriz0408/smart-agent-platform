#!/bin/bash

# Test Configuration for Smart Agent Platform
# Browser Automation Testing with agent-browser

# Production URL
PROD_URL="https://smart-agent-platform.vercel.app"

# Test session name
SESSION_NAME="smart-agent-test"

# Timeouts (milliseconds)
DEFAULT_TIMEOUT=30000
LONG_TIMEOUT=60000
AI_RESPONSE_TIMEOUT=30000

# Directories
TEST_DATA_DIR="./test-data"
TEST_RESULTS_DIR="./test-results"

# Test credentials (CHANGE THESE FOR YOUR TEST ACCOUNT)
# IMPORTANT: Use a dedicated test account, not production data
TEST_EMAIL="test@example.com"
TEST_PASSWORD="testpassword123"

# agent-browser command (supports both global and local installation)
if command -v agent-browser &> /dev/null; then
    AGENT_BROWSER="agent-browser"
else
    AGENT_BROWSER="npx agent-browser"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if agent-browser is installed
check_agent_browser() {
    if command -v agent-browser &> /dev/null; then
        log_success "agent-browser is installed (global)"
        return 0
    elif command -v npx &> /dev/null && npx agent-browser --version &> /dev/null; then
        log_success "agent-browser is installed (local via npx)"
        return 0
    else
        log_error "agent-browser is not installed"
        log_info "Install it with: npm install -g agent-browser"
        log_info "Or locally: npm install --save-dev agent-browser"
        return 1
    fi
}

# Create session if it doesn't exist
create_session() {
    log_info "Creating test session: $SESSION_NAME"
    $AGENT_BROWSER --session "$SESSION_NAME" open about:blank 2>/dev/null || true
}

# Take screenshot helper
take_screenshot() {
    local filename="$1"
    local filepath="$TEST_RESULTS_DIR/$filename"
    log_info "Taking screenshot: $filename"
    $AGENT_BROWSER --session "$SESSION_NAME" screenshot "$filepath"
}

# Wait helper
wait_for() {
    local condition="$1"
    local timeout="${2:-$DEFAULT_TIMEOUT}"
    log_info "Waiting for: $condition (timeout: ${timeout}ms)"
    $AGENT_BROWSER --session "$SESSION_NAME" wait "$condition" --timeout "$timeout"
}

# Export functions for use in test scripts
export -f log_info log_success log_warning log_error
export -f check_agent_browser create_session take_screenshot wait_for
