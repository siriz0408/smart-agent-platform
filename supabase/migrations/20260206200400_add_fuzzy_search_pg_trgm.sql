-- Migration: Add fuzzy matching for search using pg_trgm
-- Date: 2026-02-07
-- Purpose: Enable PostgreSQL trigram extension for fuzzy/typo-tolerant search
--          Task: DIS-006

-- ============================================================================
-- Enable pg_trgm extension for trigram similarity matching
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Create GIN indexes on searchable text columns for trigram matching
-- ============================================================================

-- Documents: name, ai_summary, category
CREATE INDEX IF NOT EXISTS idx_documents_name_trgm ON documents USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_ai_summary_trgm ON documents USING gin (COALESCE(ai_summary, '') gin_trgm_ops);

-- Contacts: first_name, last_name, email, company
CREATE INDEX IF NOT EXISTS idx_contacts_first_name_trgm ON contacts USING gin (COALESCE(first_name, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name_trgm ON contacts USING gin (COALESCE(last_name, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm ON contacts USING gin (COALESCE(email, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_company_trgm ON contacts USING gin (COALESCE(company, '') gin_trgm_ops);

-- Properties: address, city, state
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm ON properties USING gin (COALESCE(address, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON properties USING gin (COALESCE(city, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_state_trgm ON properties USING gin (COALESCE(state, '') gin_trgm_ops);

-- Deals: search_text
CREATE INDEX IF NOT EXISTS idx_deals_search_text_trgm ON deals USING gin (COALESCE(search_text, '') gin_trgm_ops);

-- ============================================================================
-- Update search_all_entities function to include fuzzy matching fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION search_all_entities(
  p_query text,
  p_tenant_id uuid,
  p_entity_types text[] DEFAULT ARRAY['document', 'contact', 'property', 'deal'],
  p_match_count_per_type int DEFAULT 10
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  name text,
  subtitle text,
  text_rank float,
  metadata jsonb,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fuzzy_threshold float := 0.3; -- Minimum similarity for fuzzy matches
BEGIN
  RETURN QUERY
  WITH
  -- ========================================================================
  -- Primary: Keyword search on documents (full-text search)
  -- ========================================================================
  document_matches_primary AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank,
      1 as match_type -- 1 = primary (full-text)
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND (
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, ''))
        @@ websearch_to_tsquery('english', p_query)
        OR d.name ILIKE '%' || p_query || '%'
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Fallback: Fuzzy matching on documents using trigram similarity
  -- ========================================================================
  document_matches_fuzzy AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      GREATEST(
        similarity(d.name, p_query),
        similarity(COALESCE(d.ai_summary, ''), p_query),
        similarity(COALESCE(d.category, ''), p_query)
      )::float as text_rank,
      2 as match_type -- 2 = fuzzy
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND d.id NOT IN (SELECT id FROM document_matches_primary)
      AND (
        similarity(d.name, p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(d.ai_summary, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(d.category, ''), p_query) >= v_fuzzy_threshold
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Combine document matches (primary first, then fuzzy)
  -- ========================================================================
  document_matches AS (
    SELECT * FROM document_matches_primary
    UNION ALL
    SELECT * FROM document_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Primary: Keyword search on contacts
  -- ========================================================================
  contact_matches_primary AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      ts_rank(
        to_tsvector('english',
          COALESCE(c.first_name, '') || ' ' ||
          COALESCE(c.last_name, '') || ' ' ||
          COALESCE(c.email, '') || ' ' ||
          COALESCE(c.company, '') || ' ' ||
          COALESCE(c.contact_type, '')
        ),
        websearch_to_tsquery('english', p_query)
      ) as text_rank,
      1 as match_type
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND (
        to_tsvector('english',
          COALESCE(c.first_name, '') || ' ' ||
          COALESCE(c.last_name, '') || ' ' ||
          COALESCE(c.email, '') || ' ' ||
          COALESCE(c.company, '') || ' ' ||
          COALESCE(c.contact_type, '')
        ) @@ websearch_to_tsquery('english', p_query)
        OR c.first_name ILIKE '%' || p_query || '%'
        OR c.last_name ILIKE '%' || p_query || '%'
        OR c.email ILIKE '%' || p_query || '%'
        OR c.company ILIKE '%' || p_query || '%'
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Fallback: Fuzzy matching on contacts
  -- ========================================================================
  contact_matches_fuzzy AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      GREATEST(
        similarity(COALESCE(c.first_name, ''), p_query),
        similarity(COALESCE(c.last_name, ''), p_query),
        similarity(COALESCE(c.email, ''), p_query),
        similarity(COALESCE(c.company, ''), p_query),
        similarity(COALESCE(c.first_name || ' ' || c.last_name, ''), p_query)
      )::float as text_rank,
      2 as match_type
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND c.id NOT IN (SELECT id FROM contact_matches_primary)
      AND (
        similarity(COALESCE(c.first_name, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(c.last_name, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(c.email, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(c.company, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(c.first_name || ' ' || c.last_name, ''), p_query) >= v_fuzzy_threshold
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Combine contact matches
  -- ========================================================================
  contact_matches AS (
    SELECT * FROM contact_matches_primary
    UNION ALL
    SELECT * FROM contact_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Primary: Keyword search on properties
  -- ========================================================================
  property_matches_primary AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      ts_rank(
        to_tsvector('english',
          COALESCE(p.address, '') || ' ' ||
          COALESCE(p.city, '') || ' ' ||
          COALESCE(p.state, '') || ' ' ||
          COALESCE(p.property_type, '')
        ),
        websearch_to_tsquery('english', p_query)
      ) as text_rank,
      1 as match_type
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND (
        to_tsvector('english',
          COALESCE(p.address, '') || ' ' ||
          COALESCE(p.city, '') || ' ' ||
          COALESCE(p.state, '') || ' ' ||
          COALESCE(p.property_type, '')
        ) @@ websearch_to_tsquery('english', p_query)
        OR p.address ILIKE '%' || p_query || '%'
        OR p.city ILIKE '%' || p_query || '%'
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Fallback: Fuzzy matching on properties
  -- ========================================================================
  property_matches_fuzzy AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      GREATEST(
        similarity(COALESCE(p.address, ''), p_query),
        similarity(COALESCE(p.city, ''), p_query),
        similarity(COALESCE(p.state, ''), p_query),
        similarity(COALESCE(p.address || ' ' || p.city, ''), p_query)
      )::float as text_rank,
      2 as match_type
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND p.id NOT IN (SELECT id FROM property_matches_primary)
      AND (
        similarity(COALESCE(p.address, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.city, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.state, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.address || ' ' || p.city, ''), p_query) >= v_fuzzy_threshold
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Combine property matches
  -- ========================================================================
  property_matches AS (
    SELECT * FROM property_matches_primary
    UNION ALL
    SELECT * FROM property_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Primary: Keyword search on deals
  -- ========================================================================
  deal_matches_primary AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank,
      1 as match_type
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.search_text IS NOT NULL
      AND to_tsvector('english', d.search_text) @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Fallback: Fuzzy matching on deals
  -- ========================================================================
  deal_matches_fuzzy AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      similarity(COALESCE(d.search_text, ''), p_query)::float as text_rank,
      2 as match_type
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.id NOT IN (SELECT id FROM deal_matches_primary)
      AND d.search_text IS NOT NULL
      AND similarity(d.search_text, p_query) >= v_fuzzy_threshold
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Combine deal matches
  -- ========================================================================
  deal_matches AS (
    SELECT * FROM deal_matches_primary
    UNION ALL
    SELECT * FROM deal_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Combine all results
  -- ========================================================================
  all_matches AS (
    SELECT * FROM document_matches
    UNION ALL
    SELECT * FROM contact_matches
    UNION ALL
    SELECT * FROM property_matches
    UNION ALL
    SELECT * FROM deal_matches
  )

  -- ========================================================================
  -- Join with entity tables to get display data
  -- ========================================================================
  SELECT
    m.entity_type,
    m.id as entity_id,
    CASE m.entity_type
      WHEN 'document' THEN d.name
      WHEN 'contact' THEN COALESCE(c.first_name || ' ' || c.last_name, c.email)
      WHEN 'property' THEN p.address
      WHEN 'deal' THEN COALESCE(dp.address, 'Deal #' || dl.id::text)
    END as name,
    CASE m.entity_type
      WHEN 'document' THEN COALESCE(d.category, 'Document')
      WHEN 'contact' THEN COALESCE(c.company, c.contact_type)
      WHEN 'property' THEN COALESCE(p.city || ', ' || p.state, p.property_type)
      WHEN 'deal' THEN COALESCE(dl.stage, dl.deal_type)
    END as subtitle,
    m.text_rank::float,
    CASE m.entity_type
      WHEN 'document' THEN jsonb_build_object(
        'category', d.category,
        'ai_summary', LEFT(COALESCE(d.ai_summary, ''), 200)
      )
      WHEN 'contact' THEN jsonb_build_object(
        'email', c.email,
        'phone', c.phone,
        'company', c.company
      )
      WHEN 'property' THEN jsonb_build_object(
        'price', p.price,
        'status', p.status,
        'property_type', p.property_type
      )
      WHEN 'deal' THEN jsonb_build_object(
        'stage', dl.stage,
        'value', dl.estimated_value,
        'deal_type', dl.deal_type
      )
    END as metadata,
    CASE m.entity_type
      WHEN 'document' THEN d.updated_at
      WHEN 'contact' THEN c.updated_at
      WHEN 'property' THEN p.updated_at
      WHEN 'deal' THEN dl.updated_at
    END as updated_at
  FROM all_matches m
  LEFT JOIN documents d ON m.entity_type = 'document' AND m.id = d.id
  LEFT JOIN contacts c ON m.entity_type = 'contact' AND m.id = c.id
  LEFT JOIN properties p ON m.entity_type = 'property' AND m.id = p.id
  LEFT JOIN deals dl ON m.entity_type = 'deal' AND m.id = dl.id
  LEFT JOIN properties dp ON m.entity_type = 'deal' AND dl.property_id = dp.id
  ORDER BY m.text_rank DESC, updated_at DESC;
END;
$$;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_all_entities TO authenticated;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION search_all_entities IS 'Unified keyword search with fuzzy matching fallback using PostgreSQL full-text search and trigram similarity (pg_trgm)';
