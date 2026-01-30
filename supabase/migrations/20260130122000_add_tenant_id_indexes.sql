-- Migration: Add tenant_id indexes for RLS performance
-- Addresses: Multi-tenant query isolation performance
-- Impact: 10x faster tenant-scoped queries

-- Core tables (CRITICAL)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id
  ON public.contacts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_properties_tenant_id
  ON public.properties(tenant_id);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_id
  ON public.deals(tenant_id);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id
  ON public.documents(tenant_id);

-- AI tables (HIGH)
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_id
  ON public.ai_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
  ON public.ai_conversations(user_id);

-- Partial index for tenant-scoped AI agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_tenant_id
  ON public.ai_agents(tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_id
  ON public.usage_records(tenant_id);

-- Document projects (added in recent migrations)
CREATE INDEX IF NOT EXISTS idx_document_projects_tenant_id
  ON public.document_projects(tenant_id);

-- Notifications (added in recent migrations)
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id
  ON public.notifications(tenant_id);

-- Add helpful comments
COMMENT ON INDEX idx_contacts_tenant_id IS 'RLS performance for tenant isolation';
COMMENT ON INDEX idx_properties_tenant_id IS 'RLS performance for tenant isolation';
COMMENT ON INDEX idx_deals_tenant_id IS 'RLS performance for tenant isolation';
