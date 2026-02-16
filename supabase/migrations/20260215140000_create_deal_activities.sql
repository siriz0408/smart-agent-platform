-- Migration: Create deal_activities table for comprehensive activity logging
-- Part of TRX-012: Enhanced Activity Logging
-- This table provides a complete audit trail of all deal-related activities

-- Create deal_activities table
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created',           -- Deal was created
    'stage_changed',     -- Deal moved to a new stage
    'note_added',        -- A note was added to the deal
    'milestone_created', -- A new milestone was added
    'milestone_completed', -- A milestone was marked complete
    'document_uploaded', -- A document was uploaded to the deal
    'field_updated'      -- A deal field was updated (e.g., price, dates)
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX idx_deal_activities_tenant_id ON public.deal_activities(tenant_id);
CREATE INDEX idx_deal_activities_created_at ON public.deal_activities(created_at DESC);
CREATE INDEX idx_deal_activities_activity_type ON public.deal_activities(activity_type);
CREATE INDEX idx_deal_activities_deal_created ON public.deal_activities(deal_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenant isolation
CREATE POLICY "Users can view activities for their tenant's deals"
  ON public.deal_activities
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activities for their tenant's deals"
  ON public.deal_activities
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.deal_activities IS 'Comprehensive activity log for deal timeline, tracking all changes including stage transitions, notes, milestones, and document uploads.';
COMMENT ON COLUMN public.deal_activities.activity_type IS 'Type of activity: created, stage_changed, note_added, milestone_created, milestone_completed, document_uploaded, field_updated';
COMMENT ON COLUMN public.deal_activities.metadata IS 'Activity-specific data like old_stage, new_stage for stage changes, or milestone_id for milestone events';
COMMENT ON COLUMN public.deal_activities.created_by IS 'User who performed the action (null for system-generated activities)';

-- Create a function to log deal creation (trigger on deals insert)
CREATE OR REPLACE FUNCTION public.log_deal_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deal_activities (
    deal_id,
    tenant_id,
    activity_type,
    title,
    description,
    metadata,
    created_by
  ) VALUES (
    NEW.id,
    NEW.tenant_id,
    'created',
    'Deal created',
    'New ' || NEW.deal_type || ' deal created',
    jsonb_build_object(
      'deal_type', NEW.deal_type,
      'stage', NEW.stage,
      'estimated_value', NEW.estimated_value
    ),
    NEW.agent_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deal creation
DROP TRIGGER IF EXISTS trigger_log_deal_created ON public.deals;
CREATE TRIGGER trigger_log_deal_created
  AFTER INSERT ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_deal_created();

-- Create a function to log milestone creation
CREATE OR REPLACE FUNCTION public.log_milestone_created()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the deal
  SELECT tenant_id INTO v_tenant_id
  FROM public.deals
  WHERE id = NEW.deal_id;

  INSERT INTO public.deal_activities (
    deal_id,
    tenant_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    NEW.deal_id,
    v_tenant_id,
    'milestone_created',
    'Milestone added: ' || NEW.title,
    CASE
      WHEN NEW.due_date IS NOT NULL THEN 'Due ' || to_char(NEW.due_date, 'Mon DD, YYYY')
      ELSE NULL
    END,
    jsonb_build_object(
      'milestone_id', NEW.id,
      'milestone_title', NEW.title,
      'due_date', NEW.due_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for milestone creation
DROP TRIGGER IF EXISTS trigger_log_milestone_created ON public.deal_milestones;
CREATE TRIGGER trigger_log_milestone_created
  AFTER INSERT ON public.deal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.log_milestone_created();

-- Create a function to log milestone completion
CREATE OR REPLACE FUNCTION public.log_milestone_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Only log when completed_at changes from NULL to a value
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
    -- Get tenant_id from the deal
    SELECT tenant_id INTO v_tenant_id
    FROM public.deals
    WHERE id = NEW.deal_id;

    INSERT INTO public.deal_activities (
      deal_id,
      tenant_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.deal_id,
      v_tenant_id,
      'milestone_completed',
      'Milestone completed: ' || NEW.title,
      'Completed on ' || to_char(NEW.completed_at, 'Mon DD, YYYY'),
      jsonb_build_object(
        'milestone_id', NEW.id,
        'milestone_title', NEW.title,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for milestone completion
DROP TRIGGER IF EXISTS trigger_log_milestone_completed ON public.deal_milestones;
CREATE TRIGGER trigger_log_milestone_completed
  AFTER UPDATE OF completed_at ON public.deal_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.log_milestone_completed();

-- Create a function to log document uploads (for documents linked to deals)
CREATE OR REPLACE FUNCTION public.log_document_uploaded_to_deal()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Only log if document has a deal_id
  IF NEW.deal_id IS NOT NULL THEN
    -- Get tenant_id from the deal (or use document's tenant_id if available)
    SELECT COALESCE(d.tenant_id, NEW.tenant_id) INTO v_tenant_id
    FROM public.deals d
    WHERE d.id = NEW.deal_id;

    IF v_tenant_id IS NOT NULL THEN
      INSERT INTO public.deal_activities (
        deal_id,
        tenant_id,
        activity_type,
        title,
        description,
        metadata
      ) VALUES (
        NEW.deal_id,
        v_tenant_id,
        'document_uploaded',
        'Document uploaded: ' || NEW.filename,
        CASE
          WHEN NEW.document_type IS NOT NULL THEN 'Type: ' || NEW.document_type
          ELSE NULL
        END,
        jsonb_build_object(
          'document_id', NEW.id,
          'filename', NEW.filename,
          'document_type', NEW.document_type,
          'file_size', NEW.file_size
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document uploads
DROP TRIGGER IF EXISTS trigger_log_document_uploaded_to_deal ON public.documents;
CREATE TRIGGER trigger_log_document_uploaded_to_deal
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_document_uploaded_to_deal();

-- Backfill existing deals with 'created' activity
-- This ensures existing deals have at least one activity entry
INSERT INTO public.deal_activities (deal_id, tenant_id, activity_type, title, description, metadata, created_at, created_by)
SELECT
  d.id,
  d.tenant_id,
  'created',
  'Deal created',
  'New ' || d.deal_type || ' deal created (backfilled)',
  jsonb_build_object(
    'deal_type', d.deal_type,
    'stage', d.stage,
    'estimated_value', d.estimated_value,
    'backfilled', true
  ),
  d.created_at,
  d.agent_id
FROM public.deals d
WHERE NOT EXISTS (
  SELECT 1 FROM public.deal_activities da
  WHERE da.deal_id = d.id AND da.activity_type = 'created'
);

-- Backfill completed milestones
INSERT INTO public.deal_activities (deal_id, tenant_id, activity_type, title, description, metadata, created_at)
SELECT
  dm.deal_id,
  d.tenant_id,
  'milestone_completed',
  'Milestone completed: ' || dm.title,
  'Completed on ' || to_char(dm.completed_at, 'Mon DD, YYYY') || ' (backfilled)',
  jsonb_build_object(
    'milestone_id', dm.id,
    'milestone_title', dm.title,
    'completed_at', dm.completed_at,
    'backfilled', true
  ),
  dm.completed_at
FROM public.deal_milestones dm
JOIN public.deals d ON d.id = dm.deal_id
WHERE dm.completed_at IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.deal_activities da
  WHERE da.deal_id = dm.deal_id
  AND da.activity_type = 'milestone_completed'
  AND da.metadata->>'milestone_id' = dm.id::text
);
