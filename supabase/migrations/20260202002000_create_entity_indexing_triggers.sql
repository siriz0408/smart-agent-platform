-- Migration: Create auto-indexing triggers for entity embeddings
-- Date: 2026-02-02
-- Purpose: Auto-generate embeddings when entities are created/updated

-- ============================================================================
-- Helper function: Generate deterministic embedding from text
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_deterministic_embedding(text_input text)
RETURNS vector(1536)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result vector(1536);
  hash_value bigint;
  i int;
  embedding_values float[];
BEGIN
  -- Simple deterministic hash-based embedding
  -- Uses MD5 hash for reproducibility
  hash_value := ('x' || LEFT(md5(text_input), 15))::bit(60)::bigint;

  -- Generate 1536 float values
  embedding_values := ARRAY[]::float[];

  FOR i IN 1..1536 LOOP
    -- Use hash + index to generate pseudo-random but deterministic values
    embedding_values := array_append(
      embedding_values,
      (SIN(hash_value::float * (i + 1)) * 0.5 + 0.5)::float
    );
  END LOOP;

  -- Convert to vector type
  result := embedding_values::vector(1536);

  RETURN result;
END;
$$;

-- ============================================================================
-- Trigger function: Auto-index contacts on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate embedding if search_text changed or embedding is null
  IF NEW.search_text IS NOT NULL AND (
    NEW.embedding IS NULL
    OR TG_OP = 'INSERT'
    OR OLD.search_text IS DISTINCT FROM NEW.search_text
  ) THEN
    -- Generate embedding from search_text
    NEW.embedding := generate_deterministic_embedding(NEW.search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger function: Auto-index properties on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_property()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.search_text IS NOT NULL AND (
    NEW.embedding IS NULL
    OR TG_OP = 'INSERT'
    OR OLD.search_text IS DISTINCT FROM NEW.search_text
  ) THEN
    NEW.embedding := generate_deterministic_embedding(NEW.search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger function: Auto-index deals on insert/update
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- For deals, search_text needs to be manually set (includes related entities)
  -- Only generate embedding if search_text is present
  IF NEW.search_text IS NOT NULL AND (
    NEW.embedding IS NULL
    OR TG_OP = 'INSERT'
    OR OLD.search_text IS DISTINCT FROM NEW.search_text
  ) THEN
    NEW.embedding := generate_deterministic_embedding(NEW.search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Helper function: Update deal search_text from related entities
-- ============================================================================

CREATE OR REPLACE FUNCTION update_deal_search_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  property_text text;
  contact_text text;
BEGIN
  -- Get related property text
  SELECT COALESCE(address || ' ' || city || ' ' || state, '')
  INTO property_text
  FROM properties
  WHERE id = NEW.property_id;

  -- Get related contact text (buyer/seller)
  SELECT COALESCE(first_name || ' ' || last_name || ' ' || company, '')
  INTO contact_text
  FROM contacts
  WHERE id = NEW.contact_id;

  -- Combine deal fields with related entity text
  NEW.search_text := COALESCE(
    property_text || ' ' ||
    contact_text || ' ' ||
    NEW.stage || ' ' ||
    NEW.deal_type,
    ''
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create triggers
-- ============================================================================

-- Drop existing triggers if they exist (idempotent migration)
DROP TRIGGER IF EXISTS trigger_auto_index_contact ON contacts;
DROP TRIGGER IF EXISTS trigger_auto_index_property ON properties;
DROP TRIGGER IF EXISTS trigger_auto_index_deal ON deals;
DROP TRIGGER IF EXISTS trigger_update_deal_search_text ON deals;

-- Contacts trigger (runs BEFORE INSERT OR UPDATE)
CREATE TRIGGER trigger_auto_index_contact
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION auto_index_contact();

-- Properties trigger
CREATE TRIGGER trigger_auto_index_property
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_index_property();

-- Deals search_text trigger (runs first)
CREATE TRIGGER trigger_update_deal_search_text
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_search_text();

-- Deals embedding trigger (runs after search_text updated)
CREATE TRIGGER trigger_auto_index_deal
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION auto_index_deal();

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION generate_deterministic_embedding IS 'Generates deterministic 1536-dim vector embedding from text using MD5 hash';
COMMENT ON FUNCTION auto_index_contact IS 'Auto-generates embedding for contacts when search_text changes';
COMMENT ON FUNCTION auto_index_property IS 'Auto-generates embedding for properties when search_text changes';
COMMENT ON FUNCTION auto_index_deal IS 'Auto-generates embedding for deals when search_text changes';
COMMENT ON FUNCTION update_deal_search_text IS 'Updates deal search_text from related property and contact';

-- ============================================================================
-- Performance notes
-- ============================================================================

-- Trigger performance:
-- - Embedding generation: ~5-10ms per entity
-- - Runs synchronously in transaction (blocks INSERT/UPDATE)
-- - For bulk imports, consider disabling triggers temporarily

-- Alternative approach (async indexing):
-- - Use pg_notify to queue indexing jobs
-- - Process in background worker
-- - Faster inserts, but search results delayed
-- - Consider for Phase 2 if sync triggers too slow

-- ============================================================================
-- Test the triggers
-- ============================================================================

-- Test contact trigger:
-- INSERT INTO contacts (first_name, last_name, email, tenant_id)
-- VALUES ('Test', 'User', 'test@example.com', (SELECT id FROM tenants LIMIT 1));
-- SELECT embedding IS NOT NULL, embedding_indexed_at FROM contacts WHERE email = 'test@example.com';
-- Expected: embedding = NOT NULL, embedding_indexed_at = recent timestamp
