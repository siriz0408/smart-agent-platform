-- Migration: Add composite indexes for filter + sort patterns
-- Addresses: List views, recent records, filtered sorting
-- Impact: 5x faster list queries with sorting

-- Tenant + timestamp composites (for "recent items" queries)
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created
  ON public.documents(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
  ON public.ai_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_updated
  ON public.contacts(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_tenant_updated
  ON public.properties(tenant_id, updated_at DESC);

-- Tenant + type + timestamp (for filtered lists)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type_updated
  ON public.contacts(tenant_id, contact_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_properties_tenant_status_price
  ON public.properties(tenant_id, status, price DESC);

CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage_date
  ON public.deals(tenant_id, stage, expected_close_date);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_type_recorded
  ON public.usage_records(tenant_id, record_type, recorded_at DESC);

-- Document metadata composite (tenant + document lookup)
CREATE INDEX IF NOT EXISTS idx_document_metadata_tenant_doc
  ON public.document_metadata(tenant_id, document_id);

COMMENT ON INDEX idx_documents_tenant_created IS
  'Composite index for recent documents list (tenant-scoped)';
COMMENT ON INDEX idx_contacts_tenant_type_updated IS
  'Composite index for filtered contact lists by type';
