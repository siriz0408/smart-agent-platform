-- Migration: Fix search_all_entities "column dl.title does not exist" error
-- Date: 2026-02-15
-- Root Cause: The deployed function references dl.title which doesn't exist on the deals table.
-- Fix: Replace with correct column references (deals has: id, tenant_id, property_id,
--   contact_id, deal_type, stage, estimated_value, notes, search_text, updated_at)

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
  v_is_numeric_query boolean;
BEGIN
  v_is_numeric_query := p_query ~ '^\s*\d+[\s\-]*\d*\s*$';

  RETURN QUERY
  WITH
  -- Document matches
  doc_matches AS (
    SELECT
      d.id,
      'document'::text AS etype,
      CASE
        WHEN v_is_numeric_query THEN
          CASE WHEN d.name ILIKE '%' || p_query || '%' THEN 1.5 ELSE 0.0 END
        ELSE
          COALESCE(ts_rank(
            to_tsvector('english', d.name || ' ' || COALESCE(d.ai_summary, '') || ' ' || COALESCE(d.category, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN d.name ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
      END::float AS rank_score
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
    ORDER BY rank_score DESC
    LIMIT p_match_count_per_type
  ),

  -- Contact matches
  con_matches AS (
    SELECT
      c.id,
      'contact'::text AS etype,
      CASE
        WHEN v_is_numeric_query THEN
          CASE
            WHEN c.phone ILIKE '%' || p_query || '%' THEN 2.0
            WHEN c.email ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 0.0
          END
        ELSE
          COALESCE(ts_rank(
            to_tsvector('english', COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') || ' ' || COALESCE(c.company, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE
            WHEN (COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) ILIKE '%' || p_query || '%' THEN 2.0
            WHEN c.company ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 1.0
          END
      END::float AS rank_score
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (c.phone ILIKE '%' || p_query || '%' OR c.email ILIKE '%' || p_query || '%'))
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '') || ' ' || COALESCE(c.company, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR (COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) ILIKE '%' || p_query || '%'
          OR c.company ILIKE '%' || p_query || '%'
          OR c.email ILIKE '%' || p_query || '%'
        ))
      )
    ORDER BY rank_score DESC
    LIMIT p_match_count_per_type
  ),

  -- Property matches
  prop_matches AS (
    SELECT
      p.id,
      'property'::text AS etype,
      CASE
        WHEN v_is_numeric_query THEN
          CASE
            WHEN p.zip_code ILIKE '%' || p_query || '%' THEN 2.0
            WHEN p.address ILIKE '%' || p_query || '%' THEN 1.5
            ELSE 0.0
          END
        ELSE
          COALESCE(ts_rank(
            to_tsvector('english', COALESCE(p.address,'') || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN p.address ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
      END::float AS rank_score
    FROM properties p
    WHERE p.tenant_id = p_tenant_id
      AND 'property' = ANY(p_entity_types)
      AND (
        (v_is_numeric_query AND (p.zip_code ILIKE '%' || p_query || '%' OR p.address ILIKE '%' || p_query || '%'))
        OR
        (NOT v_is_numeric_query AND (
          to_tsvector('english', COALESCE(p.address,'') || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, ''))
          @@ websearch_to_tsquery('english', p_query)
          OR p.address ILIKE '%' || p_query || '%'
        ))
      )
    ORDER BY rank_score DESC
    LIMIT p_match_count_per_type
  ),

  -- Deal matches (uses notes, deal_type, stage — no title column)
  deal_matches AS (
    SELECT
      dl.id,
      'deal'::text AS etype,
      CASE
        WHEN v_is_numeric_query THEN
          CASE WHEN COALESCE(dl.notes, '') ILIKE '%' || p_query || '%' THEN 1.5 ELSE 0.0 END
        ELSE
          COALESCE(ts_rank(
            to_tsvector('english', COALESCE(dl.notes, '') || ' ' || COALESCE(dl.deal_type, '') || ' ' || COALESCE(dl.stage, '')),
            websearch_to_tsquery('english', p_query)
          ), 0.0) *
          CASE WHEN COALESCE(dl.notes, '') ILIKE '%' || p_query || '%' THEN 1.5 ELSE 1.0 END
      END::float AS rank_score
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
    ORDER BY rank_score DESC
    LIMIT p_match_count_per_type
  ),

  -- Combine all matches using unique aliases to avoid ambiguity
  all_matches AS (
    SELECT id, etype, rank_score FROM doc_matches
    UNION ALL
    SELECT id, etype, rank_score FROM con_matches
    UNION ALL
    SELECT id, etype, rank_score FROM prop_matches
    UNION ALL
    SELECT id, etype, rank_score FROM deal_matches
  )

  -- Final join with display data
  SELECT
    m.etype::text AS entity_type,
    m.id::uuid AS entity_id,
    CASE
      WHEN m.etype = 'document' THEN d.name
      WHEN m.etype = 'contact' THEN COALESCE(c.first_name || ' ' || c.last_name, c.email)
      WHEN m.etype = 'property' THEN p.address
      WHEN m.etype = 'deal' THEN COALESCE(dl.deal_type || ' Deal - ' || dl.stage, 'Deal')
    END::text AS name,
    CASE
      WHEN m.etype = 'document' THEN COALESCE(d.category, 'Document')
      WHEN m.etype = 'contact' THEN COALESCE(c.company, 'Contact')
      WHEN m.etype = 'property' THEN COALESCE(p.city || ', ' || p.state, 'Property')
      WHEN m.etype = 'deal' THEN COALESCE(dl.stage, 'Deal')
    END::text AS subtitle,
    m.rank_score::float AS text_rank,
    CASE
      WHEN m.etype = 'document' THEN jsonb_build_object(
        'category', d.category,
        'ai_summary', LEFT(COALESCE(d.ai_summary, ''), 200)
      )
      WHEN m.etype = 'contact' THEN jsonb_build_object(
        'email', c.email,
        'phone', c.phone,
        'company', c.company
      )
      WHEN m.etype = 'property' THEN jsonb_build_object(
        'price', p.price,
        'status', p.status,
        'property_type', p.property_type
      )
      WHEN m.etype = 'deal' THEN jsonb_build_object(
        'stage', dl.stage,
        'value', dl.estimated_value,
        'deal_type', dl.deal_type
      )
    END::jsonb AS metadata,
    CASE
      WHEN m.etype = 'document' THEN d.updated_at
      WHEN m.etype = 'contact' THEN c.updated_at
      WHEN m.etype = 'property' THEN p.updated_at
      WHEN m.etype = 'deal' THEN dl.updated_at
    END::timestamp with time zone AS updated_at
  FROM all_matches m
  LEFT JOIN documents d ON m.etype = 'document' AND m.id = d.id
  LEFT JOIN contacts c ON m.etype = 'contact' AND m.id = c.id
  LEFT JOIN properties p ON m.etype = 'property' AND m.id = p.id
  LEFT JOIN deals dl ON m.etype = 'deal' AND m.id = dl.id
  ORDER BY m.rank_score DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION search_all_entities TO authenticated;
GRANT EXECUTE ON FUNCTION search_all_entities TO service_role;

COMMENT ON FUNCTION search_all_entities IS 'Unified search across documents, contacts, properties, deals. Fixed dl.title error (2026-02-15). Uses unique CTE aliases to prevent column ambiguity.';
