#!/bin/bash
set -euo pipefail

# Database Migration Verification Script
# Run this after: supabase db push
#
# Usage: ./scripts/verify-database-migrations.sh

echo "=========================================="
echo "Database Migration Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

check_sql() {
  local description="$1"
  local sql="$2"
  local expected="$3"

  echo -n "Checking: $description... "

  result=$(supabase db execute "$sql" 2>&1 || true)

  if echo "$result" | grep -q "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Expected: $expected"
    echo "  Got: $result"
    ((FAILED++))
  fi
}

echo "=== Sprint 1: Critical Performance Indexes ==="
echo ""

check_sql "document_chunks composite index" \
  "SELECT indexname FROM pg_indexes WHERE tablename='document_chunks' AND indexname='idx_document_chunks_doc_idx'" \
  "idx_document_chunks_doc_idx"

check_sql "usage_records tenant index" \
  "SELECT indexname FROM pg_indexes WHERE tablename='usage_records' AND indexname='idx_usage_records_tenant_type_date'" \
  "idx_usage_records_tenant_type_date"

check_sql "contacts tenant_id index" \
  "SELECT indexname FROM pg_indexes WHERE tablename='contacts' AND indexname='idx_contacts_tenant_id'" \
  "idx_contacts_tenant_id"

check_sql "document_chunks tenant_id column exists" \
  "SELECT column_name FROM information_schema.columns WHERE table_name='document_chunks' AND column_name='tenant_id'" \
  "tenant_id"

check_sql "document_chunks tenant_id is NOT NULL" \
  "SELECT is_nullable FROM information_schema.columns WHERE table_name='document_chunks' AND column_name='tenant_id'" \
  "NO"

check_sql "no NULL tenant_ids in document_chunks" \
  "SELECT COUNT(*) FROM document_chunks WHERE tenant_id IS NULL" \
  "0"

echo ""
echo "=== Sprint 2: Partial and GIN Indexes ==="
echo ""

check_sql "partial index on contacts (active)" \
  "SELECT indexname FROM pg_indexes WHERE tablename='contacts' AND indexname='idx_contacts_active'" \
  "idx_contacts_active"

check_sql "GIN index on contacts.tags" \
  "SELECT indexname FROM pg_indexes WHERE tablename='contacts' AND indexname='idx_contacts_tags_gin'" \
  "idx_contacts_tags_gin"

check_sql "composite index on documents" \
  "SELECT indexname FROM pg_indexes WHERE tablename='documents' AND indexname='idx_documents_tenant_created'" \
  "idx_documents_tenant_created"

echo ""
echo "=== Sprint 3: Monitoring and Maintenance ==="
echo ""

check_sql "slow_queries view exists" \
  "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname='slow_queries'" \
  "slow_queries"

check_sql "unused_indexes view exists" \
  "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname='unused_indexes'" \
  "unused_indexes"

check_sql "archive function exists" \
  "SELECT proname FROM pg_proc WHERE proname='archive_old_usage_records'" \
  "archive_old_usage_records"

check_sql "document_chunks.document_id is NOT NULL" \
  "SELECT is_nullable FROM information_schema.columns WHERE table_name='document_chunks' AND column_name='document_id'" \
  "NO"

echo ""
echo "=== Performance Validation ==="
echo ""

# Check that tenant-filtered query uses index (not seq scan)
echo -n "Checking: tenant-filtered query uses index... "
explain_output=$(supabase db execute "EXPLAIN SELECT * FROM contacts WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 10" 2>&1 || true)

if echo "$explain_output" | grep -q "Index Scan"; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "  Expected: Index Scan"
  echo "  Got: $explain_output"
  ((FAILED++))
fi

# Check document_chunks query uses composite index
echo -n "Checking: document_chunks query uses composite index... "
explain_output=$(supabase db execute "EXPLAIN SELECT * FROM document_chunks WHERE document_id = (SELECT id FROM documents LIMIT 1) ORDER BY chunk_index LIMIT 30" 2>&1 || true)

if echo "$explain_output" | grep -q "idx_document_chunks_doc_idx"; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC}"
  echo "  Expected index: idx_document_chunks_doc_idx"
  echo "  Got: $explain_output"
fi

echo ""
echo "=========================================="
echo "Results:"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
  echo ""
  echo "Some verification checks failed!"
  echo "Review the output above for details."
  exit 1
else
  echo -e "${RED}Failed: 0${NC}"
  echo ""
  echo -e "${GREEN}All verification checks passed! ✓${NC}"
  echo ""
  echo "Database optimizations are correctly applied."
  exit 0
fi
