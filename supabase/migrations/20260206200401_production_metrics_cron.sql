-- ============================================================================
-- PRODUCTION METRICS CRON SCHEDULE SETUP
-- Sets up daily aggregation of production metrics via pg_cron
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTION: Trigger metrics aggregation via edge function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_aggregate_production_metrics()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get Supabase URL and service key from settings
  -- These should be set via: ALTER DATABASE postgres SET app.supabase_url = '...';
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key := current_setting('app.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'app.supabase_url or app.service_role_key not set. Cannot trigger metrics aggregation.';
    RAISE WARNING 'Set them via: ALTER DATABASE postgres SET app.supabase_url = ''https://your-project.supabase.co'';';
    RAISE WARNING 'ALTER DATABASE postgres SET app.service_role_key = ''your-service-role-key'';';
    RETURN;
  END IF;
  
  -- Call the edge function using pg_net (requires pg_net extension)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/aggregate-production-metrics',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'date', (CURRENT_DATE - INTERVAL '1 day')::text
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_aggregate_production_metrics IS 
  'Triggers the aggregate-production-metrics edge function. Can be called via pg_cron.';

-- ============================================================================
-- 2. SET UP PG_CRON SCHEDULE (if pg_cron extension is enabled)
-- ============================================================================

-- Check if pg_cron extension exists and schedule the job
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule existing job if it exists
    PERFORM cron.unschedule('aggregate-production-metrics-daily')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'aggregate-production-metrics-daily'
    );
    
    -- Schedule daily aggregation at 2 AM UTC
    PERFORM cron.schedule(
      'aggregate-production-metrics-daily',
      '0 2 * * *',  -- Every day at 2 AM UTC
      $$
      SELECT public.trigger_aggregate_production_metrics();
      $$
    );
    
    RAISE NOTICE 'Successfully scheduled production metrics aggregation (daily at 2 AM UTC)';
  ELSE
    RAISE NOTICE 'pg_cron extension not enabled. To enable:';
    RAISE NOTICE '1. Go to Supabase Dashboard > Database > Extensions';
    RAISE NOTICE '2. Enable "pg_cron" extension';
    RAISE NOTICE '3. Set database settings:';
    RAISE NOTICE '   ALTER DATABASE postgres SET app.supabase_url = ''https://your-project.supabase.co'';';
    RAISE NOTICE '   ALTER DATABASE postgres SET app.service_role_key = ''your-service-role-key'';';
    RAISE NOTICE '4. Re-run this migration or manually schedule:';
    RAISE NOTICE '   SELECT cron.schedule(''aggregate-production-metrics-daily'', ''0 2 * * *'', ''SELECT public.trigger_aggregate_production_metrics();'');';
  END IF;
END $$;

-- ============================================================================
-- 3. MANUAL TRIGGER FUNCTION (for testing)
-- ============================================================================

COMMENT ON FUNCTION public.trigger_aggregate_production_metrics IS 
  'Manually trigger metrics aggregation. Can be called for testing: SELECT public.trigger_aggregate_production_metrics();';
