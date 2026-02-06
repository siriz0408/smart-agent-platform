-- Migration: Add stalled deal detection function
-- Part of TRX-004: Implement stalled deal detection
-- A deal is considered stalled if there's been no activity for >48 hours
-- Activity includes: deal updates, milestone completions, document uploads

-- Function to check if a deal is stalled (single deal)
-- Returns true if the most recent activity (deal update, milestone completion, or document upload) 
-- was more than 48 hours ago
CREATE OR REPLACE FUNCTION public.is_deal_stalled(p_deal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_activity TIMESTAMP WITH TIME ZONE;
  v_deal_updated TIMESTAMP WITH TIME ZONE;
  v_last_milestone TIMESTAMP WITH TIME ZONE;
  v_last_document TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get deal's updated_at
  SELECT updated_at INTO v_deal_updated
  FROM public.deals
  WHERE id = p_deal_id;

  -- Get most recent milestone completion
  SELECT MAX(completed_at) INTO v_last_milestone
  FROM public.deal_milestones
  WHERE deal_id = p_deal_id AND completed_at IS NOT NULL;

  -- Get most recent document upload for this deal
  SELECT MAX(created_at) INTO v_last_document
  FROM public.documents
  WHERE deal_id = p_deal_id;

  -- Find the most recent activity across all three sources
  v_last_activity := GREATEST(
    COALESCE(v_deal_updated, '1970-01-01'::TIMESTAMP WITH TIME ZONE),
    COALESCE(v_last_milestone, '1970-01-01'::TIMESTAMP WITH TIME ZONE),
    COALESCE(v_last_document, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );

  -- Deal is stalled if last activity was more than 48 hours ago
  -- Exclude closed and lost deals from stalled detection
  RETURN (
    v_last_activity < NOW() - INTERVAL '48 hours' AND
    EXISTS (
      SELECT 1 FROM public.deals
      WHERE id = p_deal_id
      AND stage NOT IN ('closed', 'lost')
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get stalled status for multiple deals (more efficient)
-- Returns a table of deal_id and is_stalled boolean
CREATE OR REPLACE FUNCTION public.get_stalled_deals(p_deal_ids UUID[])
RETURNS TABLE(deal_id UUID, is_stalled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  WITH deal_activities AS (
    SELECT 
      d.id AS deal_id,
      GREATEST(
        COALESCE(d.updated_at, '1970-01-01'::TIMESTAMP WITH TIME ZONE),
        COALESCE(
          (SELECT MAX(completed_at) FROM public.deal_milestones 
           WHERE deal_id = d.id AND completed_at IS NOT NULL),
          '1970-01-01'::TIMESTAMP WITH TIME ZONE
        ),
        COALESCE(
          (SELECT MAX(created_at) FROM public.documents 
           WHERE deal_id = d.id),
          '1970-01-01'::TIMESTAMP WITH TIME ZONE
        )
      ) AS last_activity
    FROM public.deals d
    WHERE d.id = ANY(p_deal_ids)
      AND d.stage NOT IN ('closed', 'lost')
  )
  SELECT 
    da.deal_id,
    (da.last_activity < NOW() - INTERVAL '48 hours') AS is_stalled
  FROM deal_activities da;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION public.is_deal_stalled(UUID) IS 
'Returns true if a deal has had no activity (updates, milestone completions, or document uploads) for more than 48 hours. Excludes closed and lost deals.';

COMMENT ON FUNCTION public.get_stalled_deals(UUID[]) IS 
'Returns stalled status for multiple deals efficiently. Returns table with deal_id and is_stalled boolean.';

-- Create index to optimize queries for stalled deal detection
CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_completed 
ON public.deal_milestones(deal_id, completed_at) 
WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_deal_created 
ON public.documents(deal_id, created_at);
