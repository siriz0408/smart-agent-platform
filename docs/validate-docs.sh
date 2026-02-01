#!/bin/bash
# Documentation Consistency Validation Script
# Ensures all documentation stays in sync with code changes

set -e

echo "🔍 Checking documentation consistency..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES=0

# Check for outdated Lovable references (excluding historical docs and validation files)
echo "📋 Checking for outdated Lovable references..."
if grep -r "LOVABLE_API_KEY" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude="*.sh" \
    --exclude="AI_DEPLOYMENT_TESTING.md" \
    --exclude="DOCUMENTATION_UPDATE_CHECKLIST.md" \
    --exclude="AI_ISSUE_ROOT_CAUSE.md" \
    --exclude="AI_TROUBLESHOOTING.md" \
    --exclude="validate-config.yml" \
    2>/dev/null; then
    echo -e "${RED}❌ Found LOVABLE_API_KEY references in code (should be ANTHROPIC_API_KEY)${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No LOVABLE_API_KEY references in code${NC}"
fi

if grep -r "ai\.gateway\.lovable\.dev" . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir=dist \
    --exclude="*.sh" \
    --exclude="AI_DEPLOYMENT_TESTING.md" \
    --exclude="DOCUMENTATION_UPDATE_CHECKLIST.md" \
    --exclude="AI_ISSUE_ROOT_CAUSE.md" \
    --exclude="validate-config.yml" \
    --exclude="index.html" \
    --exclude="create-checkout-session" \
    --exclude="create-customer-portal" \
    2>/dev/null; then
    echo -e "${RED}❌ Found ai.gateway.lovable.dev references (should be api.anthropic.com)${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No lovable.dev AI gateway references${NC}"
fi

echo ""

# Check for Anthropic consistency
echo "🤖 Checking Anthropic API configuration documentation..."
if grep -q "ANTHROPIC_API_KEY" CLAUDE.md 2>/dev/null; then
    echo -e "${GREEN}✅ CLAUDE.md mentions ANTHROPIC_API_KEY${NC}"
else
    echo -e "${RED}❌ CLAUDE.md missing ANTHROPIC_API_KEY documentation${NC}"
    ISSUES=$((ISSUES + 1))
fi

if grep -q "ANTHROPIC_API_KEY" docs/SUPABASE_SETUP.md 2>/dev/null; then
    echo -e "${GREEN}✅ SUPABASE_SETUP.md mentions ANTHROPIC_API_KEY${NC}"
else
    echo -e "${RED}❌ SUPABASE_SETUP.md missing ANTHROPIC_API_KEY documentation${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# Check command consistency
echo "⚙️  Checking command documentation..."
if grep -q "npm run status" COMMON_COMMANDS.md 2>/dev/null; then
    echo -e "${GREEN}✅ COMMON_COMMANDS.md has 'npm run status'${NC}"
else
    echo -e "${YELLOW}⚠️  COMMON_COMMANDS.md missing 'npm run status'${NC}"
fi

if grep -q "npm run deploy" COMMON_COMMANDS.md 2>/dev/null; then
    echo -e "${GREEN}✅ COMMON_COMMANDS.md has 'npm run deploy'${NC}"
else
    echo -e "${YELLOW}⚠️  COMMON_COMMANDS.md missing 'npm run deploy'${NC}"
fi

if grep -q "supabase functions deploy" COMMON_COMMANDS.md 2>/dev/null; then
    echo -e "${GREEN}✅ COMMON_COMMANDS.md has Supabase function deployment${NC}"
else
    echo -e "${YELLOW}⚠️  COMMON_COMMANDS.md missing Supabase function deployment${NC}"
fi

echo ""

# Check environment variable documentation
echo "🔐 Checking environment variable documentation..."
if grep -q "VITE_SUPABASE_URL" README.md 2>/dev/null; then
    echo -e "${GREEN}✅ README.md documents frontend env vars${NC}"
else
    echo -e "${RED}❌ README.md missing frontend env var documentation${NC}"
    ISSUES=$((ISSUES + 1))
fi

if grep -q "ANTHROPIC_API_KEY" README.md 2>/dev/null; then
    echo -e "${GREEN}✅ README.md documents ANTHROPIC_API_KEY${NC}"
else
    echo -e "${YELLOW}⚠️  README.md missing ANTHROPIC_API_KEY documentation${NC}"
fi

echo ""

# Check for AI configuration consistency
echo "🧠 Checking AI service configuration..."
AI_CONFIG_FILE="supabase/functions/_shared/ai-config.ts"
if [ -f "$AI_CONFIG_FILE" ]; then
    if grep -q "api.anthropic.com" "$AI_CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ ai-config.ts uses api.anthropic.com${NC}"
    else
        echo -e "${RED}❌ ai-config.ts not using api.anthropic.com${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ ai-config.ts not found${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# Check critical documentation files exist
echo "📚 Checking critical documentation files..."
CRITICAL_DOCS=(
    "CLAUDE.md"
    "README.md"
    "COMMON_COMMANDS.md"
    "docs/SUPABASE_SETUP.md"
    "Smart_Agent_Platform_PRD_v2.md"
    ".lovable/plan.md"
)

for doc in "${CRITICAL_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc exists${NC}"
    else
        echo -e "${RED}❌ $doc missing${NC}"
        ISSUES=$((ISSUES + 1))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✨ Documentation validation passed! No issues found.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Found $ISSUES documentation issue(s). Please review and fix.${NC}"
    exit 1
fi
