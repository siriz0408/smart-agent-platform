-- Activate Google Calendar Connector
-- Sets is_active=true for google_calendar connector definition after implementation

UPDATE public.connector_definitions
SET 
  is_active = true,
  is_beta = false,
  updated_at = now()
WHERE connector_key = 'google_calendar';
