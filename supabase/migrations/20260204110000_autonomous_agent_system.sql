-- Autonomous Agent System Migration
-- Adds support for event-triggered agents that can take actions

-- ============================================================================
-- PHASE 1: Action Framework Tables
-- ============================================================================

-- Agent Actions: Defines what actions an agent can take
CREATE TABLE public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  
  -- Action definition
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_contact', 'update_contact',
    'create_deal', 'move_deal_stage',
    'send_email', 'add_note',
    'schedule_task', 'enroll_drip',
    'notify_user', 'assign_tags'
  )),
  action_config JSONB DEFAULT '{}', -- Static config for this action
  
  -- Execution order (for multi-step workflows)
  step_order INTEGER DEFAULT 1,
  
  -- Conditions (when this action should execute)
  condition_expression TEXT, -- e.g., "result.sentiment == 'positive'"
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action Queue: Tracks pending and executed actions
CREATE TABLE public.action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Action details
  action_type TEXT NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}', -- Parameters for the action
  action_reason TEXT, -- Why the agent recommended this action
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'executing', 'completed', 'failed', 'rejected', 'cancelled'
  )),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  
  -- Approval workflow
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Execution tracking
  executed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- PHASE 3: Event Trigger System Tables
-- ============================================================================

-- Agent Triggers: Defines when agents should be triggered
CREATE TABLE public.agent_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  
  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'contact_created', 'contact_updated',
    'deal_created', 'deal_stage_changed', 'deal_updated',
    'document_uploaded', 'document_indexed',
    'property_created', 'property_updated',
    'email_received', 'scheduled', 'manual'
  )),
  trigger_conditions JSONB DEFAULT '{}', -- Filters: {"contact_type": "lead", "stage_to": "under_contract"}
  
  -- Scheduling (for scheduled triggers)
  schedule_cron TEXT, -- Cron expression: "0 9 * * 1" (Mondays at 9am)
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Execution settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1-10, higher = more important
  max_retries INTEGER DEFAULT 3,
  
  -- Context configuration (what data to pass to agent)
  context_config JSONB DEFAULT '{}', -- Additional context to include
  
  -- Metadata
  name TEXT, -- Optional friendly name for the trigger
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Events: Event log for debugging/audit
CREATE TABLE public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}', -- Full event payload
  source_table TEXT,
  source_id UUID,
  
  -- Processing status
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  matched_triggers UUID[] DEFAULT '{}', -- Array of trigger IDs that matched
  
  -- Error tracking
  processing_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- agent_actions indexes
CREATE INDEX idx_agent_actions_agent_id ON public.agent_actions(agent_id);
CREATE INDEX idx_agent_actions_action_type ON public.agent_actions(action_type);

-- action_queue indexes
CREATE INDEX idx_action_queue_tenant_id ON public.action_queue(tenant_id);
CREATE INDEX idx_action_queue_user_id ON public.action_queue(user_id);
CREATE INDEX idx_action_queue_status ON public.action_queue(status);
CREATE INDEX idx_action_queue_agent_run_id ON public.action_queue(agent_run_id);
CREATE INDEX idx_action_queue_pending ON public.action_queue(tenant_id, status) 
  WHERE status = 'pending';
CREATE INDEX idx_action_queue_requires_approval ON public.action_queue(tenant_id, requires_approval, status) 
  WHERE requires_approval = true AND status = 'pending';

-- agent_triggers indexes
CREATE INDEX idx_agent_triggers_tenant_id ON public.agent_triggers(tenant_id);
CREATE INDEX idx_agent_triggers_agent_id ON public.agent_triggers(agent_id);
CREATE INDEX idx_agent_triggers_trigger_type ON public.agent_triggers(trigger_type);
CREATE INDEX idx_agent_triggers_active ON public.agent_triggers(tenant_id, trigger_type, is_active) 
  WHERE is_active = true;
CREATE INDEX idx_agent_triggers_scheduled ON public.agent_triggers(next_run_at) 
  WHERE trigger_type = 'scheduled' AND is_active = true;

-- agent_events indexes
CREATE INDEX idx_agent_events_tenant_id ON public.agent_events(tenant_id);
CREATE INDEX idx_agent_events_unprocessed ON public.agent_events(tenant_id, processed, created_at) 
  WHERE processed = false;
CREATE INDEX idx_agent_events_event_type ON public.agent_events(event_type);
CREATE INDEX idx_agent_events_source ON public.agent_events(source_table, source_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

-- agent_actions RLS (tied to agent ownership)
CREATE POLICY "Users can view actions for accessible agents"
  ON public.agent_actions FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents 
      WHERE is_public = true 
        OR tenant_id IS NULL 
        OR tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Users can manage actions for their agents"
  ON public.agent_actions FOR ALL
  USING (
    agent_id IN (
      SELECT id FROM public.ai_agents WHERE created_by = auth.uid()
    )
  );

-- action_queue RLS
CREATE POLICY "Users can view action queue in their tenant"
  ON public.action_queue FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert to action queue in their tenant"
  ON public.action_queue FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update action queue items they own or are admin"
  ON public.action_queue FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid()) 
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete action queue items they own"
  ON public.action_queue FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND user_id = auth.uid());

-- agent_triggers RLS
CREATE POLICY "Users can view triggers in their tenant"
  ON public.agent_triggers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert triggers in their tenant"
  ON public.agent_triggers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update triggers in their tenant"
  ON public.agent_triggers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete triggers in their tenant"
  ON public.agent_triggers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- agent_events RLS
CREATE POLICY "Users can view events in their tenant"
  ON public.agent_events FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Service role needs full access for event processing
CREATE POLICY "Service role can manage all events"
  ON public.agent_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all action queue items"
  ON public.action_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_action_queue_updated_at 
  BEFORE UPDATE ON public.action_queue 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_triggers_updated_at 
  BEFORE UPDATE ON public.agent_triggers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- EVENT LOGGING FUNCTION
-- ============================================================================

-- Function to log events to agent_events table
CREATE OR REPLACE FUNCTION public.log_agent_event()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_event_type TEXT;
BEGIN
  -- Get tenant_id from the record
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  
  -- Get event type from trigger argument
  v_event_type := TG_ARGV[0];
  
  -- Skip if no tenant_id (shouldn't happen but safety check)
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Insert event with error handling
  BEGIN
    INSERT INTO public.agent_events (
      tenant_id,
      event_type,
      event_data,
      source_table,
      source_id
    ) VALUES (
      v_tenant_id,
      v_event_type,
      CASE 
        WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
        WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
        ELSE to_jsonb(NEW)
      END,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Failed to log agent event: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- DATABASE TRIGGERS FOR EVENT LOGGING
-- ============================================================================

-- Contact events
CREATE TRIGGER log_contact_created
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_event('contact_created');

CREATE TRIGGER log_contact_updated
  AFTER UPDATE ON public.contacts
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_agent_event('contact_updated');

-- Deal events
CREATE TRIGGER log_deal_created
  AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_event('deal_created');

CREATE TRIGGER log_deal_stage_changed
  AFTER UPDATE OF stage ON public.deals
  FOR EACH ROW 
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION public.log_agent_event('deal_stage_changed');

CREATE TRIGGER log_deal_updated
  AFTER UPDATE ON public.deals
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.* AND OLD.stage IS NOT DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION public.log_agent_event('deal_updated');

-- Document events
CREATE TRIGGER log_document_uploaded
  AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_event('document_uploaded');

CREATE TRIGGER log_document_indexed
  AFTER UPDATE OF indexed_at ON public.documents
  FOR EACH ROW 
  WHEN (OLD.indexed_at IS NULL AND NEW.indexed_at IS NOT NULL)
  EXECUTE FUNCTION public.log_agent_event('document_indexed');

-- Property events
CREATE TRIGGER log_property_created
  AFTER INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_agent_event('property_created');

CREATE TRIGGER log_property_updated
  AFTER UPDATE ON public.properties
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.log_agent_event('property_updated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get pending actions count for a user
CREATE OR REPLACE FUNCTION public.get_pending_actions_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.action_queue
  WHERE tenant_id = public.get_user_tenant_id(p_user_id)
    AND status = 'pending'
    AND requires_approval = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to approve an action
CREATE OR REPLACE FUNCTION public.approve_action(p_action_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.action_queue
  SET 
    status = 'approved',
    approved_by = p_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_action_id
    AND status = 'pending'
    AND tenant_id = public.get_user_tenant_id(p_user_id);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to reject an action
CREATE OR REPLACE FUNCTION public.reject_action(p_action_id UUID, p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.action_queue
  SET 
    status = 'rejected',
    approved_by = p_user_id,
    approved_at = now(),
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_action_id
    AND status = 'pending'
    AND tenant_id = public.get_user_tenant_id(p_user_id);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to batch approve actions
CREATE OR REPLACE FUNCTION public.batch_approve_actions(p_action_ids UUID[], p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE public.action_queue
  SET 
    status = 'approved',
    approved_by = p_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = ANY(p_action_ids)
    AND status = 'pending'
    AND tenant_id = public.get_user_tenant_id(p_user_id);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.agent_actions IS 'Defines the actions that an agent can take when executed';
COMMENT ON TABLE public.action_queue IS 'Queue of pending, approved, and completed agent actions';
COMMENT ON TABLE public.agent_triggers IS 'Defines when agents should be automatically triggered';
COMMENT ON TABLE public.agent_events IS 'Event log for tracking system events that can trigger agents';

COMMENT ON COLUMN public.agent_triggers.trigger_conditions IS 'JSONB conditions that must match the event data for the trigger to fire';
COMMENT ON COLUMN public.agent_triggers.schedule_cron IS 'Cron expression for scheduled triggers (e.g., "0 9 * * 1" for Mondays at 9am)';
COMMENT ON COLUMN public.action_queue.requires_approval IS 'If true, action waits in pending status until approved by user';
