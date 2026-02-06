-- ============================================================================
-- UPDATE GOOGLE CALENDAR CONNECTOR
-- ============================================================================
-- Adds get_availability action and updates OAuth scopes for
-- the Google Calendar connector (INT-010).
--
-- The get_availability action uses the Google Calendar FreeBusy API
-- to check free/busy status for one or more calendars.
--
-- OAuth scope changes:
--   - Adds calendar.events scope for fine-grained event access
--   - Adds calendar.readonly scope for read-only availability checks
--   - Keeps existing calendar scope for full read/write access
-- ============================================================================

-- Update supported_actions to include get_availability
-- Only runs if connector_definitions table exists (depends on connector_framework migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'connector_definitions') THEN
    UPDATE public.connector_definitions
    SET 
      supported_actions = ARRAY[
        'create_event',
        'list_events',
        'update_event',
        'delete_event',
        'get_availability'
      ],
      oauth_scopes = ARRAY[
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ],
      description = 'Connect your Google Calendar to manage events, appointments, and check availability for scheduling',
      is_active = true,
      is_beta = false,
      updated_at = now()
    WHERE connector_key = 'google_calendar';
  ELSE
    RAISE NOTICE 'connector_definitions table not yet created - skipping Google Calendar update (will be applied when connector_framework migration runs)';
  END IF;
END $$;
