-- Fix: documents table uses created_at, not updated_at
-- This migration fixes the search_all_entities_hybrid function to use the correct column

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
  -- Vector search on document_chunks
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

  -- Keyword search on documents
  document_keyword AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')), websearch_to_tsquery('english', p_query)) DESC) as rank,
      ts_rank(to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')), websearch_to_tsquery('english', p_query)) as text_rank
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '')) @@ websearch_to_tsquery('english', p_query)
    ORDER BY ts_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Vector search on contacts
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

  -- Keyword search on contacts
  contact_keyword AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', c.search_text), websearch_to_tsquery('english', p_query)) DESC) as rank,
      ts_rank(to_tsvector('english', c.search_text), websearch_to_tsquery('english', p_query)) as text_rank
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND to_tsvector('english', c.search_text) @@ websearch_to_tsquery('english', p_query)
    ORDER BY ts_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Vector search on properties
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

  -- Keyword search on properties
  property_keyword AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', p.search_text), websearch_to_tsquery('english', p_query)) DESC) as rank,
      ts_rank(to_tsvector('english', p.search_text), websearch_to_tsquery('english', p_query)) as text_rank
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND to_tsvector('english', p.search_text) @@ websearch_to_tsquery('english', p_query)
    ORDER BY ts_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Vector search on deals
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

  -- Keyword search on deals
  deal_keyword AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', d.search_text), websearch_to_tsquery('english', p_query)) DESC) as rank,
      ts_rank(to_tsvector('english', d.search_text), websearch_to_tsquery('english', p_query)) as text_rank
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND d.search_text IS NOT NULL
      AND 'deal' = ANY(p_entity_types)
      AND to_tsvector('english', d.search_text) @@ websearch_to_tsquery('english', p_query)
    ORDER BY ts_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- RRF Fusion: Combine vector + keyword results
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

  -- Join with entity tables to get display data
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
    f.similarity,
    f.text_rank,
    f.rrf_score,
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
    -- FIX: Use created_at for documents, updated_at for others
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
  -- FIX: Order by rrf_score first, then by the timestamp (which may vary by type)
  ORDER BY f.rrf_score DESC, COALESCE(d.created_at, c.updated_at, p.updated_at, dl.updated_at) DESC;
END;
$$;

COMMENT ON FUNCTION search_all_entities_hybrid IS 'Fixed: Uses created_at for documents table (no updated_at column)';
