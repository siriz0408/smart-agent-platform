-- Migration: Add embedding columns and indexes to all searchable entities
-- Date: 2026-02-02
-- Purpose: Enable cross-site semantic search with deterministic embeddings

-- ============================================================================
-- Add embedding columns to contacts table
-- ============================================================================

-- Add search_text generated column (concatenates searchable fields)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ', '') ||
    COALESCE(last_name || ' ', '') ||
    COALESCE(company || ' ', '') ||
    COALESCE(email || ' ', '') ||
    COALESCE(notes, '')
  ) STORED;

-- Add embedding vector column (1536 dimensions to match document_chunks)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add timestamp to track when embedding was last indexed
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS embedding_indexed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Add embedding columns to properties table
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
    COALESCE(address || ' ', '') ||
    COALESCE(city || ' ', '') ||
    COALESCE(state || ' ', '') ||
    COALESCE(zip_code || ' ', '') ||
    COALESCE(description, '')
  ) STORED;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS embedding_indexed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Add embedding columns to deals table
-- ============================================================================

-- For deals, search_text is not auto-generated (needs JOIN with related entities)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS search_text TEXT;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS embedding_indexed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- Create vector indexes (IVFFlat) for semantic search
-- ============================================================================

-- IVFFlat suitable for < 1M vectors
-- Lists parameter: 100 (rule of thumb: sqrt(row_count) for ~10K entities)

CREATE INDEX IF NOT EXISTS contacts_embedding_idx
  ON public.contacts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS properties_embedding_idx
  ON public.properties USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS deals_embedding_idx
  ON public.deals USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- Create GIN indexes for full-text search (keyword search)
-- ============================================================================

-- GIN indexes are 100x faster than LIKE for text search
-- Supports @@, @>, tsvector operators

CREATE INDEX IF NOT EXISTS contacts_search_gin_idx
  ON public.contacts USING gin (to_tsvector('english', search_text));

CREATE INDEX IF NOT EXISTS properties_search_gin_idx
  ON public.properties USING gin (to_tsvector('english', search_text));

-- ============================================================================
-- Create B-tree indexes on tenant_id for RLS performance
-- ============================================================================

-- CRITICAL: Always index columns used in RLS policies
-- These indexes enable fast tenant filtering (5-10x faster queries)

CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx
  ON public.contacts (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS properties_tenant_id_idx
  ON public.properties (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS deals_tenant_id_idx
  ON public.deals (tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN contacts.search_text IS 'Auto-generated searchable text (first_name + last_name + company + email + notes)';
COMMENT ON COLUMN contacts.embedding IS 'Deterministic 1536-dim vector embedding for semantic search';
COMMENT ON COLUMN contacts.embedding_indexed_at IS 'Timestamp when embedding was last generated';

COMMENT ON COLUMN properties.search_text IS 'Auto-generated searchable text (address + city + state + zip + description)';
COMMENT ON COLUMN properties.embedding IS 'Deterministic 1536-dim vector embedding for semantic search';
COMMENT ON COLUMN properties.embedding_indexed_at IS 'Timestamp when embedding was last generated';

COMMENT ON COLUMN deals.search_text IS 'Searchable text (manually updated from related entities)';
COMMENT ON COLUMN deals.embedding IS 'Deterministic 1536-dim vector embedding for semantic search';
COMMENT ON COLUMN deals.embedding_indexed_at IS 'Timestamp when embedding was last generated';

-- ============================================================================
-- Performance notes
-- ============================================================================

-- IVFFlat index performance:
-- - Build time: ~100ms per 1K entities
-- - Query time: ~20-50ms for < 100K entities
-- - Upgrade to HNSW at 100K+ scale for better recall

-- GIN index performance:
-- - 100x faster than LIKE '%text%' queries
-- - Supports stemming (running, ran, run → same stem)
-- - Best for: email addresses, exact names, property addresses

-- B-tree index performance:
-- - Essential for RLS tenant_id filtering
-- - Without index: Sequential scan (slow)
-- - With index: Index scan (5-10x faster)
