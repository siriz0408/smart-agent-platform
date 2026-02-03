-- Fix: documents table has created_at, not updated_at
-- The search_all_entities function was referencing d.updated_at which doesn't exist

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
BEGIN
  RETURN QUERY
  WITH
  -- ========================================================================
  -- Keyword search on documents (full-text search)
  -- ========================================================================
  document_matches AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      ts_rank(
        to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
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
  -- Keyword search on contacts
  -- ========================================================================
  contact_matches AS (
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
      ) as text_rank
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
  -- Keyword search on properties
  -- ========================================================================
  property_matches AS (
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
      ) as text_rank
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
  -- Keyword search on deals
  -- ========================================================================
  deal_matches AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      ts_rank(
        to_tsvector('english', COALESCE(d.search_text, '')),
        websearch_to_tsquery('english', p_query)
      ) as text_rank
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.search_text IS NOT NULL
      AND to_tsvector('english', d.search_text) @@ websearch_to_tsquery('english', p_query)
    ORDER BY text_rank DESC
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
  -- FIX: Use created_at for documents (no updated_at column)
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
    -- FIX: Use created_at for documents instead of non-existent updated_at
    CASE m.entity_type
      WHEN 'document' THEN d.created_at
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_all_entities TO authenticated;

COMMENT ON FUNCTION search_all_entities IS 'Unified keyword search - fixed to use created_at for documents';
