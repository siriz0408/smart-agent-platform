#!/bin/bash

# Update Roadmap HTML Script
# This script helps PM-Orchestrator update the roadmap HTML file
# Usage: ./update-roadmap.sh [cycle-number] [date]

CYCLE_NUM=${1:-$(date +%s | cut -c1-10)}
DATE=${2:-$(date +%Y-%m-%d)}

echo "Updating roadmap for Cycle $CYCLE_NUM on $DATE"
echo ""
echo "This script is a helper. PM-Orchestrator should:"
echo "1. Read STATE.md and WORK_STATUS.md"
echo "2. Generate cycle recap markdown"
echo "3. Use search_replace tool to update smart-agent-roadmap.html"
echo "4. Insert new cycle recap at top of cycle recaps list"
echo "5. Update task statuses, progress bars, PM statuses"
echo "6. Update 'Last Updated' timestamp"
echo ""
echo "See docs/pm-agents/agents/PM-Orchestrator/AGENT.md section 13.7 for detailed instructions."
