-- Migration: Create unified search RPC function with RRF hybrid search
-- Date: 2026-02-02
-- Purpose: Single search function across all entities using Reciprocal Rank Fusion

-- ============================================================================
-- search_all_entities_hybrid: Core RRF-based hybrid search function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_all_entities_hybrid(
  p_query text,
  p_query_embedding vector(1536),
  p_tenant_id uuid,
  p_entity_types text[] DEFAULT ARRAY['document', 'contact', 'property', 'deal'],
  p_match_threshold float DEFAULT 0.1,
  p_match_count_per_type int DEFAULT 5
)
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  name text,
  subtitle text,
  similarity float,
  text_rank float,
  rrf_score float,
  metadata jsonb,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ========================================================================
  -- Vector search on documents (via document_chunks)
  -- ========================================================================
  document_vector AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> p_query_embedding) as rank,
      (1 - (dc.embedding <=> p_query_embedding))::float as similarity
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND (1 - (dc.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Keyword search on documents (full-text search)
  -- ========================================================================
  document_keyword AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')),
        websearch_to_tsquery('english', p_query)
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, ''))
          @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Vector search on contacts
  -- ========================================================================
  contact_vector AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> p_query_embedding) as rank,
      (1 - (c.embedding <=> p_query_embedding))::float as similarity
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND c.embedding IS NOT NULL
      AND 'contact' = ANY(p_entity_types)
      AND (1 - (c.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Keyword search on contacts
  -- ========================================================================
  contact_keyword AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', c.search_text),
        websearch_to_tsquery('english', p_query)
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', c.search_text),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND to_tsvector('english', c.search_text)
          @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Vector search on properties
  -- ========================================================================
  property_vector AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY p.embedding <=> p_query_embedding) as rank,
      (1 - (p.embedding <=> p_query_embedding))::float as similarity
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND p.embedding IS NOT NULL
      AND 'property' = ANY(p_entity_types)
      AND (1 - (p.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY p.embedding <=> p_query_embedding
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Keyword search on properties
  -- ========================================================================
  property_keyword AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', p.search_text),
        websearch_to_tsquery('english', p_query)
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', p.search_text),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND to_tsvector('english', p.search_text)
          @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Vector search on deals
  -- ========================================================================
  deal_vector AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY d.embedding <=> p_query_embedding) as rank,
      (1 - (d.embedding <=> p_query_embedding))::float as similarity
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND d.embedding IS NOT NULL
      AND 'deal' = ANY(p_entity_types)
      AND (1 - (d.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY d.embedding <=> p_query_embedding
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Keyword search on deals
  -- ========================================================================
  deal_keyword AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        websearch_to_tsquery('english', p_query)
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.search_text IS NOT NULL
      AND to_tsvector('english', d.search_text)
          @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- RRF Fusion: Combine vector + keyword results
  -- ========================================================================
  -- RRF formula: score = 1 / (k + rank)
  -- k = 60 (constant from RRF paper, no tuning needed)
  -- ========================================================================
  rrf_fusion AS (
    -- Documents
    SELECT
      COALESCE(v.id, k.id) as entity_id,
      COALESCE(v.entity_type, k.entity_type) as entity_type,
      v.similarity,
      k.text_rank,
      COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) as rrf_score
    FROM document_vector v
    FULL OUTER JOIN document_keyword k ON v.id = k.id AND v.entity_type = k.entity_type

    UNION ALL

    -- Contacts
    SELECT
      COALESCE(v.id, k.id),
      COALESCE(v.entity_type, k.entity_type),
      v.similarity,
      k.text_rank,
      COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0)
    FROM contact_vector v
    FULL OUTER JOIN contact_keyword k ON v.id = k.id

    UNION ALL

    -- Properties
    SELECT
      COALESCE(v.id, k.id),
      COALESCE(v.entity_type, k.entity_type),
      v.similarity,
      k.text_rank,
      COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0)
    FROM property_vector v
    FULL OUTER JOIN property_keyword k ON v.id = k.id

    UNION ALL

    -- Deals
    SELECT
      COALESCE(v.id, k.id),
      COALESCE(v.entity_type, k.entity_type),
      v.similarity,
      k.text_rank,
      COALESCE(1.0 / (60 + v.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0)
    FROM deal_vector v
    FULL OUTER JOIN deal_keyword k ON v.id = k.id
  )

  -- ========================================================================
  -- Join with entity tables to get display data
  -- ========================================================================
  SELECT
    f.entity_type,
    f.entity_id,
    CASE f.entity_type
      WHEN 'document' THEN d.name
      WHEN 'contact' THEN COALESCE(c.first_name || ' ' || c.last_name, c.email)
      WHEN 'property' THEN p.address
      WHEN 'deal' THEN COALESCE(dp.address, 'Deal #' || dl.id::text)
    END as name,
    CASE f.entity_type
      WHEN 'document' THEN COALESCE(d.category, 'Document')
      WHEN 'contact' THEN COALESCE(c.company, c.contact_type)
      WHEN 'property' THEN COALESCE(p.city || ', ' || p.state, p.property_type)
      WHEN 'deal' THEN COALESCE(dl.stage, dl.deal_type)
    END as subtitle,
    COALESCE(f.similarity, 0)::float as similarity,
    COALESCE(f.text_rank, 0)::float as text_rank,
    f.rrf_score::float,
    CASE f.entity_type
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
    CASE f.entity_type
      WHEN 'document' THEN d.updated_at
      WHEN 'contact' THEN c.updated_at
      WHEN 'property' THEN p.updated_at
      WHEN 'deal' THEN dl.updated_at
    END as updated_at
  FROM rrf_fusion f
  LEFT JOIN documents d ON f.entity_type = 'document' AND f.entity_id = d.id
  LEFT JOIN contacts c ON f.entity_type = 'contact' AND f.entity_id = c.id
  LEFT JOIN properties p ON f.entity_type = 'property' AND f.entity_id = p.id
  LEFT JOIN deals dl ON f.entity_type = 'deal' AND f.entity_id = dl.id
  LEFT JOIN properties dp ON f.entity_type = 'deal' AND dl.property_id = dp.id
  ORDER BY f.rrf_score DESC, updated_at DESC;
END;
$$;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_all_entities_hybrid TO authenticated;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION search_all_entities_hybrid IS 'Unified semantic search across all entities using RRF hybrid fusion (vector + keyword)';

-- ============================================================================
-- Performance verification query
-- ============================================================================

-- Run this after migration to test performance:
-- EXPLAIN ANALYZE
-- SELECT * FROM search_all_entities_hybrid(
--   'Denver real estate',
--   (SELECT embedding FROM document_chunks LIMIT 1),
--   (SELECT id FROM tenants LIMIT 1),
--   ARRAY['document', 'contact', 'property', 'deal']
-- );
-- Expected execution time: < 200ms for < 100K entities
