-- ============================================================================
-- PRODUCTION METRICS TRACKING SYSTEM
-- Implements metrics tracking for PM-Infrastructure North Star Metric:
-- Uptime 99.9% (target: >99.9%)
-- ============================================================================

-- ============================================================================
-- 1. PRODUCTION_METRICS TABLE
-- Aggregated daily metrics for production monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.production_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  tenant_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- API Performance Metrics
  api_total_requests INTEGER DEFAULT 0,
  api_successful_requests INTEGER DEFAULT 0,
  api_failed_requests INTEGER DEFAULT 0,
  api_avg_response_time_ms NUMERIC(10, 2),
  api_p95_response_time_ms NUMERIC(10, 2),
  api_p99_response_time_ms NUMERIC(10, 2),
  api_error_rate_percent NUMERIC(5, 2) DEFAULT 0,
  
  -- Edge Function Metrics (from mcp_call_logs)
  edge_function_total_calls INTEGER DEFAULT 0,
  edge_function_successful_calls INTEGER DEFAULT 0,
  edge_function_failed_calls INTEGER DEFAULT 0,
  edge_function_avg_duration_ms NUMERIC(10, 2),
  edge_function_p95_duration_ms NUMERIC(10, 2),
  edge_function_error_rate_percent NUMERIC(5, 2) DEFAULT 0,
  
  -- Frontend Performance Metrics (from browser Performance API)
  page_load_total INTEGER DEFAULT 0,
  page_load_avg_time_ms NUMERIC(10, 2),
  page_load_p95_time_ms NUMERIC(10, 2),
  page_load_p99_time_ms NUMERIC(10, 2),
  
  -- Database Performance Metrics
  db_query_total INTEGER DEFAULT 0,
  db_query_avg_time_ms NUMERIC(10, 2),
  db_query_slow_queries INTEGER DEFAULT 0, -- queries > 1 second
  
  -- Error Tracking
  error_total INTEGER DEFAULT 0,
  error_rate_percent NUMERIC(5, 2) DEFAULT 0,
  
  -- Uptime calculation (based on error rate)
  uptime_percent NUMERIC(5, 2) DEFAULT 100.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  CONSTRAINT unique_production_metric UNIQUE (metric_date, tenant_id)
);

-- Add comments
COMMENT ON TABLE public.production_metrics IS 'Daily aggregated production metrics for monitoring uptime and performance';
COMMENT ON COLUMN public.production_metrics.uptime_percent IS 'Calculated uptime based on error rate (100 - error_rate)';

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_production_metrics_date 
  ON public.production_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_production_metrics_tenant 
  ON public.production_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_metrics_uptime 
  ON public.production_metrics(uptime_percent, metric_date DESC);

-- ============================================================================
-- 2. VIEW: Daily API metrics from mcp_call_logs
-- ============================================================================

CREATE OR REPLACE VIEW public.api_metrics_daily AS
SELECT 
  tenant_id,
  DATE_TRUNC('day', created_at) AS metric_date,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful_calls,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_calls,
  AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE duration_ms IS NOT NULL) AS p99_duration_ms,
  CASE 
    WHEN COUNT(*) > 0 THEN
      ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / COUNT(*)::NUMERIC, 2)
    ELSE 0
  END AS error_rate_percent
FROM public.mcp_call_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, DATE_TRUNC('day', created_at);

COMMENT ON VIEW public.api_metrics_daily IS 'Daily aggregated API metrics from MCP call logs';

-- ============================================================================
-- 3. FUNCTION: Get production metrics for a date range
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_production_metrics(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_date DATE,
  tenant_id UUID,
  api_total_requests INTEGER,
  api_successful_requests INTEGER,
  api_failed_requests INTEGER,
  api_avg_response_time_ms NUMERIC,
  api_p95_response_time_ms NUMERIC,
  api_error_rate_percent NUMERIC,
  edge_function_total_calls INTEGER,
  edge_function_successful_calls INTEGER,
  edge_function_failed_calls INTEGER,
  edge_function_avg_duration_ms NUMERIC,
  edge_function_error_rate_percent NUMERIC,
  error_total INTEGER,
  error_rate_percent NUMERIC,
  uptime_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.metric_date,
    pm.tenant_id,
    pm.api_total_requests,
    pm.api_successful_requests,
    pm.api_failed_requests,
    pm.api_avg_response_time_ms,
    pm.api_p95_response_time_ms,
    pm.api_error_rate_percent,
    pm.edge_function_total_calls,
    pm.edge_function_successful_calls,
    pm.edge_function_failed_calls,
    pm.edge_function_avg_duration_ms,
    pm.edge_function_error_rate_percent,
    pm.error_total,
    pm.error_rate_percent,
    pm.uptime_percent
  FROM public.production_metrics pm
  WHERE pm.metric_date >= p_start_date
    AND pm.metric_date <= p_end_date
    AND (p_tenant_id IS NULL OR pm.tenant_id = p_tenant_id)
  ORDER BY pm.metric_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_production_metrics IS 'Get production metrics for a date range, optionally filtered by tenant';

-- ============================================================================
-- 4. FUNCTION: Get production metrics summary (aggregated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_production_metrics_summary(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_days INTEGER,
  avg_uptime_percent NUMERIC,
  min_uptime_percent NUMERIC,
  avg_api_error_rate_percent NUMERIC,
  avg_api_response_time_ms NUMERIC,
  avg_edge_function_duration_ms NUMERIC,
  total_errors INTEGER,
  total_api_requests INTEGER,
  total_edge_function_calls INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT pm.metric_date)::INTEGER AS total_days,
    ROUND(AVG(pm.uptime_percent), 2) AS avg_uptime_percent,
    ROUND(MIN(pm.uptime_percent), 2) AS min_uptime_percent,
    ROUND(AVG(pm.api_error_rate_percent), 2) AS avg_api_error_rate_percent,
    ROUND(AVG(pm.api_avg_response_time_ms), 2) AS avg_api_response_time_ms,
    ROUND(AVG(pm.edge_function_avg_duration_ms), 2) AS avg_edge_function_duration_ms,
    SUM(pm.error_total)::INTEGER AS total_errors,
    SUM(pm.api_total_requests)::INTEGER AS total_api_requests,
    SUM(pm.edge_function_total_calls)::INTEGER AS total_edge_function_calls
  FROM public.production_metrics pm
  WHERE pm.metric_date >= p_start_date
    AND pm.metric_date <= p_end_date
    AND (p_tenant_id IS NULL OR pm.tenant_id = p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_production_metrics_summary IS 'Get aggregated production metrics summary for a date range';

-- ============================================================================
-- 5. FUNCTION: Aggregate daily metrics from source tables
-- This should be run daily via cron or scheduled job
-- ============================================================================

CREATE OR REPLACE FUNCTION public.aggregate_production_metrics(
  p_metric_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Aggregate metrics for each tenant
  FOR v_tenant_id IN 
    SELECT DISTINCT tenant_id FROM public.mcp_call_logs 
    WHERE DATE_TRUNC('day', created_at) = p_metric_date
  LOOP
    INSERT INTO public.production_metrics (
      metric_date,
      tenant_id,
      edge_function_total_calls,
      edge_function_successful_calls,
      edge_function_failed_calls,
      edge_function_avg_duration_ms,
      edge_function_p95_duration_ms,
      edge_function_error_rate_percent,
      updated_at
    )
    SELECT 
      p_metric_date,
      v_tenant_id,
      am.total_calls,
      am.successful_calls,
      am.failed_calls,
      am.avg_duration_ms,
      am.p95_duration_ms,
      am.error_rate_percent,
      now()
    FROM public.api_metrics_daily am
    WHERE am.metric_date = p_metric_date
      AND am.tenant_id = v_tenant_id
    ON CONFLICT (metric_date, tenant_id) 
    DO UPDATE SET
      edge_function_total_calls = EXCLUDED.edge_function_total_calls,
      edge_function_successful_calls = EXCLUDED.edge_function_successful_calls,
      edge_function_failed_calls = EXCLUDED.edge_function_failed_calls,
      edge_function_avg_duration_ms = EXCLUDED.edge_function_avg_duration_ms,
      edge_function_p95_duration_ms = EXCLUDED.edge_function_p95_duration_ms,
      edge_function_error_rate_percent = EXCLUDED.edge_function_error_rate_percent,
      updated_at = now();
    
    -- Calculate uptime based on error rate
    UPDATE public.production_metrics
    SET uptime_percent = GREATEST(0, 100.0 - COALESCE(edge_function_error_rate_percent, 0))
    WHERE metric_date = p_metric_date
      AND tenant_id = v_tenant_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.aggregate_production_metrics IS 'Aggregate daily production metrics from source tables (run daily via cron)';

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.production_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can view all metrics
CREATE POLICY "Admins can view production metrics"
  ON public.production_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert/update (for aggregation function)
CREATE POLICY "Service role can manage production metrics"
  ON public.production_metrics
  FOR ALL
  USING (auth.role() = 'service_role');
