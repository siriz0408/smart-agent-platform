-- Migration: Add notification preferences to user_preferences table
-- Purpose: Enable granular notification control for users

-- Add notification preference columns
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS property_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'instant' CHECK (email_frequency IN ('instant', 'daily', 'weekly', 'off')),
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- Add comments for documentation
COMMENT ON COLUMN public.user_preferences.email_notifications IS 'Enable/disable email notifications';
COMMENT ON COLUMN public.user_preferences.push_notifications IS 'Enable/disable browser push notifications';
COMMENT ON COLUMN public.user_preferences.deal_updates IS 'Notify when deals move stages';
COMMENT ON COLUMN public.user_preferences.message_notifications IS 'Notify on new messages';
COMMENT ON COLUMN public.user_preferences.property_notifications IS 'Notify on property matches and updates';
COMMENT ON COLUMN public.user_preferences.email_frequency IS 'Email notification frequency: instant, daily digest, weekly summary, or off';
COMMENT ON COLUMN public.user_preferences.quiet_hours_start IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN public.user_preferences.quiet_hours_end IS 'End time for quiet hours (no notifications)';
