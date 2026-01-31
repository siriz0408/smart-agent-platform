-- Fix: Enable RLS on usage_records_archive table
-- This was missing from the initial archive migration

-- Enable RLS on archive table
ALTER TABLE public.usage_records_archive ENABLE ROW LEVEL SECURITY;

-- Enable RLS on partition (required for partitioned tables)
ALTER TABLE public.usage_records_archive_2026 ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view archived usage in their tenant
CREATE POLICY "Users can view archived usage in their tenant"
  ON public.usage_records_archive FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Policy: Service role can insert archives
CREATE POLICY "Service can archive usage records"
  ON public.usage_records_archive FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can cleanup old archives
CREATE POLICY "Service can cleanup old archives"
  ON public.usage_records_archive FOR DELETE
  USING (true);

-- Grant permissions
GRANT SELECT ON public.usage_records_archive TO authenticated;

-- Add comment
COMMENT ON POLICY "Users can view archived usage in their tenant" ON public.usage_records_archive IS
  'Allows users to view archived usage records from their own tenant';
COMMENT ON POLICY "Service can archive usage records" ON public.usage_records_archive IS
  'Allows archival function (SECURITY DEFINER) to insert records';
COMMENT ON POLICY "Service can cleanup old archives" ON public.usage_records_archive IS
  'Allows cleanup function (SECURITY DEFINER) to delete old records';
