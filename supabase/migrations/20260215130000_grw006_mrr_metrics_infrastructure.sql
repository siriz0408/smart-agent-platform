-- ============================================================================
-- GRW-006: MRR METRICS INFRASTRUCTURE
-- Implements comprehensive MRR tracking for PM-Growth North Star Metric:
-- MRR Growth >15%
-- ============================================================================

-- ============================================================================
-- 1. MRR_SNAPSHOTS TABLE
-- Daily snapshots of MRR for historical tracking and trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Core MRR Metrics
  mrr NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  arr NUMERIC(12, 2) DEFAULT 0 NOT NULL,

  -- MRR Components
  new_mrr NUMERIC(12, 2) DEFAULT 0, -- From new subscriptions
  expansion_mrr NUMERIC(12, 2) DEFAULT 0, -- From upgrades
  contraction_mrr NUMERIC(12, 2) DEFAULT 0, -- From downgrades
  churned_mrr NUMERIC(12, 2) DEFAULT 0, -- From cancellations
  reactivation_mrr NUMERIC(12, 2) DEFAULT 0, -- From reactivations
  net_mrr_change NUMERIC(12, 2) DEFAULT 0, -- Net change from previous day

  -- Subscription Counts
  total_subscriptions INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  trialing_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,
  past_due_subscriptions INTEGER DEFAULT 0,

  -- Plan Distribution (JSON for flexibility)
  plan_distribution JSONB DEFAULT '{}'::JSONB,
  -- Structure: { "free": 10, "starter": 5, "professional": 3, "team": 2, "brokerage": 1 }

  -- Plan MRR Breakdown
  mrr_by_plan JSONB DEFAULT '{}'::JSONB,
  -- Structure: { "starter": 145, "professional": 237, "team": 398, "brokerage": 499 }

  -- User Metrics
  total_users INTEGER DEFAULT 0,
  paying_users INTEGER DEFAULT 0,
  free_users INTEGER DEFAULT 0,

  -- Growth Metrics
  mrr_growth_rate NUMERIC(8, 4), -- Percentage change from previous day
  mom_growth_rate NUMERIC(8, 4), -- Month-over-month growth rate

  -- Conversion Metrics
  trial_to_paid_count INTEGER DEFAULT 0,
  trial_to_paid_conversion_rate NUMERIC(5, 2),

  -- ARPU Metrics
  arpu NUMERIC(10, 2), -- Average Revenue Per User (MRR / paying_users)
  arppu NUMERIC(10, 2), -- Average Revenue Per Paying User

  -- Churn Metrics
  churn_count INTEGER DEFAULT 0,
  churn_rate NUMERIC(5, 2),
  revenue_churn_rate NUMERIC(5, 2), -- Churned MRR / Previous MRR

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  CONSTRAINT unique_mrr_snapshot UNIQUE (snapshot_date, workspace_id)
);

-- Add comments
COMMENT ON TABLE public.mrr_snapshots IS 'Daily MRR snapshots for historical tracking and growth analysis';
COMMENT ON COLUMN public.mrr_snapshots.net_mrr_change IS 'New + Expansion - Contraction - Churned + Reactivation';
COMMENT ON COLUMN public.mrr_snapshots.mrr_growth_rate IS 'Daily MRR growth rate as percentage';
COMMENT ON COLUMN public.mrr_snapshots.mom_growth_rate IS 'Month-over-month MRR growth rate';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_date
  ON public.mrr_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_workspace
  ON public.mrr_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_mrr
  ON public.mrr_snapshots(mrr DESC, snapshot_date DESC);

-- ============================================================================
-- 2. SUBSCRIPTION_EVENTS TABLE
-- Track subscription lifecycle events for MRR movement analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'new', 'upgrade', 'downgrade', 'canceled', 'reactivated',
    'trial_started', 'trial_converted', 'trial_expired', 'payment_failed', 'payment_recovered'
  )),

  -- Plan details
  previous_plan TEXT,
  new_plan TEXT,

  -- MRR impact
  mrr_impact NUMERIC(10, 2) DEFAULT 0, -- Positive for growth, negative for contraction

  -- Metadata
  reason TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.subscription_events IS 'Subscription lifecycle events for MRR movement tracking';

CREATE INDEX IF NOT EXISTS idx_subscription_events_type
  ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created
  ON public.subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_workspace
  ON public.subscription_events(workspace_id);

-- ============================================================================
-- 3. FUNCTION: Calculate current MRR from subscriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_current_mrr(p_workspace_id UUID DEFAULT NULL)
RETURNS TABLE (
  mrr NUMERIC,
  arr NUMERIC,
  total_subscriptions INTEGER,
  active_subscriptions INTEGER,
  trialing_subscriptions INTEGER,
  plan_distribution JSONB,
  mrr_by_plan JSONB,
  paying_users INTEGER,
  free_users INTEGER
) AS $$
DECLARE
  v_plan_prices JSONB := '{"free": 0, "starter": 29, "professional": 79, "team": 199, "brokerage": 499}'::JSONB;
BEGIN
  RETURN QUERY
  WITH subscription_stats AS (
    SELECT
      s.plan,
      s.status,
      COUNT(*) as count,
      SUM(CASE WHEN s.status = 'active' AND s.plan != 'free' THEN
        COALESCE((v_plan_prices->>s.plan)::NUMERIC, 0)
      ELSE 0 END) as plan_mrr
    FROM public.subscriptions s
    WHERE (p_workspace_id IS NULL OR s.workspace_id = p_workspace_id)
    GROUP BY s.plan, s.status
  )
  SELECT
    COALESCE(SUM(ss.plan_mrr), 0)::NUMERIC as mrr,
    COALESCE(SUM(ss.plan_mrr) * 12, 0)::NUMERIC as arr,
    COALESCE(SUM(ss.count), 0)::INTEGER as total_subscriptions,
    COALESCE(SUM(CASE WHEN ss.status = 'active' THEN ss.count ELSE 0 END), 0)::INTEGER as active_subscriptions,
    COALESCE(SUM(CASE WHEN ss.status = 'trialing' THEN ss.count ELSE 0 END), 0)::INTEGER as trialing_subscriptions,
    COALESCE(
      jsonb_object_agg(ss.plan, ss.count) FILTER (WHERE ss.plan IS NOT NULL),
      '{}'::JSONB
    ) as plan_distribution,
    COALESCE(
      jsonb_object_agg(ss.plan, ss.plan_mrr) FILTER (WHERE ss.plan IS NOT NULL AND ss.plan_mrr > 0),
      '{}'::JSONB
    ) as mrr_by_plan,
    COALESCE(SUM(CASE WHEN ss.status = 'active' AND ss.plan != 'free' THEN ss.count ELSE 0 END), 0)::INTEGER as paying_users,
    COALESCE(SUM(CASE WHEN ss.plan = 'free' THEN ss.count ELSE 0 END), 0)::INTEGER as free_users
  FROM subscription_stats ss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.calculate_current_mrr IS 'Calculate current MRR and subscription statistics';

-- ============================================================================
-- 4. FUNCTION: Snapshot daily MRR
-- Should be run daily via cron
-- ============================================================================

CREATE OR REPLACE FUNCTION public.snapshot_daily_mrr(
  p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_workspace_id UUID;
  v_count INTEGER := 0;
  v_current_mrr RECORD;
  v_previous_mrr NUMERIC;
  v_previous_month_mrr NUMERIC;
BEGIN
  -- Snapshot for each workspace
  FOR v_workspace_id IN
    SELECT DISTINCT id FROM public.workspaces
  LOOP
    -- Get current MRR stats
    SELECT * INTO v_current_mrr FROM public.calculate_current_mrr(v_workspace_id);

    -- Get previous day MRR for growth rate
    SELECT mrr INTO v_previous_mrr
    FROM public.mrr_snapshots
    WHERE workspace_id = v_workspace_id
      AND snapshot_date = p_snapshot_date - INTERVAL '1 day';

    -- Get previous month MRR for MoM growth
    SELECT mrr INTO v_previous_month_mrr
    FROM public.mrr_snapshots
    WHERE workspace_id = v_workspace_id
      AND snapshot_date = p_snapshot_date - INTERVAL '30 days';

    -- Insert or update snapshot
    INSERT INTO public.mrr_snapshots (
      snapshot_date,
      workspace_id,
      mrr,
      arr,
      total_subscriptions,
      active_subscriptions,
      trialing_subscriptions,
      plan_distribution,
      mrr_by_plan,
      paying_users,
      free_users,
      total_users,
      arpu,
      arppu,
      mrr_growth_rate,
      mom_growth_rate,
      net_mrr_change
    )
    SELECT
      p_snapshot_date,
      v_workspace_id,
      v_current_mrr.mrr,
      v_current_mrr.arr,
      v_current_mrr.total_subscriptions,
      v_current_mrr.active_subscriptions,
      v_current_mrr.trialing_subscriptions,
      v_current_mrr.plan_distribution,
      v_current_mrr.mrr_by_plan,
      v_current_mrr.paying_users,
      v_current_mrr.free_users,
      (SELECT COUNT(*)::INTEGER FROM public.workspace_memberships WHERE workspace_id = v_workspace_id),
      CASE WHEN v_current_mrr.paying_users > 0
        THEN ROUND(v_current_mrr.mrr / v_current_mrr.paying_users, 2)
        ELSE 0
      END,
      CASE WHEN v_current_mrr.paying_users > 0
        THEN ROUND(v_current_mrr.mrr / v_current_mrr.paying_users, 2)
        ELSE 0
      END,
      CASE WHEN v_previous_mrr IS NOT NULL AND v_previous_mrr > 0
        THEN ROUND(((v_current_mrr.mrr - v_previous_mrr) / v_previous_mrr) * 100, 4)
        ELSE NULL
      END,
      CASE WHEN v_previous_month_mrr IS NOT NULL AND v_previous_month_mrr > 0
        THEN ROUND(((v_current_mrr.mrr - v_previous_month_mrr) / v_previous_month_mrr) * 100, 4)
        ELSE NULL
      END,
      CASE WHEN v_previous_mrr IS NOT NULL
        THEN v_current_mrr.mrr - v_previous_mrr
        ELSE 0
      END
    ON CONFLICT (snapshot_date, workspace_id)
    DO UPDATE SET
      mrr = EXCLUDED.mrr,
      arr = EXCLUDED.arr,
      total_subscriptions = EXCLUDED.total_subscriptions,
      active_subscriptions = EXCLUDED.active_subscriptions,
      trialing_subscriptions = EXCLUDED.trialing_subscriptions,
      plan_distribution = EXCLUDED.plan_distribution,
      mrr_by_plan = EXCLUDED.mrr_by_plan,
      paying_users = EXCLUDED.paying_users,
      free_users = EXCLUDED.free_users,
      total_users = EXCLUDED.total_users,
      arpu = EXCLUDED.arpu,
      arppu = EXCLUDED.arppu,
      mrr_growth_rate = EXCLUDED.mrr_growth_rate,
      mom_growth_rate = EXCLUDED.mom_growth_rate,
      net_mrr_change = EXCLUDED.net_mrr_change;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.snapshot_daily_mrr IS 'Create daily MRR snapshot for all workspaces (run via cron)';

-- ============================================================================
-- 5. FUNCTION: Get MRR history with trends
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_mrr_history(
  p_workspace_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  snapshot_date DATE,
  mrr NUMERIC,
  arr NUMERIC,
  mrr_growth_rate NUMERIC,
  mom_growth_rate NUMERIC,
  net_mrr_change NUMERIC,
  active_subscriptions INTEGER,
  paying_users INTEGER,
  arpu NUMERIC,
  plan_distribution JSONB,
  mrr_by_plan JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.snapshot_date,
    ms.mrr,
    ms.arr,
    ms.mrr_growth_rate,
    ms.mom_growth_rate,
    ms.net_mrr_change,
    ms.active_subscriptions,
    ms.paying_users,
    ms.arpu,
    ms.plan_distribution,
    ms.mrr_by_plan
  FROM public.mrr_snapshots ms
  WHERE ms.snapshot_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    AND (p_workspace_id IS NULL OR ms.workspace_id = p_workspace_id)
  ORDER BY ms.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_mrr_history IS 'Get MRR history for trend analysis';

-- ============================================================================
-- 6. FUNCTION: Get MRR summary for dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_mrr_summary(
  p_workspace_id UUID DEFAULT NULL
)
RETURNS TABLE (
  current_mrr NUMERIC,
  current_arr NUMERIC,
  mrr_change_30d NUMERIC,
  mrr_growth_rate_30d NUMERIC,
  active_subscriptions INTEGER,
  paying_users INTEGER,
  free_users INTEGER,
  trial_users INTEGER,
  arpu NUMERIC,
  plan_distribution JSONB,
  mrr_by_plan JSONB,
  best_day_mrr NUMERIC,
  worst_day_mrr NUMERIC
) AS $$
DECLARE
  v_current RECORD;
  v_30d_ago NUMERIC;
BEGIN
  -- Get current stats
  SELECT * INTO v_current FROM public.calculate_current_mrr(p_workspace_id);

  -- Get 30 days ago MRR
  SELECT mrr INTO v_30d_ago
  FROM public.mrr_snapshots
  WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id)
    AND snapshot_date = CURRENT_DATE - INTERVAL '30 days'
  ORDER BY snapshot_date DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    v_current.mrr as current_mrr,
    v_current.arr as current_arr,
    COALESCE(v_current.mrr - v_30d_ago, 0) as mrr_change_30d,
    CASE WHEN v_30d_ago > 0
      THEN ROUND(((v_current.mrr - v_30d_ago) / v_30d_ago) * 100, 2)
      ELSE NULL
    END as mrr_growth_rate_30d,
    v_current.active_subscriptions,
    v_current.paying_users,
    v_current.free_users,
    v_current.trialing_subscriptions as trial_users,
    CASE WHEN v_current.paying_users > 0
      THEN ROUND(v_current.mrr / v_current.paying_users, 2)
      ELSE 0
    END as arpu,
    v_current.plan_distribution,
    v_current.mrr_by_plan,
    (SELECT MAX(mrr) FROM public.mrr_snapshots WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id) AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days') as best_day_mrr,
    (SELECT MIN(mrr) FROM public.mrr_snapshots WHERE (p_workspace_id IS NULL OR workspace_id = p_workspace_id) AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days') as worst_day_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_mrr_summary IS 'Get MRR summary for dashboard display';

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Admins can view MRR snapshots
DROP POLICY IF EXISTS "Admins can view mrr snapshots" ON public.mrr_snapshots;
CREATE POLICY "Admins can view mrr snapshots"
  ON public.mrr_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage mrr snapshots
DROP POLICY IF EXISTS "Service role can manage mrr snapshots" ON public.mrr_snapshots;
CREATE POLICY "Service role can manage mrr snapshots"
  ON public.mrr_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view subscription events
DROP POLICY IF EXISTS "Admins can view subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Service role can manage subscription events
DROP POLICY IF EXISTS "Service role can manage subscription events" ON public.subscription_events;
CREATE POLICY "Service role can manage subscription events"
  ON public.subscription_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 8. TRIGGER: Log subscription events on changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_subscription_event()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_prices JSONB := '{"free": 0, "starter": 29, "professional": 79, "team": 199, "brokerage": 499}'::JSONB;
  v_event_type TEXT;
  v_mrr_impact NUMERIC;
  v_old_price NUMERIC;
  v_new_price NUMERIC;
BEGIN
  -- Calculate prices
  v_old_price := COALESCE((v_plan_prices->>OLD.plan)::NUMERIC, 0);
  v_new_price := COALESCE((v_plan_prices->>NEW.plan)::NUMERIC, 0);

  -- Determine event type and MRR impact
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'trialing' THEN
      v_event_type := 'trial_started';
      v_mrr_impact := 0;
    ELSE
      v_event_type := 'new';
      v_mrr_impact := v_new_price;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Plan change
    IF OLD.plan != NEW.plan THEN
      IF v_new_price > v_old_price THEN
        v_event_type := 'upgrade';
        v_mrr_impact := v_new_price - v_old_price;
      ELSE
        v_event_type := 'downgrade';
        v_mrr_impact := v_new_price - v_old_price;
      END IF;
    -- Status change
    ELSIF OLD.status != NEW.status THEN
      IF NEW.status = 'canceled' THEN
        v_event_type := 'canceled';
        v_mrr_impact := -v_old_price;
      ELSIF OLD.status = 'canceled' AND NEW.status = 'active' THEN
        v_event_type := 'reactivated';
        v_mrr_impact := v_new_price;
      ELSIF OLD.status = 'trialing' AND NEW.status = 'active' THEN
        v_event_type := 'trial_converted';
        v_mrr_impact := v_new_price;
      ELSIF OLD.status = 'trialing' AND NEW.status = 'canceled' THEN
        v_event_type := 'trial_expired';
        v_mrr_impact := 0;
      ELSIF NEW.status = 'past_due' THEN
        v_event_type := 'payment_failed';
        v_mrr_impact := 0;
      ELSIF OLD.status = 'past_due' AND NEW.status = 'active' THEN
        v_event_type := 'payment_recovered';
        v_mrr_impact := 0;
      ELSE
        RETURN NEW; -- Unknown status change, skip logging
      END IF;
    ELSE
      RETURN NEW; -- No significant change
    END IF;
  END IF;

  -- Insert event
  IF v_event_type IS NOT NULL THEN
    INSERT INTO public.subscription_events (
      subscription_id,
      workspace_id,
      event_type,
      previous_plan,
      new_plan,
      mrr_impact,
      metadata
    ) VALUES (
      NEW.id,
      NEW.workspace_id,
      v_event_type,
      OLD.plan,
      NEW.plan,
      v_mrr_impact,
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'stripe_subscription_id', NEW.stripe_subscription_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_log_subscription_event ON public.subscriptions;
CREATE TRIGGER tr_log_subscription_event
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_event();

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.mrr_snapshots TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_current_mrr TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mrr_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mrr_summary TO authenticated;
