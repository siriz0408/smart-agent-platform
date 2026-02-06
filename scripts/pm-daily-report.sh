#!/bin/bash
# PM Daily Report Generator
# Runs autonomously via launchd to generate daily PM reports
# Saves to desktop and docs/pm-agents/reports/

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PM_AGENTS_DIR="$PROJECT_DIR/docs/pm-agents"
REPORTS_DIR="$PM_AGENTS_DIR/reports"
DESKTOP_DIR="$HOME/Desktop"

# Date formatting
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M)
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S EST")

# Output files
REPORT_FOLDER="$REPORTS_DIR/$DATE"
REPORT_FILE="$REPORT_FOLDER/${TIME}-auto.md"
DESKTOP_FILE="$DESKTOP_DIR/PM-Report-$DATE.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[PM-Report]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[PM-Report]${NC} $1"
}

error() {
    echo -e "${RED}[PM-Report]${NC} $1"
    exit 1
}

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    # Try to load from .env file
    if [ -f "$PROJECT_DIR/.env" ]; then
        export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs 2>/dev/null) 2>/dev/null || true
    fi
    # Try .env.local
    if [ -z "$ANTHROPIC_API_KEY" ] && [ -f "$PROJECT_DIR/.env.local" ]; then
        export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs 2>/dev/null) 2>/dev/null || true
    fi
    # Try zshrc/bashrc
    if [ -z "$ANTHROPIC_API_KEY" ] && [ -f "$HOME/.zshrc" ]; then
        source "$HOME/.zshrc" 2>/dev/null || true
    fi
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  ANTHROPIC_API_KEY not found!${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "To fix this, add your API key to one of these locations:"
        echo ""
        echo "  Option 1: Add to .env file"
        echo "    echo 'ANTHROPIC_API_KEY=your-key-here' >> $PROJECT_DIR/.env"
        echo ""
        echo "  Option 2: Add to .zshrc (persistent)"
        echo "    echo 'export ANTHROPIC_API_KEY=your-key-here' >> ~/.zshrc"
        echo "    source ~/.zshrc"
        echo ""
        echo "  Option 3: Set for this session only"
        echo "    export ANTHROPIC_API_KEY=your-key-here"
        echo "    ./scripts/pm-daily-report.sh"
        echo ""
        echo "Get your API key at: https://console.anthropic.com/settings/keys"
        echo ""
        exit 1
    fi
fi

log "Starting PM Daily Report generation..."
log "Date: $DATE"
log "Project: $PROJECT_DIR"

# Create reports directory if needed
mkdir -p "$REPORT_FOLDER"

# Read context files
log "Reading PM context files..."

STATE_CONTENT=""
if [ -f "$PM_AGENTS_DIR/STATE.md" ]; then
    STATE_CONTENT=$(cat "$PM_AGENTS_DIR/STATE.md")
else
    warn "STATE.md not found, using empty state"
fi

VISION_CONTENT=""
if [ -f "$PM_AGENTS_DIR/VISION.md" ]; then
    VISION_CONTENT=$(cat "$PM_AGENTS_DIR/VISION.md" | head -100)  # First 100 lines
else
    warn "VISION.md not found"
fi

OWNERSHIP_CONTENT=""
if [ -f "$PM_AGENTS_DIR/OWNERSHIP.md" ]; then
    OWNERSHIP_CONTENT=$(cat "$PM_AGENTS_DIR/OWNERSHIP.md" | head -50)  # First 50 lines
else
    warn "OWNERSHIP.md not found"
fi

# Build the prompt
SYSTEM_PROMPT="You are PM-Orchestrator, the Lead Product Manager for Smart Agent - a real estate AI platform. 

Your job is to generate a daily PM report summarizing the state of the product and priorities.

You have 10 domain PMs reporting to you:
- PM-Intelligence (AI/RAG)
- PM-Context (Documents/CRM)
- PM-Transactions (Deals/Pipeline)
- PM-Experience (UI/UX)
- PM-Growth (Billing/Onboarding)
- PM-Integration (External APIs)
- PM-Discovery (Search)
- PM-Communication (Messaging)
- PM-Infrastructure (DevOps)
- PM-Security (Auth/Compliance)

Generate a concise but comprehensive daily report."

USER_PROMPT="Generate the PM Daily Report for $TIMESTAMP.

## Current State
$STATE_CONTENT

## Vision Summary
$VISION_CONTENT

## Ownership Summary
$OWNERSHIP_CONTENT

---

Generate a report with:
1. Overall Status (🟢/🟡/🔴)
2. Executive Summary (2-3 sentences)
3. PM Domain Highlights (one line per PM on what they should focus on today)
4. Top 3 Priorities for Today
5. Any Blockers or Risks
6. Decisions Pending (if any)

Keep it concise and actionable. This report will be read first thing in the morning."

# Escape the prompts for JSON
SYSTEM_ESCAPED=$(echo "$SYSTEM_PROMPT" | jq -Rs .)
USER_ESCAPED=$(echo "$USER_PROMPT" | jq -Rs .)

log "Calling Anthropic API..."

# Call Anthropic API
RESPONSE=$(curl -s https://api.anthropic.com/v1/messages \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -d "{
        \"model\": \"claude-sonnet-4-20250514\",
        \"max_tokens\": 2000,
        \"system\": $SYSTEM_ESCAPED,
        \"messages\": [
            {\"role\": \"user\", \"content\": $USER_ESCAPED}
        ]
    }")

# Check for errors
if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
    error "API Error: $ERROR_MSG"
fi

# Extract the content
REPORT_CONTENT=$(echo "$RESPONSE" | jq -r '.content[0].text')

if [ -z "$REPORT_CONTENT" ] || [ "$REPORT_CONTENT" == "null" ]; then
    error "Failed to extract report content from API response"
fi

# Build the full report with header
FULL_REPORT="# PM Daily Report - $DATE

> Generated: $TIMESTAMP  
> Type: Automated Daily Report  
> Generated by: PM-Orchestrator (via pm-daily-report.sh)

---

$REPORT_CONTENT

---

*This report was automatically generated. For detailed reports, run \"Run PM morning standup\" in Cursor.*
"

# Save to reports folder
log "Saving to $REPORT_FILE..."
echo "$FULL_REPORT" > "$REPORT_FILE"

# Save to desktop
log "Saving to $DESKTOP_FILE..."
echo "$FULL_REPORT" > "$DESKTOP_FILE"

# Update STATE.md with last run info
log "Updating STATE.md..."
if [ -f "$PM_AGENTS_DIR/STATE.md" ]; then
    # Update the last run timestamp in STATE.md
    sed -i '' "s/\*\*Last Run:\*\* .*/\*\*Last Run:\*\* $TIMESTAMP (auto)/" "$PM_AGENTS_DIR/STATE.md" 2>/dev/null || true
fi

log "✅ PM Daily Report generated successfully!"
log "   Report: $REPORT_FILE"
log "   Desktop: $DESKTOP_FILE"

# Optional: Open the desktop file
# open "$DESKTOP_FILE"

exit 0
