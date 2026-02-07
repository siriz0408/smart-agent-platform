#!/bin/bash
# Migration Verification Script
# Validates pending migrations before deployment

set -e

echo "========================================="
echo "Migration Verification Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for duplicate timestamps
echo "1. Checking for duplicate timestamps..."
DUPLICATES=$(ls supabase/migrations/*.sql | \
  sed 's/.*\/\([0-9]*\)_.*/\1/' | \
  sort | uniq -d)

if [ ! -z "$DUPLICATES" ]; then
  echo -e "${RED}✗ Duplicate timestamps found:${NC}"
  echo "$DUPLICATES"
  exit 1
else
  echo -e "${GREEN}✓ No duplicate timestamps${NC}"
fi

echo ""

# List pending migrations
echo "2. Pending migrations (last 5):"
ls -lt supabase/migrations/*.sql | head -5 | awk '{print $NF}' | sed 's/.*\//  - /'

echo ""

# Validate migration order
echo "3. Validating migration order..."
SEC014=$(ls supabase/migrations/20260207050000_*.sql 2>/dev/null | wc -l)
COM006=$(ls supabase/migrations/20260207060000_*.sql 2>/dev/null | wc -l)
GRW011_T=$(ls supabase/migrations/20260207070000_*.sql 2>/dev/null | wc -l)
GRW011_F=$(ls supabase/migrations/20260207080100_*.sql 2>/dev/null | wc -l)

if [ $SEC014 -eq 1 ] && [ $COM006 -eq 1 ] && [ $GRW011_T -eq 1 ] && [ $GRW011_F -eq 1 ]; then
  echo -e "${GREEN}✓ All 4 pending migrations found${NC}"
  echo "  - 20260207050000 (SEC-014: RLS security fixes)"
  echo "  - 20260207060000 (COM-006: Message search)"
  echo "  - 20260207070000 (GRW-011: Churn tables)"
  echo "  - 20260207080100 (GRW-011: Churn functions)"
else
  echo -e "${YELLOW}⚠ Some migrations may be missing or already deployed${NC}"
fi

echo ""

# Check for the fixed timestamp
echo "4. Checking duplicate timestamp fix..."
OLD_TIMESTAMP=$(ls supabase/migrations/20260207080000_grw011*.sql 2>/dev/null | wc -l)
NEW_TIMESTAMP=$(ls supabase/migrations/20260207080100_grw011*.sql 2>/dev/null | wc -l)

if [ $OLD_TIMESTAMP -gt 0 ]; then
  echo -e "${RED}✗ Old duplicate timestamp still exists (080000)${NC}"
  exit 1
elif [ $NEW_TIMESTAMP -eq 1 ]; then
  echo -e "${GREEN}✓ Duplicate timestamp fixed (renamed to 080100)${NC}"
else
  echo -e "${YELLOW}⚠ GRW-011 function migration not found${NC}"
fi

echo ""

# Check git status
echo "5. Git status check..."
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${GREEN}✓ Working tree clean${NC}"
else
  echo -e "${YELLOW}⚠ Uncommitted changes detected:${NC}"
  git status --short | head -10
fi

echo ""
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Ready to deploy? Run:"
echo -e "${GREEN}npm run db:migrate${NC}"
echo ""
