-- Migration: Add foreign key indexes (Phase 2 - Remaining)
-- Addresses: Remaining JOIN and CASCADE performance
-- Impact: 5-10x faster joins on less frequently used relationships

-- Properties relationships
CREATE INDEX IF NOT EXISTS idx_properties_listing_agent_id
  ON public.properties(listing_agent_id)
  WHERE listing_agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_seller_contact_id
  ON public.properties(seller_contact_id)
  WHERE seller_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_address_id
  ON public.properties(address_id)
  WHERE address_id IS NOT NULL;

-- Contacts relationships
CREATE INDEX IF NOT EXISTS idx_contacts_created_by
  ON public.contacts(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_address_id
  ON public.contacts(address_id)
  WHERE address_id IS NOT NULL;

-- Deals relationships (journey tracking)
CREATE INDEX IF NOT EXISTS idx_deals_buyer_user_id
  ON public.deals(buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_seller_user_id
  ON public.deals(seller_user_id)
  WHERE seller_user_id IS NOT NULL;

-- AI agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_created_by
  ON public.ai_agents(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_agents_user_id
  ON public.user_agents(user_id);

CREATE INDEX IF NOT EXISTS idx_user_agents_agent_id
  ON public.user_agents(agent_id);

-- Document projects
CREATE INDEX IF NOT EXISTS idx_document_projects_created_by
  ON public.document_projects(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_project_members_project
  ON public.document_project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_document_project_members_document
  ON public.document_project_members(document_id);

-- Saved properties
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_id
  ON public.saved_properties(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_properties_internal_prop
  ON public.saved_properties(internal_property_id)
  WHERE internal_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saved_properties_external_prop
  ON public.saved_properties(external_property_id)
  WHERE external_property_id IS NOT NULL;

COMMENT ON INDEX idx_properties_listing_agent_id IS
  'FK index for agent property listings';
