-- Scheduled Agent Execution Setup
-- This migration sets up infrastructure for scheduled agent execution

-- ============================================================================
-- OPTION 1: Using pg_cron (Recommended for production)
-- ============================================================================
-- 
-- pg_cron is a PostgreSQL extension for running scheduled jobs.
-- To use it:
-- 
-- 1. Enable the extension in Supabase Dashboard:
--    Database > Extensions > Enable pg_cron
--
-- 2. Once enabled, run this SQL to schedule the job:
--
-- SELECT cron.schedule(
--   'process-scheduled-agents', -- Job name
--   '* * * * *',                -- Every minute
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/process-scheduled-agents',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'
--   );
--   $$
-- );
--
-- 3. To unschedule:
--    SELECT cron.unschedule('process-scheduled-agents');
--
-- Note: You need to set app.supabase_url and app.service_role_key as database settings
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';

-- ============================================================================
-- OPTION 2: Using Supabase Database Webhooks + External Cron
-- ============================================================================
--
-- If pg_cron is not available, use an external cron service (e.g., cron-job.org,
-- GitHub Actions, or your own server) to call the edge function every minute:
--
-- curl -X POST "https://your-project.supabase.co/functions/v1/process-scheduled-agents" \
--   -H "Authorization: Bearer your-service-role-key" \
--   -H "Content-Type: application/json"

-- ============================================================================
-- OPTION 3: Using Supabase Edge Functions Cron (Beta)
-- ============================================================================
--
-- Supabase now supports cron triggers for Edge Functions.
-- Add to your supabase/functions/process-scheduled-agents/config.toml:
--
-- [functions.process-scheduled-agents]
-- schedule = "* * * * *"  # Every minute

-- ============================================================================
-- Helper function to manually trigger scheduled agent processing
-- ============================================================================

-- Function that can be called to process scheduled agents
-- This can be invoked via pg_cron or manually
CREATE OR REPLACE FUNCTION process_scheduled_agents_trigger()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get the Supabase URL from environment or settings
  -- This requires the pg_net extension to be enabled
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    -- Call the edge function using pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/process-scheduled-agents',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Event processing trigger function
-- This can be used to process agent events in real-time instead of batch
-- ============================================================================

-- Function to process a single event immediately after it's created
CREATE OR REPLACE FUNCTION process_agent_event_immediate()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only process if we have the required settings
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_key := current_setting('app.settings.service_role_key', true);
  
  IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
    -- Call the edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/process-agent-event',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('event_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optionally enable immediate event processing
-- Uncomment the following to process events as they are created:
--
-- CREATE TRIGGER process_agent_event_on_insert
--   AFTER INSERT ON agent_events
--   FOR EACH ROW
--   EXECUTE FUNCTION process_agent_event_immediate();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION process_scheduled_agents_trigger() IS 
  'Triggers the process-scheduled-agents edge function. Can be called via pg_cron.';

COMMENT ON FUNCTION process_agent_event_immediate() IS 
  'Optionally processes agent events immediately on insert. Requires pg_net extension.';
