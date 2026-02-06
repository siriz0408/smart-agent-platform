-- Migration: Create search click-through event tracking
-- Date: 2026-02-07
-- Purpose: Track which search results users click to measure search relevance
--          Task: DIS-009
--          Supports: Click-Through Rate (CTR) analysis, ranking improvements

-- ============================================================================
-- Create search_click_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Search context
  query text NOT NULL,
  result_type text NOT NULL CHECK (result_type IN ('contact', 'property', 'document', 'deal')),
  result_id uuid NOT NULL,

  -- Position & relevance tracking
  result_position integer NOT NULL CHECK (result_position >= 1),
  total_results integer NOT NULL CHECK (total_results >= 1),

  -- Timestamps
  clicked_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes for efficient querying
-- ============================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_search_click_events_tenant_id ON search_click_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_click_events_user_id ON search_click_events(user_id);
CREATE INDEX IF NOT EXISTS idx_search_click_events_clicked_at ON search_click_events(clicked_at DESC);

-- Query analysis: which queries lead to clicks?
CREATE INDEX IF NOT EXISTS idx_search_click_events_query ON search_click_events(query);

-- Result type analysis: what entity types get clicked most?
CREATE INDEX IF NOT EXISTS idx_search_click_events_result_type ON search_click_events(result_type);

-- Composite for time-scoped tenant queries (common analytics pattern)
CREATE INDEX IF NOT EXISTS idx_search_click_events_tenant_clicked
  ON search_click_events(tenant_id, clicked_at DESC);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE search_click_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view click events for their own tenant
CREATE POLICY "Users can view search click events for their tenant"
  ON search_click_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- Policy: Authenticated users can insert their own click events
CREATE POLICY "Users can insert their own search click events"
  ON search_click_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- ============================================================================
-- RPC: get_search_click_through_stats
-- Calculates CTR and position metrics for search quality analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION get_search_click_through_stats(
  p_tenant_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  total_clicks bigint,
  unique_queries bigint,
  avg_click_position numeric,
  clicks_in_top_3 bigint,
  clicks_in_top_3_percent numeric,
  clicks_by_result_type jsonb,
  top_clicked_queries jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  WITH clicks_filtered AS (
    SELECT *
    FROM search_click_events
    WHERE clicked_at >= v_start_date
      AND clicked_at <= v_end_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ),
  summary AS (
    SELECT
      COUNT(*) AS total_clicks,
      COUNT(DISTINCT query) AS unique_queries,
      ROUND(AVG(result_position), 2) AS avg_click_position,
      COUNT(*) FILTER (WHERE result_position <= 3) AS clicks_in_top_3,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND(100.0 * COUNT(*) FILTER (WHERE result_position <= 3)::numeric / COUNT(*)::numeric, 2)
        ELSE 0
      END AS clicks_in_top_3_percent
    FROM clicks_filtered
  ),
  by_type AS (
    SELECT
      jsonb_object_agg(
        result_type,
        jsonb_build_object(
          'clicks', type_clicks,
          'avg_position', type_avg_position
        )
      ) AS clicks_by_result_type
    FROM (
      SELECT
        result_type,
        COUNT(*) AS type_clicks,
        ROUND(AVG(result_position), 2) AS type_avg_position
      FROM clicks_filtered
      GROUP BY result_type
      ORDER BY type_clicks DESC
    ) subq
  ),
  top_queries AS (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'query', query,
          'clicks', click_count,
          'avg_position', avg_pos
        ) ORDER BY click_count DESC
      ) AS top_clicked_queries
    FROM (
      SELECT
        query,
        COUNT(*) AS click_count,
        ROUND(AVG(result_position), 2) AS avg_pos
      FROM clicks_filtered
      GROUP BY query
      ORDER BY click_count DESC
      LIMIT 20
    ) subq
  )
  SELECT
    s.total_clicks,
    s.unique_queries,
    s.avg_click_position,
    s.clicks_in_top_3,
    s.clicks_in_top_3_percent,
    COALESCE(bt.clicks_by_result_type, '{}'::jsonb),
    COALESCE(tq.top_clicked_queries, '[]'::jsonb)
  FROM summary s
  CROSS JOIN LATERAL (SELECT clicks_by_result_type FROM by_type) bt
  CROSS JOIN LATERAL (SELECT top_clicked_queries FROM top_queries) tq;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_search_click_through_stats TO authenticated;

COMMENT ON TABLE search_click_events IS 'Tracks search result clicks for CTR analysis and ranking improvement (DIS-009)';
COMMENT ON COLUMN search_click_events.result_position IS '1-indexed position of clicked result in the search results list';
COMMENT ON COLUMN search_click_events.total_results IS 'Total number of results shown when user clicked';
COMMENT ON FUNCTION get_search_click_through_stats IS 'Calculates click-through rate metrics: CTR, avg click position, top queries';
