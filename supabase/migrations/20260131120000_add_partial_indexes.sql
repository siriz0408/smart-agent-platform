-- Migration: Add partial indexes for common filter patterns
-- Addresses: Status filtering, boolean flags, nullable FK queries
-- Impact: 5-10x faster filtered queries

-- Status-based partial indexes
CREATE INDEX IF NOT EXISTS idx_contacts_active
  ON public.contacts(tenant_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_properties_active
  ON public.properties(tenant_id, status)
  WHERE status IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_deals_active
  ON public.deals(tenant_id, stage)
  WHERE stage NOT IN ('closed', 'lost');

-- Boolean flag partial indexes
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_ai_agents_public
  ON public.ai_agents(category, usage_count DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_ai_agents_certified
  ON public.ai_agents(category, usage_count DESC)
  WHERE is_certified = true;

-- Nullable FK partial indexes (for queries that filter out NULLs)
CREATE INDEX IF NOT EXISTS idx_documents_with_property
  ON public.documents(tenant_id, property_id, created_at DESC)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_with_deal
  ON public.documents(tenant_id, deal_id, created_at DESC)
  WHERE deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_indexed
  ON public.documents(tenant_id, indexed_at DESC)
  WHERE indexed_at IS NOT NULL;

COMMENT ON INDEX idx_contacts_active IS
  'Partial index for active contacts (most common filter)';
COMMENT ON INDEX idx_notifications_unread IS
  'Partial index for unread notifications (inbox queries)';
