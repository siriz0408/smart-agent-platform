#!/bin/bash

# Setup Verification Script
# Checks if everything is ready for testing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
source ./config.sh 2>/dev/null || true

echo ""
echo "========================================="
echo "  SETUP VERIFICATION"
echo "========================================="
echo ""

# Track issues
ISSUES=0

# Check 1: agent-browser installed
echo "✓ Checking agent-browser installation..."
if command -v agent-browser &> /dev/null; then
    VERSION=$(agent-browser --version 2>&1 || echo "unknown")
    log_success "agent-browser is installed (global): $VERSION"
elif command -v npx &> /dev/null && npx agent-browser --version &> /dev/null; then
    VERSION=$(npx agent-browser --version 2>&1 || echo "unknown")
    log_success "agent-browser is installed (local via npx): $VERSION"
else
    log_error "agent-browser is NOT installed"
    echo "  Install globally: npm install -g agent-browser"
    echo "  Or locally: npm install --save-dev agent-browser"
    ISSUES=$((ISSUES + 1))
fi

# Check 2: Node.js and npm
echo ""
echo "✓ Checking Node.js and npm..."
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_success "Node.js $NODE_VERSION, npm $NPM_VERSION"
else
    log_error "Node.js or npm not found"
    ISSUES=$((ISSUES + 1))
fi

# Check 3: Test scripts are executable
echo ""
echo "✓ Checking script permissions..."
if [ -x "./run-all-tests.sh" ] && [ -x "./scripts/01-auth-test.sh" ]; then
    log_success "Scripts are executable"
else
    log_warning "Scripts may not be executable"
    echo "  Run: chmod +x run-all-tests.sh scripts/*.sh"
fi

# Check 4: Test data exists
echo ""
echo "✓ Checking test data..."
if [ -f "./test-data/sample-document.txt" ]; then
    log_success "Sample document exists"
else
    log_warning "Sample document not found"
    echo "  Expected: ./test-data/sample-document.txt"
fi

# Check 5: Test results directory
echo ""
echo "✓ Checking test results directory..."
if [ -d "./test-results" ]; then
    log_success "Test results directory exists"
else
    log_warning "Creating test results directory..."
    mkdir -p test-results
fi

# Check 6: Configuration file
echo ""
echo "✓ Checking configuration..."
if [ -f "./config.sh" ]; then
    log_success "Configuration file exists"

    # Check if credentials are configured
    if grep -q "test@example.com" config.sh; then
        log_warning "Test credentials not configured (still using defaults)"
        echo "  Edit config.sh and update TEST_EMAIL and TEST_PASSWORD"
    else
        log_success "Test credentials appear to be configured"
    fi
else
    log_error "Configuration file not found"
    ISSUES=$((ISSUES + 1))
fi

# Check 7: Production URL accessibility
echo ""
echo "✓ Checking production URL..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        log_success "Production URL is accessible (HTTP $HTTP_CODE)"
    else
        log_warning "Production URL returned HTTP $HTTP_CODE"
        echo "  URL: $PROD_URL"
    fi
else
    log_info "curl not available, skipping URL check"
fi

# Check 8: Documentation files
echo ""
echo "✓ Checking documentation..."
DOCS=("README.md" "QUICK_START.md" "INSTALLATION.md" "TESTING_GUIDE.md")
DOCS_OK=0
for doc in "${DOCS[@]}"; do
    if [ -f "./$doc" ]; then
        DOCS_OK=$((DOCS_OK + 1))
    fi
done
log_success "$DOCS_OK/${#DOCS[@]} documentation files present"

# Summary
echo ""
echo "========================================="
echo "  VERIFICATION SUMMARY"
echo "========================================="
echo ""

if [ $ISSUES -eq 0 ]; then
    log_success "Setup verification PASSED"
    echo ""
    echo "You're ready to run tests!"
    echo ""
    echo "Quick start:"
    echo "  bash run-all-tests.sh"
    echo ""
    echo "Or run individual tests:"
    echo "  bash scripts/01-auth-test.sh"
    echo ""
else
    log_error "Setup verification FAILED with $ISSUES issues"
    echo ""
    echo "Please fix the issues above before running tests."
    echo ""
fi

exit $ISSUES
