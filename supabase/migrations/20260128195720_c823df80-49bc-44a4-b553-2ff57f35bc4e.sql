-- Create hybrid search function combining full-text and keyword matching
-- Uses on-the-fly tsvector generation instead of stored column to avoid memory issues
CREATE OR REPLACE FUNCTION search_documents_hybrid(
  p_query text,
  p_document_ids uuid[],
  p_tenant_id uuid,
  p_limit int DEFAULT 15
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  content text,
  chunk_index int,
  text_rank float,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  query_tsquery tsquery;
BEGIN
  -- Parse the query into a tsquery for full-text search
  query_tsquery := plainto_tsquery('english', p_query);
  
  RETURN QUERY
  WITH text_matches AS (
    -- Full-text search using on-the-fly tsvector
    SELECT 
      dc.id AS chunk_id,
      d.id AS document_id,
      d.name AS document_name,
      dc.content,
      dc.chunk_index,
      ts_rank(to_tsvector('english', dc.content), query_tsquery) AS text_rank,
      d.category
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.tenant_id = p_tenant_id
      AND (p_document_ids IS NULL OR array_length(p_document_ids, 1) IS NULL OR d.id = ANY(p_document_ids))
      AND to_tsvector('english', dc.content) @@ query_tsquery
  ),
  keyword_matches AS (
    -- Fallback: simple ILIKE search for partial word matches
    SELECT 
      dc.id AS chunk_id,
      d.id AS document_id,
      d.name AS document_name,
      dc.content,
      dc.chunk_index,
      0.3::float AS text_rank,
      d.category
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.tenant_id = p_tenant_id
      AND (p_document_ids IS NULL OR array_length(p_document_ids, 1) IS NULL OR d.id = ANY(p_document_ids))
      AND dc.content ILIKE '%' || p_query || '%'
      AND dc.id NOT IN (SELECT tm.chunk_id FROM text_matches tm)
    LIMIT p_limit
  ),
  all_matches AS (
    SELECT * FROM text_matches
    UNION ALL
    SELECT * FROM keyword_matches
  )
  SELECT DISTINCT ON (am.chunk_id)
    am.chunk_id,
    am.document_id,
    am.document_name,
    am.content,
    am.chunk_index,
    am.text_rank,
    am.category
  FROM all_matches am
  ORDER BY am.chunk_id, am.text_rank DESC
  LIMIT p_limit;
END;
$$;

-- Create function to get neighboring chunks for context continuity
CREATE OR REPLACE FUNCTION get_chunk_neighbors(
  p_chunk_ids uuid[],
  p_tenant_id uuid
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  content text,
  chunk_index int,
  category text,
  is_neighbor boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH original_chunks AS (
    SELECT 
      dc.id,
      dc.document_id,
      dc.chunk_index
    FROM document_chunks dc
    WHERE dc.id = ANY(p_chunk_ids)
  ),
  neighbor_indices AS (
    SELECT DISTINCT
      oc.document_id,
      unnest(ARRAY[oc.chunk_index - 1, oc.chunk_index, oc.chunk_index + 1]) AS idx,
      oc.chunk_index AS original_index
    FROM original_chunks oc
  )
  SELECT 
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    dc.content,
    dc.chunk_index,
    d.category,
    dc.chunk_index != ni.original_index AS is_neighbor
  FROM neighbor_indices ni
  JOIN document_chunks dc ON dc.document_id = ni.document_id AND dc.chunk_index = ni.idx
  JOIN documents d ON d.id = dc.document_id
  WHERE d.tenant_id = p_tenant_id
  ORDER BY d.id, dc.chunk_index;
END;
$$;