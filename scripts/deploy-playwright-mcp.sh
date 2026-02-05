#!/bin/bash

# Deploy Playwright MCP (Phase 2)
# This script helps deploy and configure the Playwright MCP integration

set -e  # Exit on error

echo "🚀 Deploying Playwright MCP (Phase 2)"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: Must run from project root${NC}"
  exit 1
fi

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists npx; then
  echo -e "${RED}❌ npx not found. Please install Node.js${NC}"
  exit 1
fi

if ! command_exists git; then
  echo -e "${RED}❌ git not found. Please install Git${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Prerequisites met${NC}"
echo ""

# Step 1: Verify migrations
echo "1️⃣  Verifying database migrations..."

if [ -f "supabase/migrations/20260205000000_mcp_integration.sql" ] && \
   [ -f "supabase/migrations/20260205000100_qa_agent_configuration.sql" ]; then
  echo -e "${GREEN}✅ Migration files found${NC}"
else
  echo -e "${RED}❌ Migration files missing${NC}"
  exit 1
fi

# Step 2: Check environment variables
echo ""
echo "2️⃣  Checking required environment variables..."

MISSING_VARS=()

# Check Supabase secrets (will need manual verification)
echo -e "${YELLOW}⚠️  Please verify these secrets are set in Supabase:${NC}"
echo "   - GITHUB_TOKEN"
echo "   - GITHUB_REPO_OWNER"
echo "   - GITHUB_REPO_NAME"
echo "   - PLAYWRIGHT_WEBHOOK_SECRET"
echo ""
read -p "Have you set these Supabase secrets? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Please set Supabase secrets first:${NC}"
  echo "   npx supabase secrets set GITHUB_TOKEN=ghp_xxxxx"
  echo "   npx supabase secrets set GITHUB_REPO_OWNER=your-username"
  echo "   npx supabase secrets set GITHUB_REPO_NAME=ReAgentOS_V1"
  echo "   npx supabase secrets set PLAYWRIGHT_WEBHOOK_SECRET=\$(openssl rand -hex 32)"
  exit 1
fi

# Check GitHub secrets
echo -e "${YELLOW}⚠️  Please verify these secrets are set in GitHub:${NC}"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_PUBLISHABLE_KEY"
echo "   - PLAYWRIGHT_WEBHOOK_SECRET"
echo ""
read -p "Have you set these GitHub secrets? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠️  Please set GitHub secrets first (via GitHub UI or gh CLI)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment variables verified${NC}"

# Step 3: Push database migrations
echo ""
echo "3️⃣  Pushing database migrations..."
read -p "Push migrations to Supabase? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command_exists supabase; then
    npx supabase db push
    echo -e "${GREEN}✅ Migrations pushed${NC}"
  else
    echo -e "${YELLOW}⚠️  Supabase CLI not installed. Install with: npm install -g supabase${NC}"
    echo "   Or push manually via Supabase Dashboard → SQL Editor"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping migration push. Remember to push manually!${NC}"
fi

# Step 4: Deploy edge functions
echo ""
echo "4️⃣  Deploying edge functions..."
read -p "Deploy playwright-mcp, playwright-webhook, and mcp-gateway? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Deploying playwright-mcp..."
  npx supabase functions deploy playwright-mcp

  echo "Deploying playwright-webhook..."
  npx supabase functions deploy playwright-webhook

  echo "Deploying mcp-gateway..."
  npx supabase functions deploy mcp-gateway

  echo -e "${GREEN}✅ Edge functions deployed${NC}"
else
  echo -e "${YELLOW}⚠️  Skipping function deployment. Deploy manually with:${NC}"
  echo "   npx supabase functions deploy playwright-mcp"
  echo "   npx supabase functions deploy playwright-webhook"
  echo "   npx supabase functions deploy mcp-gateway"
fi

# Step 5: Verify GitHub workflow
echo ""
echo "5️⃣  Verifying GitHub workflow..."

if [ -f ".github/workflows/playwright.yml" ]; then
  echo -e "${GREEN}✅ Workflow file exists${NC}"

  # Check if committed
  if git ls-files --error-unmatch .github/workflows/playwright.yml >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Workflow file is committed${NC}"
  else
    echo -e "${YELLOW}⚠️  Workflow file not committed. Committing now...${NC}"
    git add .github/workflows/playwright.yml
    git commit -m "feat: add Playwright MCP workflow"
    echo -e "${GREEN}✅ Workflow file committed${NC}"
  fi

  # Prompt to push
  read -p "Push workflow to GitHub? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo -e "${GREEN}✅ Workflow pushed to GitHub${NC}"
  else
    echo -e "${YELLOW}⚠️  Remember to push: git push origin main${NC}"
  fi
else
  echo -e "${RED}❌ Workflow file missing${NC}"
  exit 1
fi

# Step 6: Create Storage bucket
echo ""
echo "6️⃣  Creating Supabase Storage bucket..."
read -p "Create test-artifacts storage bucket? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}ℹ️  Please create the bucket manually via Supabase Dashboard:${NC}"
  echo "   1. Go to Storage"
  echo "   2. Create new bucket: 'test-artifacts'"
  echo "   3. Make it public (or configure RLS policies)"
  echo ""
  echo "   OR run this SQL in Supabase SQL Editor:"
  echo "   INSERT INTO storage.buckets (id, name, public)"
  echo "   VALUES ('test-artifacts', 'test-artifacts', true)"
  echo "   ON CONFLICT (id) DO NOTHING;"
  echo ""
  read -p "Press Enter when done..." -r
  echo -e "${GREEN}✅ Storage bucket should be ready${NC}"
else
  echo -e "${YELLOW}⚠️  Skipping storage bucket creation${NC}"
fi

# Step 7: Test deployment
echo ""
echo "7️⃣  Testing deployment..."
read -p "Trigger a manual test workflow? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command_exists gh; then
    echo "Triggering workflow..."
    gh workflow run playwright.yml \
      --field test_run_id=00000000-0000-0000-0000-000000000000 \
      --field test_suite=smoke \
      --field project=chromium \
      --field callback_url=https://placeholder.supabase.co/functions/v1/playwright-webhook

    echo ""
    echo -e "${GREEN}✅ Workflow triggered. Check status with:${NC}"
    echo "   gh run list --workflow=playwright.yml"
  else
    echo -e "${YELLOW}⚠️  GitHub CLI not installed. Trigger manually via GitHub UI${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping test trigger${NC}"
fi

# Summary
echo ""
echo "======================================"
echo -e "${GREEN}✅ Playwright MCP Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "📚 Next Steps:"
echo "   1. Verify QA Agent exists:"
echo "      → Supabase Dashboard → Table Editor → ai_agents"
echo ""
echo "   2. Test agent execution:"
echo "      → Call execute-agent API with QA Agent ID"
echo ""
echo "   3. Monitor test runs:"
echo "      → Check test_runs table for results"
echo ""
echo "   4. Check notifications:"
echo "      → Check notifications table for test outcomes"
echo ""
echo "📖 Full documentation: docs/MCP_PHASE2_IMPLEMENTATION.md"
echo ""
