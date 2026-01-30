-- Migration: Add GIN indexes for JSONB and array columns
-- Addresses: Tag searches, feature filtering, JSONB containment queries
-- Impact: 10x faster array/JSONB queries

-- Array columns (GIN for containment/overlap operations)
CREATE INDEX IF NOT EXISTS idx_contacts_tags_gin
  ON public.contacts USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_properties_features_gin
  ON public.properties USING GIN (features);

CREATE INDEX IF NOT EXISTS idx_properties_photos_gin
  ON public.properties USING GIN (photos);

CREATE INDEX IF NOT EXISTS idx_profiles_specialties_gin
  ON public.profiles USING GIN (specialties);

CREATE INDEX IF NOT EXISTS idx_profiles_service_areas_gin
  ON public.profiles USING GIN (service_areas);

-- JSONB columns (GIN for containment operations)
CREATE INDEX IF NOT EXISTS idx_contacts_custom_fields_gin
  ON public.contacts USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_external_properties_raw_data_gin
  ON public.external_properties USING GIN (raw_data);

CREATE INDEX IF NOT EXISTS idx_ai_agents_workflow_gin
  ON public.ai_agents USING GIN (workflow);

-- Conditional GIN index (only for rows with metadata)
CREATE INDEX IF NOT EXISTS idx_ai_messages_metadata_gin
  ON public.ai_messages USING GIN (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::jsonb;

COMMENT ON INDEX idx_contacts_tags_gin IS
  'GIN index for tag containment queries (@>, &&, etc.)';
COMMENT ON INDEX idx_contacts_custom_fields_gin IS
  'GIN index for JSONB containment queries on custom fields';
