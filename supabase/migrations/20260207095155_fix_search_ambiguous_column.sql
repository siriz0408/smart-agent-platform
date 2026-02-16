-- Migration: Fix ambiguous column reference in search_all_entities
-- Date: 2026-02-07
-- Purpose: Fix "column reference \"entity_type\" is ambiguous" error
--          Root cause: ORDER BY clause referenced unqualified updated_at column
--          Fix: Use CASE expression to qualify updated_at by entity_type

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
  v_fuzzy_threshold float := 0.3;
  v_exact_match_boost float := 1.5;
  v_position_boost_factor float := 0.2;
  v_is_numeric_query boolean;
BEGIN
  v_is_numeric_query := p_query ~ '^\s*\d+[\s\-]*\d*\s*$';

  RETURN QUERY
  WITH
  document_matches_primary AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN 0.0
        ELSE ts_rank(
          to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, '')),
          websearch_to_tsquery('english', p_query)
        )
      END as base_rank,
      CASE
        WHEN d.name ILIKE p_query THEN v_exact_match_boost
        WHEN d.name ILIKE '%' || p_query || '%' THEN 1.0 + (v_exact_match_boost - 1.0) * 0.5
        ELSE 1.0
      END as exact_boost,
      CASE
        WHEN d.name ILIKE p_query || '%' THEN 1.0 + v_position_boost_factor
        ELSE 1.0
      END as position_boost,
      CASE
        WHEN d.name ILIKE '%' || p_query || '%' THEN 1.5
        WHEN COALESCE(d.ai_summary, '') ILIKE '%' || p_query || '%' THEN 1.2
        WHEN COALESCE(d.category, '') ILIKE '%' || p_query || '%' THEN 1.0
        ELSE 1.0
      END as field_weight,
      1 as match_type
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND d.name ILIKE '%' || p_query || '%')
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR d.name ILIKE '%' || p_query || '%'
        ))
      )
  ),
  document_matches_scored AS (
    SELECT
      id,
      entity_type,
      CASE
        WHEN v_is_numeric_query THEN (exact_boost * position_boost * field_weight)::float
        ELSE (base_rank * exact_boost * position_boost * field_weight)::float
      END as text_rank,
      match_type
    FROM document_matches_primary
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
  document_matches_fuzzy AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      GREATEST(
        similarity(d.name, p_query),
        similarity(COALESCE(d.ai_summary, ''), p_query),
        similarity(COALESCE(d.category, ''), p_query)
      )::float as text_rank,
      2 as match_type
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
      AND 'document' = ANY(p_entity_types)
      AND d.id NOT IN (SELECT id FROM document_matches_scored)
      AND (
        similarity(d.name, p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(d.ai_summary, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(d.category, ''), p_query) >= v_fuzzy_threshold
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
  document_matches AS (
    SELECT * FROM document_matches_scored
    UNION ALL
    SELECT * FROM document_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),
  contact_matches_primary AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN 0.0
        ELSE ts_rank(
          to_tsvector('english',
            COALESCE(c.first_name, '') || ' ' ||
            COALESCE(c.last_name, '') || ' ' ||
            COALESCE(c.email, '') || ' ' ||
            COALESCE(c.company, '') || ' ' ||
            COALESCE(c.contact_type, '')
          ),
          websearch_to_tsquery('english', p_query)
        )
      END as base_rank,
      CASE
        WHEN c.first_name ILIKE p_query OR c.last_name ILIKE p_query THEN v_exact_match_boost
        WHEN c.first_name ILIKE '%' || p_query || '%' OR c.last_name ILIKE '%' || p_query || '%' THEN 1.0 + (v_exact_match_boost - 1.0) * 0.5
        ELSE 1.0
      END as exact_boost,
      CASE
        WHEN c.first_name ILIKE p_query || '%' OR c.last_name ILIKE p_query || '%' THEN 1.0 + v_position_boost_factor
        ELSE 1.0
      END as position_boost,
      CASE
        WHEN c.first_name ILIKE '%' || p_query || '%' OR c.last_name ILIKE '%' || p_query || '%' THEN 1.5
        WHEN COALESCE(c.email, '') ILIKE '%' || p_query || '%' THEN 1.3
        WHEN COALESCE(c.company, '') ILIKE '%' || p_query || '%' THEN 1.2
        ELSE 1.0
      END as field_weight,
      1 as match_type
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (
          c.first_name ILIKE '%' || p_query || '%'
          OR c.last_name ILIKE '%' || p_query || '%'
          OR c.email ILIKE '%' || p_query || '%'
          OR c.company ILIKE '%' || p_query || '%'
        ))
        OR
        (NOT v_is_numeric_query AND (
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
        ))
      )
  ),
  contact_matches_scored AS (
    SELECT
      id,
      entity_type,
      CASE
        WHEN v_is_numeric_query THEN (exact_boost * position_boost * field_weight)::float
        ELSE (base_rank * exact_boost * position_boost * field_weight)::float
      END as text_rank,
      match_type
    FROM contact_matches_primary
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
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
      AND c.id NOT IN (SELECT id FROM contact_matches_scored)
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
  contact_matches AS (
    SELECT * FROM contact_matches_scored
    UNION ALL
    SELECT * FROM contact_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),
  property_matches_primary AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN 0.0
        ELSE ts_rank(
          to_tsvector('english',
            COALESCE(p.address, '') || ' ' ||
            COALESCE(p.city, '') || ' ' ||
            COALESCE(p.state, '') || ' ' ||
            COALESCE(p.property_type, '')
          ),
          websearch_to_tsquery('english', p_query)
        )
      END as base_rank,
      CASE
        WHEN p.address ILIKE p_query THEN v_exact_match_boost
        WHEN p.address ILIKE '%' || p_query || '%' THEN 1.0 + (v_exact_match_boost - 1.0) * 0.6
        WHEN p.city ILIKE p_query THEN 1.0 + (v_exact_match_boost - 1.0) * 0.4
        ELSE 1.0
      END as exact_boost,
      CASE
        WHEN p.address ILIKE p_query || '%' THEN 1.0 + v_position_boost_factor
        ELSE 1.0
      END as position_boost,
      CASE
        WHEN p.address ILIKE '%' || p_query || '%' THEN 1.6
        WHEN p.city ILIKE '%' || p_query || '%' THEN 1.3
        WHEN p.state ILIKE '%' || p_query || '%' THEN 1.1
        WHEN p.zip_code ILIKE '%' || p_query || '%' THEN 1.4
        ELSE 1.0
      END as field_weight,
      1 as match_type
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (
          p.address ILIKE '%' || p_query || '%'
          OR p.city ILIKE '%' || p_query || '%'
          OR p.zip_code ILIKE '%' || p_query || '%'
        ))
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english',
            COALESCE(p.address, '') || ' ' ||
            COALESCE(p.city, '') || ' ' ||
            COALESCE(p.state, '') || ' ' ||
            COALESCE(p.property_type, '')
          ) @@ websearch_to_tsquery('english', p_query)
          OR p.address ILIKE '%' || p_query || '%'
          OR p.city ILIKE '%' || p_query || '%'
        ))
      )
  ),
  property_matches_scored AS (
    SELECT
      id,
      entity_type,
      CASE
        WHEN v_is_numeric_query THEN (exact_boost * position_boost * field_weight)::float
        ELSE (base_rank * exact_boost * position_boost * field_weight)::float
      END as text_rank,
      match_type
    FROM property_matches_primary
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
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
      AND p.id NOT IN (SELECT id FROM property_matches_scored)
      AND (
        similarity(COALESCE(p.address, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.city, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.state, ''), p_query) >= v_fuzzy_threshold
        OR similarity(COALESCE(p.address || ' ' || p.city, ''), p_query) >= v_fuzzy_threshold
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
  property_matches AS (
    SELECT * FROM property_matches_scored
    UNION ALL
    SELECT * FROM property_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),
  deal_matches_primary AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN 0.0
        ELSE ts_rank(
          to_tsvector('english', COALESCE(d.search_text, '')),
          websearch_to_tsquery('english', p_query)
        )
      END as base_rank,
      CASE
        WHEN d.search_text ILIKE p_query THEN v_exact_match_boost
        WHEN d.search_text ILIKE '%' || p_query || '%' THEN 1.0 + (v_exact_match_boost - 1.0) * 0.5
        ELSE 1.0
      END as exact_boost,
      1.0 as position_boost,
      CASE
        WHEN d.search_text ILIKE '%' || p_query || '%' THEN 1.3
        ELSE 1.0
      END as field_weight,
      1 as match_type
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.search_text IS NOT NULL
      AND (
        (v_is_numeric_query AND d.search_text ILIKE '%' || p_query || '%')
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', COALESCE(d.search_text, '')) @@ websearch_to_tsquery('english', p_query)
          OR d.search_text ILIKE '%' || p_query || '%'
        ))
      )
  ),
  deal_matches_scored AS (
    SELECT
      id,
      entity_type,
      CASE
        WHEN v_is_numeric_query THEN (exact_boost * position_boost * field_weight)::float
        ELSE (base_rank * exact_boost * position_boost * field_weight)::float
      END as text_rank,
      match_type
    FROM deal_matches_primary
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
  deal_matches_fuzzy AS (
    SELECT
      d.id,
      'deal'::text as entity_type,
      similarity(COALESCE(d.search_text, ''), p_query)::float as text_rank,
      2 as match_type
    FROM deals d
    WHERE d.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND d.id NOT IN (SELECT id FROM deal_matches_scored)
      AND d.search_text IS NOT NULL
      AND similarity(d.search_text, p_query) >= v_fuzzy_threshold
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),
  deal_matches AS (
    SELECT * FROM deal_matches_scored
    UNION ALL
    SELECT * FROM deal_matches_fuzzy
    ORDER BY match_type, text_rank DESC
    LIMIT p_match_count_per_type
  ),
  all_matches AS (
    SELECT * FROM document_matches
    UNION ALL
    SELECT * FROM contact_matches
    UNION ALL
    SELECT * FROM property_matches
    UNION ALL
    SELECT * FROM deal_matches
  )
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
  ORDER BY m.text_rank DESC, 
    CASE m.entity_type
      WHEN 'document' THEN d.updated_at
      WHEN 'contact' THEN c.updated_at
      WHEN 'property' THEN p.updated_at
      WHEN 'deal' THEN dl.updated_at
    END DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_all_entities TO authenticated;

COMMENT ON FUNCTION search_all_entities IS 'Unified keyword search with numeric query support. Fixed ambiguous column reference in ORDER BY clause.';
