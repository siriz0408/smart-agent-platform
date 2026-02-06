-- Migration: Create comprehensive search metrics tracking
-- Date: 2026-02-07
-- Purpose: Track ALL searches (successful + zero results) to calculate Search Success Rate
--          Task: DIS-008
--          North Star Metric: Search Success Rate >95%

-- ============================================================================
-- Create search_metrics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Search query details
  query text NOT NULL,
  query_length int NOT NULL,
  entity_types text[] NOT NULL,
  match_count_per_type int NOT NULL,
  
  -- Result metrics
  result_count int NOT NULL DEFAULT 0,
  is_success boolean NOT NULL GENERATED ALWAYS AS (result_count > 0) STORED,
  
  -- Performance metrics
  latency_ms int NOT NULL, -- Search execution time in milliseconds
  
  -- Query analysis fields
  query_words text[],
  query_word_count int NOT NULL,
  has_special_chars boolean NOT NULL DEFAULT false,
  is_numeric boolean NOT NULL DEFAULT false,
  is_single_word boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Create indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_search_metrics_tenant_id ON search_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_metrics_created_at ON search_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_metrics_user_id ON search_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_metrics_is_success ON search_metrics(is_success);
CREATE INDEX IF NOT EXISTS idx_search_metrics_result_count ON search_metrics(result_count);
CREATE INDEX IF NOT EXISTS idx_search_metrics_latency_ms ON search_metrics(latency_ms);
CREATE INDEX IF NOT EXISTS idx_search_metrics_query_words ON search_metrics USING gin(query_words);
CREATE INDEX IF NOT EXISTS idx_search_metrics_entity_types ON search_metrics USING gin(entity_types);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_search_metrics_tenant_created_success 
  ON search_metrics(tenant_id, created_at DESC, is_success);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE search_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see search metrics for their own tenant
CREATE POLICY "Users can view search metrics for their tenant"
  ON search_metrics
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can insert search metrics (for edge function)
CREATE POLICY "Service role can insert search metrics"
  ON search_metrics
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Create RPC function: get_search_metrics_summary
-- Calculates North Star Metric: Search Success Rate >95%
-- ============================================================================

CREATE OR REPLACE FUNCTION get_search_metrics_summary(
  p_tenant_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  total_searches bigint,
  successful_searches bigint,
  zero_result_searches bigint,
  success_rate numeric,
  avg_latency_ms numeric,
  p95_latency_ms numeric,
  p99_latency_ms numeric,
  avg_result_count numeric,
  searches_below_500ms bigint,
  latency_target_met_percent numeric,
  popular_queries jsonb,
  entity_type_distribution jsonb,
  query_length_distribution jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  -- Default date range: last 30 days
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  WITH metrics_filtered AS (
    SELECT *
    FROM search_metrics
    WHERE created_at >= v_start_date
      AND created_at <= v_end_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ),
  summary_stats AS (
    SELECT
      COUNT(*) AS total_searches,
      COUNT(*) FILTER (WHERE is_success = true) AS successful_searches,
      COUNT(*) FILTER (WHERE is_success = false) AS zero_result_searches,
      CASE 
        WHEN COUNT(*) > 0 THEN
          ROUND(100.0 * COUNT(*) FILTER (WHERE is_success = true)::numeric / COUNT(*)::numeric, 2)
        ELSE 0
      END AS success_rate,
      ROUND(AVG(latency_ms), 2) AS avg_latency_ms,
      ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 2) AS p95_latency_ms,
      ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 2) AS p99_latency_ms,
      ROUND(AVG(result_count), 2) AS avg_result_count,
      COUNT(*) FILTER (WHERE latency_ms < 500) AS searches_below_500ms,
      CASE 
        WHEN COUNT(*) > 0 THEN
          ROUND(100.0 * COUNT(*) FILTER (WHERE latency_ms < 500)::numeric / COUNT(*)::numeric, 2)
        ELSE 0
      END AS latency_target_met_percent
    FROM metrics_filtered
  ),
  popular_queries_data AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'query', query,
          'count', occurrence_count,
          'success_rate', success_rate,
          'avg_latency_ms', avg_latency_ms
        ) ORDER BY occurrence_count DESC
      ) AS popular_queries
    FROM (
      SELECT
        query,
        COUNT(*) AS occurrence_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_success = true)::numeric / COUNT(*)::numeric, 2) AS success_rate,
        ROUND(AVG(latency_ms), 2) AS avg_latency_ms
      FROM metrics_filtered
      GROUP BY query
      HAVING COUNT(*) >= 2
      ORDER BY occurrence_count DESC
      LIMIT 20
    ) subq
  ),
  entity_type_data AS (
    SELECT
      jsonb_object_agg(
        entity_type,
        jsonb_build_object(
          'count', type_count,
          'success_rate', type_success_rate,
          'avg_latency_ms', type_avg_latency
        )
      ) AS entity_type_distribution
    FROM (
      SELECT
        unnest(entity_types) AS entity_type,
        COUNT(*) AS type_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_success = true)::numeric / COUNT(*)::numeric, 2) AS type_success_rate,
        ROUND(AVG(latency_ms), 2) AS type_avg_latency
      FROM metrics_filtered
      GROUP BY entity_type
      ORDER BY type_count DESC
    ) subq
  ),
  query_length_data AS (
    SELECT
      jsonb_object_agg(
        length_category,
        jsonb_build_object(
          'count', length_count,
          'success_rate', length_success_rate,
          'avg_latency_ms', length_avg_latency
        )
      ) AS query_length_distribution
    FROM (
      SELECT
        CASE
          WHEN query_length < 3 THEN 'very_short'
          WHEN query_length < 5 THEN 'short'
          WHEN query_length < 10 THEN 'medium'
          WHEN query_length < 20 THEN 'long'
          ELSE 'very_long'
        END AS length_category,
        COUNT(*) AS length_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_success = true)::numeric / COUNT(*)::numeric, 2) AS length_success_rate,
        ROUND(AVG(latency_ms), 2) AS length_avg_latency
      FROM metrics_filtered
      GROUP BY length_category
      ORDER BY length_count DESC
    ) subq
  )
  SELECT
    ss.total_searches,
    ss.successful_searches,
    ss.zero_result_searches,
    ss.success_rate,
    ss.avg_latency_ms,
    ss.p95_latency_ms,
    ss.p99_latency_ms,
    ss.avg_result_count,
    ss.searches_below_500ms,
    ss.latency_target_met_percent,
    COALESCE(pq.popular_queries, '[]'::jsonb) AS popular_queries,
    COALESCE(et.entity_type_distribution, '{}'::jsonb) AS entity_type_distribution,
    COALESCE(ql.query_length_distribution, '{}'::jsonb) AS query_length_distribution
  FROM summary_stats ss
  CROSS JOIN LATERAL (SELECT popular_queries FROM popular_queries_data) pq
  CROSS JOIN LATERAL (SELECT entity_type_distribution FROM entity_type_data) et
  CROSS JOIN LATERAL (SELECT query_length_distribution FROM query_length_data) ql;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_search_metrics_summary TO authenticated;

COMMENT ON TABLE search_metrics IS 'Tracks all search queries (successful + zero results) for PM-Discovery North Star Metric: Search Success Rate >95%';
COMMENT ON COLUMN search_metrics.is_success IS 'TRUE if result_count > 0, used for success rate calculation';
COMMENT ON COLUMN search_metrics.latency_ms IS 'Search execution time in milliseconds (target: <500ms)';
COMMENT ON FUNCTION get_search_metrics_summary IS 'Calculates comprehensive search metrics including success rate, latency, and distribution patterns';
