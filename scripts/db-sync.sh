#!/bin/bash
# Database migration sync between local and Supabase

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🗄️  Database Sync${NC}"
echo ""

PROJECT_REF="sthnezuadfbmbqlxiwtq"

# Menu
echo "Select action:"
echo "  1) Push local migrations → Supabase (deploy schema changes)"
echo "  2) Pull Supabase schema → local (update local from remote)"
echo "  3) Generate new migration (create migration from schema diff)"
echo "  4) List migrations"
echo "  5) Reset remote database (⚠️  DANGEROUS - production data loss)"
read -p "Choice (1-5): " choice

case $choice in
  1)
    echo -e "${BLUE}Pushing migrations to Supabase...${NC}"
    echo -e "${YELLOW}This will apply all pending migrations to production${NC}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      supabase db push --project-ref "$PROJECT_REF"
      echo -e "${GREEN}✅ Migrations pushed${NC}"
    else
      echo "Cancelled"
    fi
    ;;
  2)
    echo -e "${BLUE}Pulling schema from Supabase...${NC}"
    supabase db pull --project-ref "$PROJECT_REF"
    echo -e "${GREEN}✅ Schema pulled${NC}"
    ;;
  3)
    echo -e "${BLUE}Generating migration from schema diff...${NC}"
    read -p "Migration name: " migration_name
    if [ -z "$migration_name" ]; then
      echo "Migration name required"
      exit 1
    fi
    supabase db diff --use-migra --file "$migration_name"
    echo -e "${GREEN}✅ Migration created in supabase/migrations/${NC}"
    ;;
  4)
    echo -e "${BLUE}Migrations in supabase/migrations:${NC}"
    ls -lh supabase/migrations/
    ;;
  5)
    echo -e "${RED}⚠️  WARNING: This will delete ALL data in the remote database!${NC}"
    echo -e "${RED}This action cannot be undone!${NC}"
    read -p "Type 'RESET' to confirm: " confirm
    if [ "$confirm" = "RESET" ]; then
      supabase db reset --project-ref "$PROJECT_REF"
      echo -e "${GREEN}✅ Database reset${NC}"
    else
      echo "Cancelled"
    fi
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac
