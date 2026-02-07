-- Migration: Add metadata column to document_chunks
-- Task: CTX-010
-- Context: The index-document function (CTX-004) generates page_start, page_end,
--          and section metadata for chunks but the schema lacks a metadata column.
--          This migration adds JSONB metadata storage to support the enhanced parsing.
-- Impact: Enables rich chunk metadata (page numbers, sections) for better RAG context

-- Step 1: Add metadata column as JSONB
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Step 2: Create GIN index for efficient metadata queries
-- Supports queries like: WHERE metadata->>'section' = 'Financial Summary'
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata
  ON public.document_chunks USING GIN (metadata);

-- Step 3: Create partial index for chunks with page metadata
-- Optimizes queries filtering by page numbers
CREATE INDEX IF NOT EXISTS idx_document_chunks_page_metadata
  ON public.document_chunks ((metadata->>'page_start'))
  WHERE metadata->>'page_start' IS NOT NULL;

-- Step 4: Add helpful comment
COMMENT ON COLUMN public.document_chunks.metadata IS
  'Structured chunk metadata including page_start, page_end, section (from CTX-004 enhanced parser)';

-- Migration verification query (run after deployment):
-- SELECT
--   count(*) as total_chunks,
--   count(metadata) as chunks_with_metadata,
--   count(metadata->>'page_start') as chunks_with_pages
-- FROM document_chunks;
