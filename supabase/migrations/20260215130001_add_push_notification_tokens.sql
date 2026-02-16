-- Migration: Add push notification tokens table
-- Purpose: Store device push tokens for mobile push notifications (iOS/Android)

-- Create push_notification_tokens table
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_token)
);

-- Create indexes for efficient querying
CREATE INDEX idx_push_tokens_user_id ON push_notification_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_notification_tokens(user_id, active) WHERE active = true;
CREATE INDEX idx_push_tokens_platform ON push_notification_tokens(platform);

-- Enable RLS
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_notification_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_notification_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens
CREATE POLICY "Users can update own push tokens"
  ON push_notification_tokens
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_notification_tokens
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role can read all tokens (for sending push notifications)
CREATE POLICY "Service can read all push tokens"
  ON push_notification_tokens
  FOR SELECT
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE push_notification_tokens IS 'Device push notification tokens for mobile apps (iOS/Android/Web)';
COMMENT ON COLUMN push_notification_tokens.device_token IS 'FCM or APNs device token';
COMMENT ON COLUMN push_notification_tokens.platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN push_notification_tokens.active IS 'Whether token is still valid/active';
COMMENT ON COLUMN push_notification_tokens.last_used_at IS 'Last time a push was sent to this device';

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER push_token_updated_at
  BEFORE UPDATE ON push_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();
