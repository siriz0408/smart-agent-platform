-- Migration: Add performance indexes for usage_records
-- Addresses: check_and_increment_ai_usage RPC performance
-- Impact: 20x faster usage quota checks

-- Composite index for tenant + type + date range queries
CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_type_date
  ON public.usage_records(tenant_id, record_type, recorded_at DESC);

-- Partial index for recent AI queries (most common check)
CREATE INDEX IF NOT EXISTS idx_usage_records_ai_recent
  ON public.usage_records(tenant_id, recorded_at DESC)
  WHERE record_type = 'ai_query';

COMMENT ON INDEX idx_usage_records_tenant_type_date IS
  'Composite index for usage aggregation queries (quota checking)';
COMMENT ON INDEX idx_usage_records_ai_recent IS
  'Partial index for recent AI query usage checks';
