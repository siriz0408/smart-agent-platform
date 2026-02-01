#!/bin/bash
# Sync environment variables between local, Vercel, and Supabase

set -e

echo "🔄 Syncing environment variables..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to sync to Vercel
sync_to_vercel() {
  echo -e "${BLUE}Pushing to Vercel...${NC}"

  if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
  fi

  # Read each line from .env and push to Vercel
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue

    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    echo "Setting $key in Vercel..."
    echo "$value" | vercel env add "$key" production --force
  done < .env

  echo -e "${GREEN}✅ Synced to Vercel${NC}"
}

# Function to pull from Vercel
pull_from_vercel() {
  echo -e "${BLUE}Pulling from Vercel...${NC}"
  vercel env pull .env.local
  echo -e "${GREEN}✅ Environment variables saved to .env.local${NC}"
}

# Function to sync to Supabase (for edge functions)
sync_to_supabase() {
  echo -e "${BLUE}Syncing secrets to Supabase Edge Functions...${NC}"

  if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
  fi

  # Important secrets for edge functions
  SECRETS=(
    "LOVABLE_API_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "APP_URL"
  )

  for secret in "${SECRETS[@]}"; do
    value=$(grep "^${secret}=" .env | cut -d'=' -f2-)
    if [ -n "$value" ]; then
      # Remove quotes
      value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
      echo "Setting $secret in Supabase..."
      echo "$value" | supabase secrets set "$secret" --project-ref sthnezuadfbmbqlxiwtq
    fi
  done

  echo -e "${GREEN}✅ Synced to Supabase${NC}"
}

# Main menu
echo "Select sync direction:"
echo "  1) Pull from Vercel → .env.local (recommended for fresh start)"
echo "  2) Push .env → Vercel"
echo "  3) Push .env → Supabase"
echo "  4) Push .env → Both Vercel and Supabase"
read -p "Choice (1-4): " choice

case $choice in
  1)
    pull_from_vercel
    ;;
  2)
    sync_to_vercel
    ;;
  3)
    sync_to_supabase
    ;;
  4)
    sync_to_vercel
    sync_to_supabase
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Sync complete!${NC}"
