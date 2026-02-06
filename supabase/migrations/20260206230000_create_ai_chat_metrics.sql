-- ============================================================================
-- AI CHAT METRICS TRACKING SYSTEM
-- Implements metrics tracking for PM-Intelligence North Star Metric:
-- AI Task Completion Rate >90%
-- ============================================================================

-- ============================================================================
-- 1. AI_CHAT_METRICS TABLE
-- Tracks quality metrics for each AI chat response
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Response quality metrics
  response_time_ms INTEGER NOT NULL,
  sources_cited_count INTEGER DEFAULT 0,
  response_length INTEGER NOT NULL,
  
  -- User feedback
  user_feedback TEXT CHECK (user_feedback IN ('positive', 'negative', NULL)),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Ensure one metric per message
  CONSTRAINT unique_message_metric UNIQUE (message_id)
);

-- Add comments
COMMENT ON TABLE public.ai_chat_metrics IS 'Tracks quality metrics for AI chat responses for PM-Intelligence monitoring';
COMMENT ON COLUMN public.ai_chat_metrics.response_time_ms IS 'Time in milliseconds from user message to AI response';
COMMENT ON COLUMN public.ai_chat_metrics.sources_cited_count IS 'Number of source citations in the response';
COMMENT ON COLUMN public.ai_chat_metrics.response_length IS 'Length of response in characters';
COMMENT ON COLUMN public.ai_chat_metrics.user_feedback IS 'User feedback: positive, negative, or NULL';

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_conversation 
  ON public.ai_chat_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_user 
  ON public.ai_chat_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_tenant 
  ON public.ai_chat_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_created_at 
  ON public.ai_chat_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_feedback 
  ON public.ai_chat_metrics(user_feedback) WHERE user_feedback IS NOT NULL;

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE public.ai_chat_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view metrics for their own tenant
CREATE POLICY "Users can view metrics for their tenant"
  ON public.ai_chat_metrics
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert metrics (for automated tracking)
CREATE POLICY "Service role can insert metrics"
  ON public.ai_chat_metrics
  FOR INSERT
  WITH CHECK (true);

-- Users can update feedback on their own metrics
CREATE POLICY "Users can update feedback on their metrics"
  ON public.ai_chat_metrics
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 3. FUNCTION: Get AI chat metrics summary for date range
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_ai_chat_metrics_summary(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_conversations BIGINT,
  total_responses BIGINT,
  avg_response_time_ms NUMERIC,
  avg_sources_per_response NUMERIC,
  avg_response_length NUMERIC,
  positive_feedback_count BIGINT,
  negative_feedback_count BIGINT,
  feedback_rate NUMERIC,
  quality_trend TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default date range: last 30 days
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  WITH metrics_filtered AS (
    SELECT *
    FROM public.ai_chat_metrics
    WHERE created_at >= v_start_date
      AND created_at <= v_end_date
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ),
  summary_stats AS (
    SELECT
      COUNT(DISTINCT conversation_id) AS total_conversations,
      COUNT(*) AS total_responses,
      AVG(response_time_ms) AS avg_response_time_ms,
      AVG(sources_cited_count) AS avg_sources_per_response,
      AVG(response_length) AS avg_response_length,
      COUNT(*) FILTER (WHERE user_feedback = 'positive') AS positive_feedback_count,
      COUNT(*) FILTER (WHERE user_feedback = 'negative') AS negative_feedback_count,
      CASE 
        WHEN COUNT(*) > 0 THEN
          ROUND(100.0 * COUNT(*) FILTER (WHERE user_feedback IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC, 2)
        ELSE 0
      END AS feedback_rate
    FROM metrics_filtered
  ),
  trend_analysis AS (
    SELECT
      CASE
        WHEN COUNT(*) < 2 THEN 'stable'
        ELSE
          CASE
            WHEN AVG(CASE WHEN created_at >= v_start_date + (v_end_date - v_start_date) / 2 
                      THEN sources_cited_count ELSE NULL END) >
                 AVG(CASE WHEN created_at < v_start_date + (v_end_date - v_start_date) / 2 
                      THEN sources_cited_count ELSE NULL END) * 1.1
            THEN 'improving'
            WHEN AVG(CASE WHEN created_at >= v_start_date + (v_end_date - v_start_date) / 2 
                      THEN sources_cited_count ELSE NULL END) <
                 AVG(CASE WHEN created_at < v_start_date + (v_end_date - v_start_date) / 2 
                      THEN sources_cited_count ELSE NULL END) * 0.9
            THEN 'declining'
            ELSE 'stable'
          END
      END AS quality_trend
    FROM metrics_filtered
  )
  SELECT
    ss.total_conversations,
    ss.total_responses,
    ROUND(ss.avg_response_time_ms, 2),
    ROUND(ss.avg_sources_per_response, 2),
    ROUND(ss.avg_response_length, 2),
    ss.positive_feedback_count,
    ss.negative_feedback_count,
    ss.feedback_rate,
    ta.quality_trend
  FROM summary_stats ss
  CROSS JOIN trend_analysis ta;
END;
$$;

COMMENT ON FUNCTION public.get_ai_chat_metrics_summary IS 'Get AI chat metrics summary for a date range and optional tenant';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_ai_chat_metrics_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_chat_metrics_summary(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO service_role;
