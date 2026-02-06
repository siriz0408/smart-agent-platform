-- Migration: Create zero results log table for search analytics
-- Date: 2026-02-06
-- Purpose: Track zero-result searches to analyze patterns and improve search quality
--          Task: DIS-004

-- ============================================================================
-- Create zero_results_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS zero_results_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  query_length int NOT NULL,
  entity_types text[] NOT NULL,
  match_count_per_type int NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Analysis fields
  query_words text[], -- Array of words in query
  query_word_count int NOT NULL,
  has_special_chars boolean NOT NULL DEFAULT false,
  is_numeric boolean NOT NULL DEFAULT false,
  is_single_word boolean NOT NULL DEFAULT false
);

-- ============================================================================
-- Create indexes for efficient querying
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_zero_results_log_tenant_id ON zero_results_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zero_results_log_created_at ON zero_results_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zero_results_log_query_length ON zero_results_log(query_length);
CREATE INDEX IF NOT EXISTS idx_zero_results_log_query_words ON zero_results_log USING gin(query_words);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE zero_results_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see zero results for their own tenant
CREATE POLICY "Users can view zero results for their tenant"
  ON zero_results_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can insert zero results (for edge function)
CREATE POLICY "Service role can insert zero results"
  ON zero_results_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Create analysis function: analyze_zero_results_patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION analyze_zero_results_patterns(
  p_tenant_id uuid,
  p_days_back int DEFAULT 30,
  p_min_occurrences int DEFAULT 2
)
RETURNS TABLE (
  pattern_type text,
  pattern_value text,
  occurrence_count bigint,
  percentage numeric,
  sample_queries text[],
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Total zero results in period
  total_zero_results AS (
    SELECT COUNT(*)::numeric as total
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
  ),
  
  -- Pattern 1: Most common failing queries
  common_queries AS (
    SELECT
      'common_query'::text as pattern_type,
      LOWER(TRIM(query)) as pattern_value,
      COUNT(*) as occurrence_count,
      ROUND((COUNT(*)::numeric / NULLIF((SELECT total FROM total_zero_results), 0)) * 100, 2) as percentage,
      ARRAY_AGG(DISTINCT query ORDER BY query LIMIT 5) as sample_queries,
      CASE
        WHEN COUNT(*) >= 5 THEN 'Consider adding these terms to search index or improving fuzzy matching'
        ELSE NULL
      END as recommendation
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY LOWER(TRIM(query))
    HAVING COUNT(*) >= p_min_occurrences
    ORDER BY occurrence_count DESC
    LIMIT 20
  ),
  
  -- Pattern 2: Query length analysis
  length_patterns AS (
    SELECT
      'query_length'::text as pattern_type,
      CASE
        WHEN query_length < 3 THEN 'very_short'
        WHEN query_length < 5 THEN 'short'
        WHEN query_length < 10 THEN 'medium'
        WHEN query_length < 20 THEN 'long'
        ELSE 'very_long'
      END as pattern_value,
      COUNT(*) as occurrence_count,
      ROUND((COUNT(*)::numeric / NULLIF((SELECT total FROM total_zero_results), 0)) * 100, 2) as percentage,
      ARRAY[]::text[] as sample_queries,
      CASE
        WHEN query_length < 3 THEN 'Very short queries (<3 chars) often fail. Consider minimum length requirements or better autocomplete.'
        WHEN query_length < 5 THEN 'Short queries may need better fuzzy matching or prefix search.'
        ELSE NULL
      END as recommendation
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY pattern_value
    HAVING COUNT(*) >= p_min_occurrences
    ORDER BY occurrence_count DESC
  ),
  
  -- Pattern 3: Single word vs multi-word
  word_count_patterns AS (
    SELECT
      'word_count'::text as pattern_type,
      CASE
        WHEN is_single_word THEN 'single_word'
        WHEN query_word_count <= 3 THEN 'few_words'
        ELSE 'many_words'
      END as pattern_value,
      COUNT(*) as occurrence_count,
      ROUND((COUNT(*)::numeric / NULLIF((SELECT total FROM total_zero_results), 0)) * 100, 2) as percentage,
      ARRAY[]::text[] as sample_queries,
      CASE
        WHEN is_single_word THEN 'Single word queries may need better synonym matching or broader search scope.'
        ELSE NULL
      END as recommendation
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY pattern_value
    HAVING COUNT(*) >= p_min_occurrences
    ORDER BY occurrence_count DESC
  ),
  
  -- Pattern 4: Entity type analysis
  entity_type_patterns AS (
    SELECT
      'entity_type'::text as pattern_type,
      unnest(entity_types)::text as pattern_value,
      COUNT(*) as occurrence_count,
      ROUND((COUNT(*)::numeric / NULLIF((SELECT total FROM total_zero_results), 0)) * 100, 2) as percentage,
      ARRAY[]::text[] as sample_queries,
      'Consider improving search indexing or adding more searchable fields for this entity type.' as recommendation
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY pattern_value
    HAVING COUNT(*) >= p_min_occurrences
    ORDER BY occurrence_count DESC
  ),
  
  -- Pattern 5: Common words in failing queries
  common_words AS (
    SELECT
      'common_word'::text as pattern_type,
      unnest(query_words)::text as pattern_value,
      COUNT(*) as occurrence_count,
      ROUND((COUNT(*)::numeric / NULLIF((SELECT total FROM total_zero_results), 0)) * 100, 2) as percentage,
      ARRAY[]::text[] as sample_queries,
      'This word appears frequently in failed searches. Consider adding it to stop words or improving matching.' as recommendation
    FROM zero_results_log
    WHERE tenant_id = p_tenant_id
      AND created_at >= now() - (p_days_back || ' days')::interval
      AND array_length(query_words, 1) > 0
    GROUP BY pattern_value
    HAVING COUNT(*) >= p_min_occurrences
      AND LENGTH(pattern_value) >= 3 -- Ignore very short words
    ORDER BY occurrence_count DESC
    LIMIT 20
  )
  
  -- Combine all patterns
  SELECT * FROM common_queries
  UNION ALL
  SELECT * FROM length_patterns
  UNION ALL
  SELECT * FROM word_count_patterns
  UNION ALL
  SELECT * FROM entity_type_patterns
  UNION ALL
  SELECT * FROM common_words
  ORDER BY occurrence_count DESC;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION analyze_zero_results_patterns TO authenticated;

COMMENT ON TABLE zero_results_log IS 'Logs zero-result searches for analytics and improvement';
COMMENT ON FUNCTION analyze_zero_results_patterns IS 'Analyzes zero-result search patterns to identify improvement opportunities';
