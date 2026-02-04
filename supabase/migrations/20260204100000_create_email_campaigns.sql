-- Email Drip Campaign Tables
-- These tables support automated email sequences for user engagement

-- Campaign Types:
-- - welcome_series: Sent to new users (days 1, 3, 7)
-- - re_engagement: Sent to inactive users (7+ days without activity)
-- - feature_education: Sent when new features are released

-- Email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  -- Campaign metadata
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('welcome_series', 're_engagement', 'feature_education', 'custom')),
  description TEXT,
  
  -- Targeting
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'agents', 'buyers', 'sellers', 'inactive', 'new_users')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Email campaign steps (individual emails in a sequence)
CREATE TABLE IF NOT EXISTS email_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  
  -- Step order
  step_number INTEGER NOT NULL,
  
  -- Timing (days after previous step, or days after trigger)
  delay_days INTEGER NOT NULL DEFAULT 0,
  
  -- Email content
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL, -- References email template in email-templates.ts
  variables JSONB DEFAULT '{}', -- Default variables for this step
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, step_number)
);

-- Campaign recipients (tracks which users have received which emails)
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progress tracking
  current_step INTEGER DEFAULT 0, -- 0 = not started
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'unsubscribed', 'paused')),
  
  -- Last activity
  last_email_sent_at TIMESTAMPTZ,
  next_email_scheduled_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, user_id)
);

-- Email send history (tracks individual emails sent)
CREATE TABLE IF NOT EXISTS email_send_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  step_id UUID REFERENCES email_campaign_steps(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES email_campaign_recipients(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email details
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  
  -- Provider tracking
  external_id TEXT, -- ID from Resend/email provider
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns
CREATE POLICY "Super admins can manage all campaigns"
  ON email_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage their tenant campaigns"
  ON email_campaigns
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for email_campaign_steps (same as campaigns)
CREATE POLICY "Super admins can manage all campaign steps"
  ON email_campaign_steps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- RLS Policies for email_campaign_recipients
CREATE POLICY "Users can view their own campaign status"
  ON email_campaign_recipients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage campaign recipients"
  ON email_campaign_recipients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for email_send_history
CREATE POLICY "Users can view their own email history"
  ON email_send_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all email history"
  ON email_send_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_active ON email_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_email_campaign_steps_campaign ON email_campaign_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_user ON email_campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_next ON email_campaign_recipients(next_email_scheduled_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_email_send_history_user ON email_send_history(user_id);

-- Insert default welcome series campaign (system-wide)
INSERT INTO email_campaigns (name, campaign_type, description, target_audience, is_active)
VALUES (
  'Welcome Series',
  'welcome_series',
  'Welcome email sequence for new users',
  'new_users',
  true
) ON CONFLICT DO NOTHING;

-- Get the campaign ID for inserting steps
DO $$
DECLARE
  welcome_campaign_id UUID;
BEGIN
  SELECT id INTO welcome_campaign_id
  FROM email_campaigns
  WHERE campaign_type = 'welcome_series' AND tenant_id IS NULL
  LIMIT 1;
  
  IF welcome_campaign_id IS NOT NULL THEN
    -- Insert welcome series steps
    INSERT INTO email_campaign_steps (campaign_id, step_number, delay_days, subject, template_name, variables)
    VALUES
      (welcome_campaign_id, 1, 0, 'Welcome to Smart Agent!', 'welcome_day1', '{"cta_text": "Explore the Dashboard", "cta_url": "/"}'),
      (welcome_campaign_id, 2, 3, 'Get the Most Out of Smart Agent', 'welcome_day3', '{"cta_text": "Upload Your First Document", "cta_url": "/documents"}'),
      (welcome_campaign_id, 3, 7, 'Your Smart Agent Weekly Summary', 'welcome_day7', '{"cta_text": "Try AI Chat", "cta_url": "/"}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE email_campaigns IS 'Email drip campaigns for user engagement and onboarding';
COMMENT ON TABLE email_campaign_steps IS 'Individual email steps within a campaign sequence';
COMMENT ON TABLE email_campaign_recipients IS 'Tracks which users are in which campaigns and their progress';
COMMENT ON TABLE email_send_history IS 'Log of all emails sent, with delivery and engagement tracking';
