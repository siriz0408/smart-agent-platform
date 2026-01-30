-- Migration: Add foreign key indexes (Phase 1 - Most Critical)
-- Addresses: JOIN performance and CASCADE delete performance
-- Impact: 10x faster joins on frequently accessed relationships

-- Document relationships (CRITICAL - used in every RAG query)
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON public.document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_documents_property_id
  ON public.documents(property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_deal_id
  ON public.documents(deal_id)
  WHERE deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_contact_id
  ON public.documents(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by
  ON public.documents(uploaded_by);

-- AI conversation relationships (HIGH)
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id
  ON public.ai_messages(conversation_id);

-- CRM relationships (HIGH)
CREATE INDEX IF NOT EXISTS idx_contact_agents_contact_id
  ON public.contact_agents(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_agents_agent_user_id
  ON public.contact_agents(agent_user_id);

CREATE INDEX IF NOT EXISTS idx_deals_property_id
  ON public.deals(property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_contact_id
  ON public.deals(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_agent_id
  ON public.deals(agent_id)
  WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_id
  ON public.deal_milestones(deal_id);

-- User & profile relationships (MEDIUM)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id
  ON public.profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id
  ON public.user_roles(tenant_id);

COMMENT ON INDEX idx_document_chunks_document_id IS
  'FK index for document chunk joins and CASCADE deletes';
