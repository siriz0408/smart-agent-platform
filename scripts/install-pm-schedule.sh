#!/bin/bash
# PM Schedule Installer
# Installs the launchd job for daily PM reports at 8am

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_SOURCE="$SCRIPT_DIR/com.smartagent.pm-report.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.smartagent.pm-report.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PM Daily Report Scheduler Installer      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check for required files
echo -e "${YELLOW}Checking requirements...${NC}"

if [ ! -f "$PLIST_SOURCE" ]; then
    echo -e "${RED}✗ Error: Plist file not found at $PLIST_SOURCE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Plist file found${NC}"

if [ ! -f "$SCRIPT_DIR/pm-daily-report.sh" ]; then
    echo -e "${RED}✗ Error: pm-daily-report.sh not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Report script found${NC}"

# Check for ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
    if [ -f "$PROJECT_DIR/.env" ]; then
        source <(grep ANTHROPIC_API_KEY "$PROJECT_DIR/.env" | sed 's/^/export /')
    fi
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠ Warning: ANTHROPIC_API_KEY not found in environment${NC}"
    echo -e "  The script will try to load it from .env file at runtime."
    echo -e "  Make sure ANTHROPIC_API_KEY is set in $PROJECT_DIR/.env"
    echo ""
else
    echo -e "${GREEN}✓ ANTHROPIC_API_KEY found${NC}"
fi

# Create LaunchAgents directory if needed
if [ ! -d "$LAUNCH_AGENTS_DIR" ]; then
    echo -e "${YELLOW}Creating LaunchAgents directory...${NC}"
    mkdir -p "$LAUNCH_AGENTS_DIR"
fi

# Unload existing job if present
if [ -f "$PLIST_DEST" ]; then
    echo -e "${YELLOW}Unloading existing schedule...${NC}"
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Copy plist to LaunchAgents
echo -e "${YELLOW}Installing schedule...${NC}"
cp "$PLIST_SOURCE" "$PLIST_DEST"
echo -e "${GREEN}✓ Plist copied to $PLIST_DEST${NC}"

# Load the job
echo -e "${YELLOW}Loading schedule...${NC}"
launchctl load "$PLIST_DEST"
echo -e "${GREEN}✓ Schedule loaded${NC}"

# Verify
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"
if launchctl list | grep -q "com.smartagent.pm-report"; then
    echo -e "${GREEN}✓ Schedule is active${NC}"
else
    echo -e "${YELLOW}⚠ Schedule may not be active yet (this is normal)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation Complete!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "The PM Daily Report will run automatically at ${BLUE}8:00 AM${NC} every day."
echo ""
echo -e "${YELLOW}Reports will be saved to:${NC}"
echo -e "  • Desktop: ~/Desktop/PM-Report-YYYY-MM-DD.md"
echo -e "  • Project: docs/pm-agents/reports/YYYY-MM-DD/"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  ${BLUE}Test now:${NC}        ./scripts/pm-daily-report.sh"
echo -e "  ${BLUE}View logs:${NC}       cat logs/pm-report.log"
echo -e "  ${BLUE}Disable:${NC}         launchctl unload ~/Library/LaunchAgents/com.smartagent.pm-report.plist"
echo -e "  ${BLUE}Re-enable:${NC}       launchctl load ~/Library/LaunchAgents/com.smartagent.pm-report.plist"
echo -e "  ${BLUE}Check status:${NC}    launchctl list | grep smartagent"
echo ""
echo -e "${YELLOW}To test the script manually:${NC}"
echo -e "  cd $PROJECT_DIR && ./scripts/pm-daily-report.sh"
echo ""
