-- Create function to match documents using pgvector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  chunk_index int,
  document_id uuid,
  document_name text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.chunk_index,
    d.id as document_id,
    d.name as document_name,
    (1 - (dc.embedding <=> query_embedding))::float as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.tenant_id = p_tenant_id
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_documents TO authenticated;