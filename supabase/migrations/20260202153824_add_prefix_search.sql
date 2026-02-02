-- Add prefix search support for incremental search
-- Date: 2026-02-02
-- Purpose: Enable "as-you-type" search that matches partial words (s, sa, sar, sarah)

-- ============================================================================
-- Create enhanced search function with prefix matching
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
  updated_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  -- ========================================================================
  -- Vector search on documents
  -- ========================================================================
  WITH document_vector AS (
    SELECT
      dc.document_id as id,
      'document'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY dc.embedding <=> p_query_embedding) as rank,
      (1 - (dc.embedding <=> p_query_embedding))::float as similarity
    FROM document_chunks dc
    WHERE dc.tenant_id = p_tenant_id
      AND dc.embedding IS NOT NULL
      AND 'document' = ANY(p_entity_types)
      AND (1 - (dc.embedding <=> p_query_embedding)) > p_match_threshold
    ORDER BY dc.embedding <=> p_query_embedding
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- Keyword search on documents (with prefix matching)
  -- ========================================================================
  document_keyword AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) as text_rank
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND (
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, ''))
          @@ to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
        OR d.name ILIKE '%' || p_query || '%'
        OR d.ai_summary ILIKE '%' || p_query || '%'
      )
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
  -- Keyword search on contacts (with prefix matching)
  -- ========================================================================
  contact_keyword AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', c.search_text),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', c.search_text),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) as text_rank
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND c.search_text IS NOT NULL
      AND (
        to_tsvector('english', c.search_text)
          @@ to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
        OR c.first_name ILIKE '%' || p_query || '%'
        OR c.last_name ILIKE '%' || p_query || '%'
        OR c.email ILIKE '%' || p_query || '%'
        OR c.company ILIKE '%' || p_query || '%'
      )
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
  -- Keyword search on properties (with prefix matching)
  -- ========================================================================
  property_keyword AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', COALESCE(p.search_text, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', COALESCE(p.search_text, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) as text_rank
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND (
        to_tsvector('english', p.search_text)
            @@ to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
        OR p.address ILIKE '%' || p_query || '%'
        OR p.city ILIKE '%' || p_query || '%'
        OR p.description ILIKE '%' || p_query || '%'
      )
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
  -- Keyword search on deals (with prefix matching)
  -- ========================================================================
  deal_keyword AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) DESC) as rank,
      ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
      ) as text_rank
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.search_text IS NOT NULL
      AND (
        to_tsvector('english', d.search_text)
            @@ to_tsquery('english', regexp_replace(p_query, '\s+', ':* & ', 'g') || ':*')
        OR d.notes ILIKE '%' || p_query || '%'
        OR d.stage ILIKE '%' || p_query || '%'
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- ========================================================================
  -- RRF Fusion: Combine vector + keyword results
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
      WHEN 'document' THEN d.created_at
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
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_all_entities_hybrid TO authenticated;

COMMENT ON FUNCTION search_all_entities_hybrid IS 'Enhanced hybrid search with prefix matching for incremental (as-you-type) search';
