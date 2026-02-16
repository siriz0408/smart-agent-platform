-- Migration: Fix ambiguous entity_type column reference in search_all_entities
-- Date: 2026-02-07
-- Bug: Search returns HTTP 500 with error "column reference \"entity_type\" is ambiguous"
-- Root Cause: The UNION ALL in all_matches doesn't explicitly qualify all columns
-- Fix: Ensure all CTEs in UNION explicitly select columns with proper aliases

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
  -- Document matches
  document_matches AS (
    SELECT
      d.id,
      'document'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN (
          CASE WHEN d.name ILIKE '%' || p_query || '%' THEN 1.5 ELSE 0.0 END
        )
        ELSE (
          COALESCE(ts_rank(
            to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN d.name ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
        )
      END::float as text_rank
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
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Contact matches
  contact_matches AS (
    SELECT
      c.id,
      'contact'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN (
          CASE
            WHEN c.phone ILIKE '%' || p_query || '%' THEN 2.0
            WHEN c.email ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 0.0
          END
        )
        ELSE (
          COALESCE(ts_rank(
            to_tsvector('english', COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') || ' ' || COALESCE(c.company, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE
            WHEN (c.first_name || ' ' || c.last_name) ILIKE '%' || p_query || '%' THEN 2.0
            WHEN c.company ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 1.0
          END
        )
      END::float as text_rank
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (c.phone ILIKE '%' || p_query || '%' OR c.email ILIKE '%' || p_query || '%'))
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') || ' ' || COALESCE(c.company, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR (c.first_name || ' ' || c.last_name) ILIKE '%' || p_query || '%'
          OR c.company ILIKE '%' || p_query || '%'
        ))
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Property matches
  property_matches AS (
    SELECT
      p.id,
      'property'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN (
          CASE
            WHEN p.zip_code ILIKE '%' || p_query || '%' THEN 2.0
            WHEN p.address ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 0.0
          END
        )
        ELSE (
          COALESCE(ts_rank(
            to_tsvector('english', p.address || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN p.address ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
        )
      END::float as text_rank
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (p.zip_code ILIKE '%' || p_query || '%' OR p.address ILIKE '%' || p_query || '%'))
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', p.address || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR p.address ILIKE '%' || p_query || '%'
        ))
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  ),

  -- Deal matches
  deal_matches AS (
    SELECT
      dl.id,
      'deal'::text as entity_type,
      CASE
        WHEN v_is_numeric_query THEN (
          CASE WHEN COALESCE(dl.notes, '') ILIKE '%' || p_query || '%' THEN 1.5 ELSE 0.0 END
        )
        ELSE (
          COALESCE(ts_rank(
            to_tsvector('english', COALESCE(dl.notes, '') || ' ' || COALESCE(dl.deal_type, '') || ' ' || COALESCE(dl.stage, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN COALESCE(dl.notes, '') ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
        )
      END::float as text_rank
    FROM deals dl
    WHERE dl.tenant_id = p_tenant_id
      AND 'deal' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND COALESCE(dl.notes, '') ILIKE '%' || p_query || '%')
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', COALESCE(dl.notes, '') || ' ' || COALESCE(dl.deal_type, '') || ' ' || COALESCE(dl.stage, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR COALESCE(dl.notes, '') ILIKE '%' || p_query || '%'
          OR dl.deal_type ILIKE '%' || p_query || '%'
          OR dl.stage ILIKE '%' || p_query || '%'
        ))
      )
    ORDER BY text_rank DESC
    LIMIT p_match_count_per_type
  )

  -- Final SELECT with explicit column qualification
  SELECT
    m.entity_type::text,
    m.id::uuid as entity_id,
    CASE
      WHEN m.entity_type = 'document' THEN d.name
      WHEN m.entity_type = 'contact' THEN COALESCE(c.first_name || ' ' || c.last_name, c.email)
      WHEN m.entity_type = 'property' THEN p.address
      WHEN m.entity_type = 'deal' THEN COALESCE(dl.deal_type || ' Deal - Stage: ' || dl.stage, 'Deal #' || dl.id::text)
    END::text as name,
    CASE
      WHEN m.entity_type = 'document' THEN COALESCE(d.category, 'Document')
      WHEN m.entity_type = 'contact' THEN COALESCE(c.company, 'Contact')
      WHEN m.entity_type = 'property' THEN COALESCE(p.city || ', ' || p.state, 'Property')
      WHEN m.entity_type = 'deal' THEN COALESCE(dl.stage, 'Deal')
    END::text as subtitle,
    m.text_rank::float,
    CASE
      WHEN m.entity_type = 'document' THEN jsonb_build_object(
        'category', d.category,
        'ai_summary', LEFT(COALESCE(d.ai_summary, ''), 200)
      )
      WHEN m.entity_type = 'contact' THEN jsonb_build_object(
        'email', c.email,
        'phone', c.phone,
        'company', c.company
      )
      WHEN m.entity_type = 'property' THEN jsonb_build_object(
        'price', p.price,
        'status', p.status,
        'property_type', p.property_type
      )
      WHEN m.entity_type = 'deal' THEN jsonb_build_object(
        'stage', dl.stage,
        'value', dl.value,
        'deal_type', dl.deal_type
      )
    END::jsonb as metadata,
    CASE
      WHEN m.entity_type = 'document' THEN d.updated_at
      WHEN m.entity_type = 'contact' THEN c.updated_at
      WHEN m.entity_type = 'property' THEN p.updated_at
      WHEN m.entity_type = 'deal' THEN dl.updated_at
    END::timestamp with time zone as updated_at
  FROM (
    SELECT * FROM document_matches
    UNION ALL
    SELECT * FROM contact_matches
    UNION ALL
    SELECT * FROM property_matches
    UNION ALL
    SELECT * FROM deal_matches
  ) m
  LEFT JOIN documents d ON m.entity_type = 'document' AND m.id = d.id
  LEFT JOIN contacts c ON m.entity_type = 'contact' AND m.id = c.id
  LEFT JOIN properties p ON m.entity_type = 'property' AND m.id = p.id
  LEFT JOIN deals dl ON m.entity_type = 'deal' AND m.id = dl.id
  ORDER BY m.text_rank DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_all_entities TO authenticated;

COMMENT ON FUNCTION search_all_entities IS 'Unified search with explicit column qualification to prevent ambiguity errors. Fixed: DIS-014, DIS-016';
