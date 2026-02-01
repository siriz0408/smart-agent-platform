#!/bin/bash
# Setup script for integrating Vercel, Supabase, and GitHub
# Run this once to connect all services

set -e

echo "🔧 Setting up integrations for Smart Agent Platform..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if CLIs are installed
echo -e "${BLUE}Checking installed CLIs...${NC}"
command -v vercel >/dev/null 2>&1 || { echo "❌ Vercel CLI not found. Install: npm install -g vercel"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI not found. Install: brew install supabase/tap/supabase"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ GitHub CLI not found. Install: brew install gh"; exit 1; }
echo -e "${GREEN}✅ All CLIs installed${NC}"
echo ""

# 1. Link Vercel
echo -e "${BLUE}1. Linking Vercel project...${NC}"
if [ -d ".vercel" ]; then
  echo "Already linked to Vercel"
else
  echo "Please select 'smart-agent-platform' when prompted"
  vercel link
fi
echo -e "${GREEN}✅ Vercel linked${NC}"
echo ""

# 2. Verify Supabase
echo -e "${BLUE}2. Verifying Supabase connection...${NC}"
PROJECT_ID=$(grep "project_id" supabase/config.toml | cut -d'"' -f2)
echo "Supabase Project ID: $PROJECT_ID"
echo -e "${GREEN}✅ Supabase configured${NC}"
echo ""

# 3. Verify GitHub
echo -e "${BLUE}3. Verifying GitHub connection...${NC}"
gh auth status || gh auth login
REPO_URL=$(git config --get remote.origin.url)
echo "GitHub Repository: $REPO_URL"
echo -e "${GREEN}✅ GitHub connected${NC}"
echo ""

# 4. Pull environment variables from Vercel
echo -e "${BLUE}4. Syncing environment variables from Vercel...${NC}"
echo "This will create/update .env.local with Vercel's environment variables"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  vercel env pull .env.local
  echo -e "${GREEN}✅ Environment variables synced${NC}"
else
  echo "Skipped"
fi
echo ""

# 5. Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Available commands:"
echo "  npm run deploy        - Deploy to Vercel"
echo "  npm run sync:env      - Sync environment variables"
echo "  npm run db:push       - Push database migrations to Supabase"
echo "  npm run db:pull       - Pull database schema from Supabase"
echo ""
echo "Workflow:"
echo "  1. Make changes locally"
echo "  2. Test: npm run dev"
echo "  3. Commit: git add . && git commit -m 'message'"
echo "  4. Push: git push (auto-deploys to Vercel)"
echo "  5. Migrations: npm run db:push (if database changes)"
