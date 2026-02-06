-- ============================================================================
-- MESSAGE METRICS TRACKING SYSTEM
-- Implements metrics tracking for PM-Communication North Star Metric:
-- Response Time <4hr (target: >80%)
-- ============================================================================

-- ============================================================================
-- 1. MESSAGE_METRICS TABLE
-- Tracks response times and other messaging metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Response time tracking
  -- For messages that are responses, this tracks time since previous message
  response_time_seconds INTEGER, -- NULL if this is the first message in conversation
  responded_within_4hr BOOLEAN, -- TRUE if response_time_seconds <= 14400 (4 hours)
  
  -- Message metadata
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Indexes for performance
  CONSTRAINT unique_message_metric UNIQUE (message_id)
);

-- Add comments
COMMENT ON TABLE public.message_metrics IS 'Tracks messaging metrics including response times for North Star Metric';
COMMENT ON COLUMN public.message_metrics.response_time_seconds IS 'Time in seconds since previous message in conversation (NULL for first message)';
COMMENT ON COLUMN public.message_metrics.responded_within_4hr IS 'TRUE if response was sent within 4 hours (14400 seconds)';

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_message_metrics_conversation 
  ON public.message_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_metrics_sender 
  ON public.message_metrics(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_metrics_sent_at 
  ON public.message_metrics(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_metrics_response_time 
  ON public.message_metrics(responded_within_4hr, sent_at DESC);

-- ============================================================================
-- 2. FUNCTION: Calculate response time for a new message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_message_response_time()
RETURNS TRIGGER AS $$
DECLARE
  prev_message_sent_at TIMESTAMP WITH TIME ZONE;
  response_time_sec INTEGER;
  within_4hr BOOLEAN;
BEGIN
  -- Get the previous message in this conversation (excluding system messages)
  SELECT sent_at INTO prev_message_sent_at
  FROM public.messages
  WHERE conversation_id = NEW.conversation_id
    AND id != NEW.id
    AND message_type != 'system'
    AND is_deleted = false
  ORDER BY sent_at DESC
  LIMIT 1;

  -- Calculate response time if there was a previous message
  IF prev_message_sent_at IS NOT NULL THEN
    response_time_sec := EXTRACT(EPOCH FROM (NEW.sent_at - prev_message_sent_at))::INTEGER;
    within_4hr := response_time_sec <= 14400; -- 4 hours = 14400 seconds
  ELSE
    -- First message in conversation, no response time
    response_time_sec := NULL;
    within_4hr := NULL;
  END IF;

  -- Insert metric record
  INSERT INTO public.message_metrics (
    conversation_id,
    message_id,
    sender_id,
    response_time_seconds,
    responded_within_4hr,
    sent_at
  ) VALUES (
    NEW.conversation_id,
    NEW.id,
    NEW.sender_id,
    response_time_sec,
    within_4hr,
    NEW.sent_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.calculate_message_response_time IS 'Calculates response time for new messages and stores in message_metrics';

-- ============================================================================
-- 3. TRIGGER: Auto-calculate metrics on message insert
-- ============================================================================

CREATE TRIGGER calculate_message_metrics
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.message_type != 'system' AND NEW.is_deleted = false)
  EXECUTE FUNCTION public.calculate_message_response_time();

-- ============================================================================
-- 4. VIEW: Response time metrics summary
-- ============================================================================

CREATE OR REPLACE VIEW public.message_response_metrics AS
SELECT 
  tenant_id,
  DATE_TRUNC('day', sent_at) AS metric_date,
  COUNT(*) FILTER (WHERE responded_within_4hr = true) AS responded_within_4hr_count,
  COUNT(*) FILTER (WHERE responded_within_4hr = false) AS responded_over_4hr_count,
  COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) AS total_responses,
  CASE 
    WHEN COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) > 0 THEN
      ROUND(
        100.0 * COUNT(*) FILTER (WHERE responded_within_4hr = true)::NUMERIC / 
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL)::NUMERIC,
        2
      )
    ELSE NULL
  END AS response_rate_within_4hr_percent,
  AVG(response_time_seconds) FILTER (WHERE response_time_seconds IS NOT NULL) AS avg_response_time_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds) FILTER (WHERE response_time_seconds IS NOT NULL) AS median_response_time_seconds
FROM public.message_metrics mm
JOIN public.conversations c ON mm.conversation_id = c.id
WHERE response_time_seconds IS NOT NULL
GROUP BY tenant_id, DATE_TRUNC('day', sent_at);

COMMENT ON VIEW public.message_response_metrics IS 'Daily summary of response time metrics per tenant';

-- ============================================================================
-- 5. FUNCTION: Get response time metrics for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_message_metrics(
  p_tenant_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  metric_date DATE,
  responded_within_4hr_count BIGINT,
  responded_over_4hr_count BIGINT,
  total_responses BIGINT,
  response_rate_within_4hr_percent NUMERIC,
  avg_response_time_seconds NUMERIC,
  median_response_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', mm.sent_at)::DATE AS metric_date,
    COUNT(*) FILTER (WHERE mm.responded_within_4hr = true) AS responded_within_4hr_count,
    COUNT(*) FILTER (WHERE mm.responded_within_4hr = false) AS responded_over_4hr_count,
    COUNT(*) FILTER (WHERE mm.response_time_seconds IS NOT NULL) AS total_responses,
    CASE 
      WHEN COUNT(*) FILTER (WHERE mm.response_time_seconds IS NOT NULL) > 0 THEN
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE mm.responded_within_4hr = true)::NUMERIC / 
          COUNT(*) FILTER (WHERE mm.response_time_seconds IS NOT NULL)::NUMERIC,
          2
        )
      ELSE NULL
    END AS response_rate_within_4hr_percent,
    AVG(mm.response_time_seconds) FILTER (WHERE mm.response_time_seconds IS NOT NULL) AS avg_response_time_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY mm.response_time_seconds) FILTER (WHERE mm.response_time_seconds IS NOT NULL) AS median_response_time_seconds
  FROM public.message_metrics mm
  JOIN public.conversations c ON mm.conversation_id = c.id
  WHERE c.tenant_id = p_tenant_id
    AND mm.response_time_seconds IS NOT NULL
    AND (p_start_date IS NULL OR mm.sent_at >= p_start_date)
    AND (p_end_date IS NULL OR mm.sent_at <= p_end_date)
  GROUP BY DATE_TRUNC('day', mm.sent_at)
  ORDER BY metric_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_message_metrics IS 'Get response time metrics for a tenant within a date range';

-- ============================================================================
-- 6. FUNCTION: Get overall response rate (North Star Metric)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_response_rate_within_4hr(
  p_tenant_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_responses BIGINT,
  responded_within_4hr BIGINT,
  response_rate_percent NUMERIC,
  target_met BOOLEAN
) AS $$
DECLARE
  total BIGINT;
  within_4hr BIGINT;
  rate NUMERIC;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE mm.response_time_seconds IS NOT NULL),
    COUNT(*) FILTER (WHERE mm.responded_within_4hr = true)
  INTO total, within_4hr
  FROM public.message_metrics mm
  JOIN public.conversations c ON mm.conversation_id = c.id
  WHERE c.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR mm.sent_at >= p_start_date)
    AND (p_end_date IS NULL OR mm.sent_at <= p_end_date);

  IF total > 0 THEN
    rate := ROUND(100.0 * within_4hr::NUMERIC / total::NUMERIC, 2);
  ELSE
    rate := NULL;
  END IF;

  RETURN QUERY SELECT 
    total,
    within_4hr,
    rate,
    rate >= 80.0; -- Target: >80%
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_response_rate_within_4hr IS 'Get overall response rate within 4hr for North Star Metric (target: >80%)';

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.message_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Users can view metrics for conversations they participate in
CREATE POLICY "Users can view metrics for their conversations"
  ON public.message_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = message_metrics.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can view metrics for their tenant (for dashboard)
CREATE POLICY "Users can view tenant metrics"
  ON public.message_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.profiles p ON c.tenant_id = p.tenant_id
      WHERE c.id = message_metrics.conversation_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. BACKFILL: Calculate metrics for existing messages
-- ============================================================================

-- Backfill metrics for existing messages (only run once)
INSERT INTO public.message_metrics (
  conversation_id,
  message_id,
  sender_id,
  response_time_seconds,
  responded_within_4hr,
  sent_at
)
SELECT 
  m.conversation_id,
  m.id AS message_id,
  m.sender_id,
  CASE 
    WHEN prev.sent_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (m.sent_at - prev.sent_at))::INTEGER
    ELSE NULL
  END AS response_time_seconds,
  CASE 
    WHEN prev.sent_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (m.sent_at - prev.sent_at)) <= 14400
    ELSE NULL
  END AS responded_within_4hr,
  m.sent_at
FROM public.messages m
LEFT JOIN LATERAL (
  SELECT sent_at
  FROM public.messages prev_msg
  WHERE prev_msg.conversation_id = m.conversation_id
    AND prev_msg.id != m.id
    AND prev_msg.message_type != 'system'
    AND prev_msg.is_deleted = false
    AND prev_msg.sent_at < m.sent_at
  ORDER BY prev_msg.sent_at DESC
  LIMIT 1
) prev ON true
WHERE m.message_type != 'system'
  AND m.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM public.message_metrics mm WHERE mm.message_id = m.id
  )
ON CONFLICT (message_id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Message metrics tracking system created successfully' AS status;
