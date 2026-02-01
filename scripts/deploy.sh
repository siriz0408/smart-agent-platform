#!/bin/bash
# Quick deploy script that handles common deployment tasks

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Smart Agent Deployment Script${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
  git status -s
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run checks
echo -e "${BLUE}Running pre-deployment checks...${NC}"

echo "  📋 Linting..."
npm run lint || { echo -e "${RED}❌ Linting failed${NC}"; exit 1; }

echo "  🔍 Type checking..."
npm run typecheck || { echo -e "${RED}❌ Type check failed${NC}"; exit 1; }

echo "  🧪 Running tests..."
npm run test || { echo -e "${RED}❌ Tests failed${NC}"; exit 1; }

echo "  🏗️  Building..."
npm run build || { echo -e "${RED}❌ Build failed${NC}"; exit 1; }

echo -e "${GREEN}✅ All checks passed${NC}"
echo ""

# Deployment options
echo "Select deployment method:"
echo "  1) Git push (recommended - triggers auto-deploy)"
echo "  2) Vercel CLI (direct deploy)"
echo "  3) Production deploy via Vercel CLI"
echo "  4) Preview deploy via Vercel CLI"
read -p "Choice (1-4): " choice

case $choice in
  1)
    echo -e "${BLUE}Pushing to GitHub...${NC}"
    git push origin main
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
    echo ""
    echo "Vercel will automatically deploy from GitHub"
    echo "Check status: https://vercel.com/dashboard"
    ;;
  2)
    echo -e "${BLUE}Deploying to Vercel...${NC}"
    vercel
    ;;
  3)
    echo -e "${BLUE}Deploying to production...${NC}"
    vercel --prod
    ;;
  4)
    echo -e "${BLUE}Creating preview deployment...${NC}"
    vercel
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  • Check deployment: vercel ls"
echo "  • View logs: vercel logs"
echo "  • Open dashboard: https://vercel.com/dashboard"
