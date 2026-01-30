-- Migration: Add usage records archival and cleanup
-- Addresses: Unbounded growth of usage_records table
-- Impact: Maintains query performance long-term

-- Create archive table (partitioned by month)
-- Note: Partitioned tables cannot have standalone PRIMARY KEY on id
-- The partition key (recorded_at) must be part of any unique constraint
CREATE TABLE IF NOT EXISTS public.usage_records_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('ai_query', 'document_upload', 'storage')),
  quantity INTEGER DEFAULT 1,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Composite primary key including partition key
  PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Create partition for current year (add more as needed)
CREATE TABLE IF NOT EXISTS public.usage_records_archive_2026
  PARTITION OF public.usage_records_archive
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Function to archive old usage records (> 12 months)
CREATE OR REPLACE FUNCTION public.archive_old_usage_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move records older than 12 months to archive
  WITH archived AS (
    INSERT INTO usage_records_archive
    SELECT * FROM usage_records
    WHERE recorded_at < now() - interval '12 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;

  -- Delete archived records from main table
  DELETE FROM usage_records
  WHERE recorded_at < now() - interval '12 months';

  RETURN archived_count;
END;
$$;

-- Function to clean up very old archive records (> 3 years)
CREATE OR REPLACE FUNCTION public.cleanup_old_archives()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM usage_records_archive
  WHERE recorded_at < now() - interval '3 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE public.usage_records_archive IS
  'Archived usage records (> 12 months old) for historical analysis';
COMMENT ON FUNCTION public.archive_old_usage_records() IS
  'Archives usage records older than 12 months. Returns count of archived records.';
COMMENT ON FUNCTION public.cleanup_old_archives() IS
  'Deletes archive records older than 3 years. Returns count of deleted records.';

-- Suggested cron job (manual - not automated in migration)
-- Run monthly: SELECT archive_old_usage_records();
-- Run quarterly: SELECT cleanup_old_archives();
