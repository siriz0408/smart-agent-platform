-- MCP Integration Migration
-- Adds support for Model Context Protocol integrations (Playwright, Zillow, etc.)

-- ============================================================================
-- PHASE 1: MCP Infrastructure Tables
-- ============================================================================

-- MCP Call Logs: Unified logging for all MCP calls
CREATE TABLE public.mcp_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,

  -- MCP details
  mcp_type TEXT NOT NULL CHECK (mcp_type IN (
    'playwright', 'zillow', 'mls', 'vercel', 'supabase'
  )),
  tool_name TEXT NOT NULL, -- e.g., 'playwright_run_test', 'zillow_enrich_property'

  -- Request/Response
  request_params JSONB NOT NULL DEFAULT '{}',
  response_data JSONB,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed'
  )),
  error_message TEXT,

  -- Performance tracking
  duration_ms INTEGER,

  -- Rate limiting tracking
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- PLAYWRIGHT MCP TABLES
-- ============================================================================

-- Test Runs: Tracks Playwright test executions
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Test configuration
  test_suite TEXT NOT NULL, -- 'e2e', 'smoke', 'visual', etc.
  test_file TEXT, -- Specific test file if running single test
  project TEXT DEFAULT 'chromium', -- 'chromium', 'firefox', 'webkit', 'mobile'

  -- Trigger context
  triggered_by UUID REFERENCES auth.users(id),
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  deployment_id TEXT, -- Vercel deployment ID if post-deploy test

  -- Execution details
  github_run_id TEXT, -- GitHub Actions run ID
  github_run_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'passed', 'failed', 'cancelled'
  )),

  -- Results
  total_tests INTEGER,
  passed_tests INTEGER,
  failed_tests INTEGER,
  skipped_tests INTEGER,
  test_duration_ms INTEGER,

  -- Artifacts
  report_url TEXT, -- URL to HTML report in storage
  video_urls JSONB, -- Array of video URLs
  screenshot_urls JSONB, -- Array of screenshot URLs
  trace_urls JSONB, -- Array of trace file URLs

  -- Error details
  error_message TEXT,
  failed_test_names TEXT[], -- Array of failed test names

  -- Visual regression
  visual_diff_count INTEGER DEFAULT 0,
  visual_diff_urls JSONB, -- Array of visual diff image URLs

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Visual Baselines: Reference images for visual regression testing
CREATE TABLE public.visual_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Test identification
  test_name TEXT NOT NULL,
  page_url TEXT NOT NULL,
  viewport_width INTEGER NOT NULL DEFAULT 1280,
  viewport_height INTEGER NOT NULL DEFAULT 720,
  browser TEXT NOT NULL DEFAULT 'chromium',

  -- Baseline image
  image_url TEXT NOT NULL, -- Storage URL
  image_hash TEXT NOT NULL, -- For quick comparison

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one active baseline per test configuration
  UNIQUE(tenant_id, test_name, page_url, viewport_width, viewport_height, browser)
);

-- ============================================================================
-- PROPERTY DATA SYNC TABLES (Zillow MCP)
-- ============================================================================

-- Property Price History: Tracks price changes over time
CREATE TABLE public.property_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  external_property_id UUID REFERENCES public.external_properties(id) ON DELETE CASCADE,

  -- Price data
  price DECIMAL(12, 2) NOT NULL,
  price_change_amount DECIMAL(12, 2),
  price_change_percent DECIMAL(5, 2),

  -- Status at time of snapshot
  status TEXT, -- 'for_sale', 'pending', 'sold', 'off_market'
  days_on_market INTEGER,

  -- Source information
  source TEXT NOT NULL DEFAULT 'zillow', -- 'zillow', 'mls', 'manual'
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Index for efficient queries
  CONSTRAINT unique_property_snapshot UNIQUE(property_id, snapshot_date) WHERE property_id IS NOT NULL,
  CONSTRAINT unique_external_property_snapshot UNIQUE(external_property_id, snapshot_date) WHERE external_property_id IS NOT NULL
);

-- Property Sync Logs: Tracks property data synchronization operations
CREATE TABLE public.property_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN (
    'enrich_property', 'price_check', 'search', 'bulk_sync'
  )),

  -- Target
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  external_property_id UUID REFERENCES public.external_properties(id) ON DELETE CASCADE,
  address TEXT, -- For searches without existing property

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed'
  )),

  -- Results
  properties_found INTEGER DEFAULT 0,
  properties_updated INTEGER DEFAULT 0,
  properties_created INTEGER DEFAULT 0,
  price_changes_detected INTEGER DEFAULT 0,

  -- API response
  api_response JSONB,
  error_message TEXT,

  -- Performance
  duration_ms INTEGER,
  api_calls_made INTEGER DEFAULT 1,

  -- Metadata
  triggered_by UUID REFERENCES auth.users(id),
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- mcp_call_logs indexes
CREATE INDEX idx_mcp_call_logs_tenant_id ON public.mcp_call_logs(tenant_id);
CREATE INDEX idx_mcp_call_logs_user_id ON public.mcp_call_logs(user_id);
CREATE INDEX idx_mcp_call_logs_agent_run_id ON public.mcp_call_logs(agent_run_id);
CREATE INDEX idx_mcp_call_logs_mcp_type ON public.mcp_call_logs(mcp_type);
CREATE INDEX idx_mcp_call_logs_status ON public.mcp_call_logs(status);
CREATE INDEX idx_mcp_call_logs_created_at ON public.mcp_call_logs(created_at);
CREATE INDEX idx_mcp_call_logs_rate_limit ON public.mcp_call_logs(tenant_id, created_at)
  WHERE status = 'completed';

-- test_runs indexes
CREATE INDEX idx_test_runs_tenant_id ON public.test_runs(tenant_id);
CREATE INDEX idx_test_runs_triggered_by ON public.test_runs(triggered_by);
CREATE INDEX idx_test_runs_agent_run_id ON public.test_runs(agent_run_id);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_runs_created_at ON public.test_runs(created_at);
CREATE INDEX idx_test_runs_test_suite ON public.test_runs(test_suite);
CREATE INDEX idx_test_runs_deployment_id ON public.test_runs(deployment_id) WHERE deployment_id IS NOT NULL;

-- visual_baselines indexes
CREATE INDEX idx_visual_baselines_tenant_id ON public.visual_baselines(tenant_id);
CREATE INDEX idx_visual_baselines_test_name ON public.visual_baselines(test_name);
CREATE INDEX idx_visual_baselines_active ON public.visual_baselines(tenant_id, is_active) WHERE is_active = true;

-- property_price_history indexes
CREATE INDEX idx_property_price_history_tenant_id ON public.property_price_history(tenant_id);
CREATE INDEX idx_property_price_history_property_id ON public.property_price_history(property_id);
CREATE INDEX idx_property_price_history_external_property_id ON public.property_price_history(external_property_id);
CREATE INDEX idx_property_price_history_snapshot_date ON public.property_price_history(snapshot_date);
CREATE INDEX idx_property_price_history_price_changes ON public.property_price_history(tenant_id, snapshot_date)
  WHERE ABS(price_change_percent) > 5; -- Significant price changes

-- property_sync_logs indexes
CREATE INDEX idx_property_sync_logs_tenant_id ON public.property_sync_logs(tenant_id);
CREATE INDEX idx_property_sync_logs_property_id ON public.property_sync_logs(property_id);
CREATE INDEX idx_property_sync_logs_external_property_id ON public.property_sync_logs(external_property_id);
CREATE INDEX idx_property_sync_logs_sync_type ON public.property_sync_logs(sync_type);
CREATE INDEX idx_property_sync_logs_status ON public.property_sync_logs(status);
CREATE INDEX idx_property_sync_logs_created_at ON public.property_sync_logs(created_at);
CREATE INDEX idx_property_sync_logs_agent_run_id ON public.property_sync_logs(agent_run_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.mcp_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_sync_logs ENABLE ROW LEVEL SECURITY;

-- mcp_call_logs RLS
CREATE POLICY "Users can view MCP logs in their tenant"
  ON public.mcp_call_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Service role can manage all MCP logs"
  ON public.mcp_call_logs FOR ALL
  USING (auth.role() = 'service_role');

-- test_runs RLS
CREATE POLICY "Users can view test runs in their tenant"
  ON public.test_runs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert test runs in their tenant"
  ON public.test_runs FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their test runs"
  ON public.test_runs FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Service role can manage all test runs"
  ON public.test_runs FOR ALL
  USING (auth.role() = 'service_role');

-- visual_baselines RLS
CREATE POLICY "Users can view baselines in their tenant"
  ON public.visual_baselines FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can manage baselines in their tenant"
  ON public.visual_baselines FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- property_price_history RLS
CREATE POLICY "Users can view price history in their tenant"
  ON public.property_price_history FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Service role can manage all price history"
  ON public.property_price_history FOR ALL
  USING (auth.role() = 'service_role');

-- property_sync_logs RLS
CREATE POLICY "Users can view sync logs in their tenant"
  ON public.property_sync_logs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Service role can manage all sync logs"
  ON public.property_sync_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_visual_baselines_updated_at
  BEFORE UPDATE ON public.visual_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check MCP rate limit (100 calls per hour per tenant)
CREATE OR REPLACE FUNCTION public.check_mcp_rate_limit(
  p_tenant_id UUID,
  p_mcp_type TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS JSONB AS $$
DECLARE
  v_call_count INTEGER;
  v_oldest_call_time TIMESTAMPTZ;
  v_rate_limit_reset TIMESTAMPTZ;
BEGIN
  -- Count calls in the time window
  SELECT
    COUNT(*),
    MIN(created_at)
  INTO v_call_count, v_oldest_call_time
  FROM public.mcp_call_logs
  WHERE tenant_id = p_tenant_id
    AND mcp_type = p_mcp_type
    AND created_at > (now() - (p_window_seconds || ' seconds')::INTERVAL)
    AND status = 'completed';

  -- Calculate when the rate limit will reset
  IF v_oldest_call_time IS NOT NULL THEN
    v_rate_limit_reset := v_oldest_call_time + (p_window_seconds || ' seconds')::INTERVAL;
  ELSE
    v_rate_limit_reset := now() + (p_window_seconds || ' seconds')::INTERVAL;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_call_count < p_limit,
    'current_count', v_call_count,
    'limit', p_limit,
    'remaining', GREATEST(0, p_limit - v_call_count),
    'reset_at', v_rate_limit_reset
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to log price changes and create alerts
CREATE OR REPLACE FUNCTION public.check_property_price_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_price DECIMAL(12, 2);
  v_price_change_percent DECIMAL(5, 2);
  v_significant_change BOOLEAN := false;
BEGIN
  -- Get the most recent price before this snapshot
  SELECT price INTO v_previous_price
  FROM public.property_price_history
  WHERE (
    (property_id = NEW.property_id AND NEW.property_id IS NOT NULL) OR
    (external_property_id = NEW.external_property_id AND NEW.external_property_id IS NOT NULL)
  )
  AND snapshot_date < NEW.snapshot_date
  ORDER BY snapshot_date DESC
  LIMIT 1;

  -- Calculate price change if we have a previous price
  IF v_previous_price IS NOT NULL AND v_previous_price > 0 THEN
    v_price_change_percent := ((NEW.price - v_previous_price) / v_previous_price) * 100;

    -- Update the record with calculated values
    NEW.price_change_amount := NEW.price - v_previous_price;
    NEW.price_change_percent := v_price_change_percent;

    -- Check if this is a significant change (>5%)
    IF ABS(v_price_change_percent) > 5 THEN
      v_significant_change := true;

      -- Create notification for significant price changes
      -- (Only if we have a property_id - internal properties)
      IF NEW.property_id IS NOT NULL THEN
        BEGIN
          INSERT INTO public.notifications (
            tenant_id,
            type,
            title,
            body,
            metadata
          )
          SELECT
            p.tenant_id,
            'property_price_change',
            'Significant Price Change',
            'Property at ' || p.address || ' has ' ||
            CASE WHEN v_price_change_percent > 0 THEN 'increased' ELSE 'decreased' END ||
            ' by ' || ABS(v_price_change_percent)::TEXT || '% ($' || ABS(NEW.price_change_amount)::TEXT || ')',
            jsonb_build_object(
              'property_id', NEW.property_id,
              'old_price', v_previous_price,
              'new_price', NEW.price,
              'change_percent', v_price_change_percent,
              'change_amount', NEW.price_change_amount
            )
          FROM public.properties p
          WHERE p.id = NEW.property_id;
        EXCEPTION WHEN OTHERS THEN
          -- Log error but don't fail the insert
          RAISE WARNING 'Failed to create price change notification: %', SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to check price changes
CREATE TRIGGER check_price_changes_on_insert
  BEFORE INSERT ON public.property_price_history
  FOR EACH ROW
  EXECUTE FUNCTION public.check_property_price_changes();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.mcp_call_logs IS 'Unified logging for all Model Context Protocol (MCP) calls';
COMMENT ON TABLE public.test_runs IS 'Tracks Playwright test executions triggered by agents or users';
COMMENT ON TABLE public.visual_baselines IS 'Reference images for visual regression testing';
COMMENT ON TABLE public.property_price_history IS 'Historical price snapshots for properties from Zillow/MLS';
COMMENT ON TABLE public.property_sync_logs IS 'Logs of property data synchronization operations';

COMMENT ON FUNCTION public.check_mcp_rate_limit IS 'Checks if tenant has exceeded MCP rate limit (default: 100 calls/hour)';
COMMENT ON FUNCTION public.check_property_price_changes IS 'Calculates price changes and creates notifications for significant changes (>5%)';
