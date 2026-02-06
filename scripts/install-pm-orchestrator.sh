#!/bin/bash

# Install PM Orchestrator - Autonomous PM Agent System
# This script sets up the daily scheduled execution of PM agents

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.smartagent.pm-orchestrator"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "=============================================="
echo "PM Orchestrator Installation"
echo "=============================================="
echo ""

# Check Python
echo "1. Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "   ❌ Python 3 not found. Please install Python 3."
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "   ✅ Found: $PYTHON_VERSION"

# Install Python dependencies
echo ""
echo "2. Installing Python dependencies..."
cd "$PROJECT_DIR"
pip3 install -q -r pm_core/requirements.txt
echo "   ✅ Dependencies installed"

# Check for API key
echo ""
echo "3. Checking Anthropic API key..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    if [ -f "$PROJECT_DIR/.env" ] && grep -q "ANTHROPIC_API_KEY" "$PROJECT_DIR/.env"; then
        echo "   ✅ API key found in .env"
    else
        echo "   ⚠️  ANTHROPIC_API_KEY not set!"
        echo ""
        echo "   To set it, add to your shell profile or .env file:"
        echo "   export ANTHROPIC_API_KEY='your-key-here'"
        echo ""
        echo "   Get your key at: https://console.anthropic.com/"
        echo ""
        read -p "   Continue anyway? (y/n): " continue_install
        if [ "$continue_install" != "y" ]; then
            exit 1
        fi
    fi
else
    echo "   ✅ API key found in environment"
fi

# Create logs directory
echo ""
echo "4. Creating logs directory..."
mkdir -p "$PROJECT_DIR/logs"
echo "   ✅ Logs directory ready"

# Unload existing schedule if present
if launchctl list | grep -q "$PLIST_NAME"; then
    echo ""
    echo "5. Removing existing schedule..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    echo "   ✅ Previous schedule removed"
fi

# Copy and load new plist
echo ""
echo "6. Installing launchd schedule..."
cp "$PLIST_SRC" "$PLIST_DEST"
launchctl load "$PLIST_DEST"
echo "   ✅ Schedule installed"

# Verify
echo ""
echo "7. Verifying installation..."
if launchctl list | grep -q "$PLIST_NAME"; then
    echo "   ✅ PM Orchestrator scheduled successfully!"
else
    echo "   ❌ Schedule verification failed"
    exit 1
fi

echo ""
echo "=============================================="
echo "Installation Complete!"
echo "=============================================="
echo ""
echo "📅 PM agents will run daily at 8:00 AM"
echo ""
echo "📁 Logs: $PROJECT_DIR/logs/"
echo "📁 Reports: $PROJECT_DIR/docs/pm-agents/reports/"
echo "📁 Desktop: ~/Desktop/PM-Report-YYYY-MM-DD.md"
echo ""
echo "Commands:"
echo "  Run now (test):  python3 -m pm_core.pm_orchestrator --test"
echo "  Run now (full):  python3 -m pm_core.pm_orchestrator"
echo "  View logs:       tail -f $PROJECT_DIR/logs/pm-orchestrator-stdout.log"
echo "  Uninstall:       launchctl unload $PLIST_DEST"
echo ""
echo "⚠️  Make sure ANTHROPIC_API_KEY is set in your environment!"
