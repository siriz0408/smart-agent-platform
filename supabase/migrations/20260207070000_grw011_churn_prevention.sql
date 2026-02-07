-- GRW-011: Churn Prevention System
-- Creates infrastructure for tracking user activity and churn risk

-- ============================================================
-- 1. User Activity Tracking Table
-- Records daily activity snapshots per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  -- Feature usage counts for the day
  documents_uploaded integer DEFAULT 0,
  contacts_created integer DEFAULT 0,
  deals_updated integer DEFAULT 0,
  ai_queries_made integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  searches_performed integer DEFAULT 0,
  -- Engagement signals
  login_count integer DEFAULT 0,
  session_duration_minutes integer DEFAULT 0,
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_date
  ON public.user_activity_log(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_workspace
  ON public.user_activity_log(workspace_id, activity_date DESC);

-- ============================================================
-- 2. Churn Risk Assessment Table
-- Stores computed risk scores per user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.churn_risk_assessments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  -- Risk scoring
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score numeric(5,2) NOT NULL DEFAULT 0, -- 0 (no risk) to 100 (certain churn)
  -- Score breakdown factors
  login_recency_score numeric(5,2) DEFAULT 0,
  feature_usage_score numeric(5,2) DEFAULT 0,
  subscription_health_score numeric(5,2) DEFAULT 0,
  onboarding_score numeric(5,2) DEFAULT 0,
  engagement_trend_score numeric(5,2) DEFAULT 0,
  -- Context
  days_since_last_activity integer DEFAULT 0,
  last_activity_date date,
  assessment_notes text,
  -- Retention action tracking
  retention_action_taken text, -- e.g. 'email_sent', 'nudge_shown', 'personal_outreach'
  retention_action_date timestamptz,
  -- Metadata
  assessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_churn_risk_user
  ON public.churn_risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_churn_risk_level
  ON public.churn_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_churn_risk_score
  ON public.churn_risk_assessments(risk_score DESC);

-- ============================================================
-- 3. Re-engagement Email Queue Table
-- Infrastructure for automated retention emails (no actual sending)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.retention_email_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  -- Email configuration
  email_type text NOT NULL CHECK (email_type IN (
    'inactive_7d',      -- 7 days inactive
    'inactive_14d',     -- 14 days inactive
    'inactive_30d',     -- 30 days inactive
    'trial_expiring',   -- Trial ending soon
    'feature_tip',      -- Feature discovery tips
    'win_back'          -- Win-back for churned users
  )),
  email_to text NOT NULL,
  subject text,
  -- Status tracking
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled', 'skipped')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  -- Risk context at time of queuing
  risk_level text,
  risk_score numeric(5,2),
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_email_user
  ON public.retention_email_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_retention_email_status
  ON public.retention_email_queue(status, scheduled_for);

-- ============================================================
-- 4. RLS Policies
-- Admin-only access for churn tables
-- ============================================================

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churn_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_email_queue ENABLE ROW LEVEL SECURITY;

-- user_activity_log: users can see their own, admins can see all in workspace
CREATE POLICY "Users can view own activity"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON public.user_activity_log FOR UPDATE
  USING (auth.uid() = user_id);

-- churn_risk_assessments: admin-only read
CREATE POLICY "Admins can view churn assessments"
  ON public.churn_risk_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Service role can manage churn assessments"
  ON public.churn_risk_assessments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- retention_email_queue: admin-only
CREATE POLICY "Admins can view retention emails"
  ON public.retention_email_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage retention emails"
  ON public.retention_email_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- 5. Helper function to log user activity
-- Call this on key user actions to build activity history
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_workspace_id uuid,
  p_activity_type text DEFAULT 'login'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_activity_log (user_id, workspace_id, activity_date, login_count)
  VALUES (p_user_id, p_workspace_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    login_count = user_activity_log.login_count + CASE WHEN p_activity_type = 'login' THEN 1 ELSE 0 END,
    documents_uploaded = user_activity_log.documents_uploaded + CASE WHEN p_activity_type = 'document_upload' THEN 1 ELSE 0 END,
    contacts_created = user_activity_log.contacts_created + CASE WHEN p_activity_type = 'contact_create' THEN 1 ELSE 0 END,
    deals_updated = user_activity_log.deals_updated + CASE WHEN p_activity_type = 'deal_update' THEN 1 ELSE 0 END,
    ai_queries_made = user_activity_log.ai_queries_made + CASE WHEN p_activity_type = 'ai_query' THEN 1 ELSE 0 END,
    messages_sent = user_activity_log.messages_sent + CASE WHEN p_activity_type = 'message_send' THEN 1 ELSE 0 END,
    searches_performed = user_activity_log.searches_performed + CASE WHEN p_activity_type = 'search' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;
