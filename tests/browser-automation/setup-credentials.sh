#!/bin/bash

# Interactive script to set up test credentials

echo ""
echo "========================================="
echo "  TEST CREDENTIALS SETUP"
echo "========================================="
echo ""
echo "This script will help you configure test credentials for browser automation testing."
echo ""

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.sh"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: config.sh not found at $CONFIG_FILE"
    exit 1
fi

echo "Step 1: Create a test account"
echo "------------------------------"
echo ""
echo "1. Go to: https://smart-agent-platform.vercel.app"
echo "2. Click 'Sign Up'"
echo "3. Create a new account with:"
echo "   - A dedicated test email (e.g., test+automation@yourdomain.com)"
echo "   - A secure password"
echo "4. Verify the account if needed"
echo ""
read -p "Press Enter once you've created your test account..."

echo ""
echo "Step 2: Enter test credentials"
echo "-------------------------------"
echo ""

# Get email
read -p "Enter test account email: " TEST_EMAIL

# Get password (hidden input)
read -s -p "Enter test account password: " TEST_PASSWORD
echo ""

# Confirm password
read -s -p "Confirm password: " TEST_PASSWORD_CONFIRM
echo ""

if [ "$TEST_PASSWORD" != "$TEST_PASSWORD_CONFIRM" ]; then
    echo "ERROR: Passwords don't match!"
    exit 1
fi

echo ""
echo "Step 3: Update configuration"
echo "----------------------------"
echo ""

# Create backup
cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
echo "Created backup: config.sh.backup"

# Update config file
sed -i '' "s|TEST_EMAIL=\".*\"|TEST_EMAIL=\"$TEST_EMAIL\"|" "$CONFIG_FILE"
sed -i '' "s|TEST_PASSWORD=\".*\"|TEST_PASSWORD=\"$TEST_PASSWORD\"|" "$CONFIG_FILE"

echo "✓ Configuration updated!"
echo ""

# Verify
echo "Verifying configuration..."
source "$CONFIG_FILE"

if [ "$TEST_EMAIL" = "test@example.com" ]; then
    echo "WARNING: Email still set to default. Update may have failed."
    echo "Please edit config.sh manually."
    exit 1
fi

echo ""
echo "========================================="
echo "  SETUP COMPLETE!"
echo "========================================="
echo ""
echo "Test credentials configured:"
echo "  Email: $TEST_EMAIL"
echo "  Password: ********"
echo ""
echo "Next steps:"
echo "  1. Run verification: bash verify-setup.sh"
echo "  2. Run tests: bash run-all-tests.sh"
echo ""
