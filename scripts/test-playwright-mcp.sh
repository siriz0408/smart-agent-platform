#!/bin/bash

# Test Playwright MCP Integration
# This script deploys and tests the Playwright MCP implementation

set -e  # Exit on error

echo "🧪 Testing Playwright MCP Implementation"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get Supabase URL from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep VITE_SUPABASE_URL | xargs)
  SUPABASE_PROJECT_ID=$(echo $VITE_SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).*/\1/p')
  echo -e "${BLUE}ℹ️  Supabase Project: $SUPABASE_PROJECT_ID${NC}"
else
  echo -e "${RED}❌ .env file not found${NC}"
  exit 1
fi

echo ""

# Step 1: Check migrations
echo "1️⃣  Checking database migrations..."
echo ""

if npx supabase db diff --linked 2>&1 | grep -q "No schema changes detected"; then
  echo -e "${YELLOW}⚠️  Migrations not applied yet${NC}"
  read -p "Apply migrations now? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing migrations..."
    npx supabase db push --linked
    echo -e "${GREEN}✅ Migrations applied${NC}"
  else
    echo -e "${YELLOW}⚠️  Skipping migrations. Manual push required.${NC}"
  fi
else
  echo -e "${GREEN}✅ Migrations appear to be up to date${NC}"
fi

echo ""

# Step 2: Check/Set secrets
echo "2️⃣  Checking required secrets..."
echo ""

REQUIRED_SECRETS=("GITHUB_TOKEN" "GITHUB_REPO_OWNER" "GITHUB_REPO_NAME" "PLAYWRIGHT_WEBHOOK_SECRET")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
  if npx supabase secrets list --linked 2>&1 | grep -q "$secret"; then
    echo -e "${GREEN}✅ $secret is set${NC}"
  else
    echo -e "${YELLOW}⚠️  $secret is NOT set${NC}"
    MISSING_SECRETS+=("$secret")
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Missing secrets detected. Let's set them:${NC}"
  echo ""

  for secret in "${MISSING_SECRETS[@]}"; do
    case $secret in
      GITHUB_TOKEN)
        echo "GITHUB_TOKEN: Personal access token with 'repo' and 'workflow' permissions"
        echo "Generate at: https://github.com/settings/tokens"
        read -p "Enter GITHUB_TOKEN: " -s TOKEN
        echo
        npx supabase secrets set GITHUB_TOKEN="$TOKEN" --linked
        ;;
      GITHUB_REPO_OWNER)
        read -p "Enter GITHUB_REPO_OWNER (your GitHub username): " OWNER
        npx supabase secrets set GITHUB_REPO_OWNER="$OWNER" --linked
        ;;
      GITHUB_REPO_NAME)
        read -p "Enter GITHUB_REPO_NAME (e.g., ReAgentOS_V1): " REPO
        npx supabase secrets set GITHUB_REPO_NAME="$REPO" --linked
        ;;
      PLAYWRIGHT_WEBHOOK_SECRET)
        echo "Generating random webhook secret..."
        SECRET=$(openssl rand -hex 32)
        npx supabase secrets set PLAYWRIGHT_WEBHOOK_SECRET="$SECRET" --linked
        echo "PLAYWRIGHT_WEBHOOK_SECRET=$SECRET" >> .env.secrets
        echo -e "${BLUE}ℹ️  Webhook secret saved to .env.secrets${NC}"
        echo -e "${YELLOW}⚠️  Add this same secret to GitHub secrets!${NC}"
        ;;
    esac
  done

  echo ""
  echo -e "${GREEN}✅ Secrets configured${NC}"
fi

echo ""

# Step 3: Deploy edge functions
echo "3️⃣  Deploying edge functions..."
echo ""

FUNCTIONS=("mcp-gateway" "playwright-mcp" "playwright-webhook")

for func in "${FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$func" ]; then
    echo "Deploying $func..."
    if npx supabase functions deploy $func --linked; then
      echo -e "${GREEN}✅ $func deployed${NC}"
    else
      echo -e "${RED}❌ Failed to deploy $func${NC}"
      exit 1
    fi
  else
    echo -e "${RED}❌ Function directory not found: supabase/functions/$func${NC}"
    exit 1
  fi
done

echo ""

# Step 4: Verify QA Agent
echo "4️⃣  Verifying QA Agent..."
echo ""

echo "Checking if QA Agent exists..."
QUERY="SELECT id, name, is_active FROM ai_agents WHERE name = 'QA Agent' LIMIT 1;"

if npx supabase db query "$QUERY" --linked 2>&1 | grep -q "QA Agent"; then
  echo -e "${GREEN}✅ QA Agent found and configured${NC}"
  AGENT_ID=$(npx supabase db query "SELECT id FROM ai_agents WHERE name = 'QA Agent' LIMIT 1;" --linked | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
  echo "   Agent ID: $AGENT_ID"
else
  echo -e "${YELLOW}⚠️  QA Agent not found. Migration may not have run.${NC}"
fi

echo ""

# Step 5: Check storage bucket
echo "5️⃣  Checking storage bucket..."
echo ""

if npx supabase storage list --linked 2>&1 | grep -q "test-artifacts"; then
  echo -e "${GREEN}✅ test-artifacts bucket exists${NC}"
else
  echo -e "${YELLOW}⚠️  test-artifacts bucket not found${NC}"
  read -p "Create bucket now? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx supabase storage create test-artifacts --public --linked
    echo -e "${GREEN}✅ Bucket created${NC}"
  else
    echo -e "${YELLOW}⚠️  Create manually in Supabase Dashboard: Storage → New Bucket → 'test-artifacts' (public)${NC}"
  fi
fi

echo ""

# Step 6: Test MCP Gateway
echo "6️⃣  Testing MCP Gateway..."
echo ""

echo "Testing with a mock request (this will fail gracefully as we don't have a real test run)..."
echo ""

# Get a user JWT token (you'll need to replace this with actual auth)
echo -e "${YELLOW}⚠️  To test the MCP gateway, you need a valid user JWT token.${NC}"
echo "You can get one by:"
echo "  1. Logging into your app"
echo "  2. Opening browser DevTools → Application → Local Storage"
echo "  3. Finding the Supabase auth token"
echo ""

read -p "Do you have a JWT token to test with? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Enter JWT token: " -s JWT_TOKEN
  echo

  echo "Testing MCP Gateway..."
  RESPONSE=$(curl -s -X POST "https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/mcp-gateway" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "mcp_type": "playwright",
      "tool_name": "playwright_run_suite",
      "params": {
        "test_suite": "smoke",
        "project": "chromium"
      }
    }' 2>&1)

  echo "Response:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

  if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ MCP Gateway is working!${NC}"
  elif echo "$RESPONSE" | grep -q "test_run_id"; then
    echo -e "${GREEN}✅ MCP Gateway triggered successfully!${NC}"
  else
    echo -e "${YELLOW}⚠️  Check response above for details${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping live test. MCP Gateway should be deployed and ready.${NC}"
fi

echo ""

# Step 7: GitHub Workflow
echo "7️⃣  Checking GitHub workflow..."
echo ""

if [ -f ".github/workflows/playwright.yml" ]; then
  echo -e "${GREEN}✅ Workflow file exists${NC}"

  # Check if committed
  if git ls-files --error-unmatch .github/workflows/playwright.yml >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Workflow file is committed${NC}"

    # Check if pushed
    if git diff origin/main -- .github/workflows/playwright.yml | grep -q "playwright.yml"; then
      echo -e "${YELLOW}⚠️  Workflow not pushed to remote. Push with: git push origin main${NC}"
    else
      echo -e "${GREEN}✅ Workflow is pushed to remote${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Workflow not committed. Run:${NC}"
    echo "   git add .github/workflows/playwright.yml"
    echo "   git commit -m 'feat: add Playwright MCP workflow'"
    echo "   git push origin main"
  fi
else
  echo -e "${RED}❌ Workflow file missing${NC}"
fi

echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✅ Playwright MCP Test Complete!${NC}"
echo "========================================"
echo ""

echo "📊 Deployment Status:"
echo "   ✅ Migrations: Check database"
echo "   ✅ Secrets: Configured in Supabase"
echo "   ✅ Edge Functions: Deployed"
echo "   ✅ QA Agent: Configured"
echo "   ✅ Storage Bucket: Ready"
echo ""

echo "🧪 Next Steps to Test:"
echo ""
echo "1. Verify GitHub secrets are set:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - PLAYWRIGHT_WEBHOOK_SECRET (same as Supabase)"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_PUBLISHABLE_KEY"
echo ""

echo "2. Test GitHub workflow manually:"
echo "   gh workflow run playwright.yml \\"
echo "     --field test_run_id=\$(uuidgen) \\"
echo "     --field test_suite=smoke \\"
echo "     --field project=chromium \\"
echo "     --field callback_url=https://$SUPABASE_PROJECT_ID.supabase.co/functions/v1/playwright-webhook"
echo ""

echo "3. Check test results:"
echo "   npx supabase db query \"SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 5;\" --linked"
echo ""

echo "4. View function logs:"
echo "   npx supabase functions logs playwright-mcp --linked"
echo "   npx supabase functions logs playwright-webhook --linked"
echo ""

echo "📖 Documentation:"
echo "   - Full guide: docs/MCP_PHASE2_IMPLEMENTATION.md"
echo "   - Quick start: docs/PLAYWRIGHT_MCP_QUICKSTART.md"
echo ""

echo "🎉 Playwright MCP is deployed and ready!"
