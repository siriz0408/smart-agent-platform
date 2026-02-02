-- Backfill embeddings for existing contacts
-- Date: 2026-02-02
-- Purpose: Generate embeddings for contacts that were inserted before triggers were created

-- ============================================================================
-- Update contacts without embeddings
-- ============================================================================

UPDATE public.contacts
SET
  embedding = generate_deterministic_embedding(search_text),
  embedding_indexed_at = NOW()
WHERE
  search_text IS NOT NULL
  AND embedding IS NULL;

-- ============================================================================
-- Update properties without embeddings
-- ============================================================================

UPDATE public.properties
SET
  embedding = generate_deterministic_embedding(search_text),
  embedding_indexed_at = NOW()
WHERE
  search_text IS NOT NULL
  AND embedding IS NULL;

-- ============================================================================
-- Update deals without embeddings
-- ============================================================================

-- For deals, we need to populate search_text first from related entities
UPDATE public.deals d
SET
  search_text = COALESCE(
    (SELECT p.address || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, '')
     FROM public.properties p
     WHERE p.id = d.property_id),
    ''
  ) || ' ' || COALESCE(d.notes, '') || ' ' || COALESCE(d.stage, '') || ' ' || COALESCE(d.deal_type, ''),
  embedding = generate_deterministic_embedding(
    COALESCE(
      (SELECT p.address || ' ' || COALESCE(p.city, '') || ' ' || COALESCE(p.state, '')
       FROM public.properties p
       WHERE p.id = d.property_id),
      ''
    ) || ' ' || COALESCE(d.notes, '') || ' ' || COALESCE(d.stage, '') || ' ' || COALESCE(d.deal_type, '')
  ),
  embedding_indexed_at = NOW()
WHERE
  (search_text IS NULL OR embedding IS NULL);

-- ============================================================================
-- Verify backfill results
-- ============================================================================

-- Count contacts with embeddings
DO $$
DECLARE
  contacts_count int;
  properties_count int;
  deals_count int;
BEGIN
  SELECT COUNT(*) INTO contacts_count FROM public.contacts WHERE embedding IS NOT NULL;
  SELECT COUNT(*) INTO properties_count FROM public.properties WHERE embedding IS NOT NULL;
  SELECT COUNT(*) INTO deals_count FROM public.deals WHERE embedding IS NOT NULL;

  RAISE NOTICE 'Backfill complete:';
  RAISE NOTICE '  Contacts with embeddings: %', contacts_count;
  RAISE NOTICE '  Properties with embeddings: %', properties_count;
  RAISE NOTICE '  Deals with embeddings: %', deals_count;
END $$;
