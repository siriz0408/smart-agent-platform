-- Fix trigger timing issue with GENERATED columns
-- GENERATED columns compute AFTER BEFORE triggers, so search_text is NULL during trigger execution
-- Solution: Compute search_text manually in the trigger

-- ============================================================================
-- Updated trigger function: Auto-index contacts with inline search_text computation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  computed_search_text text;
BEGIN
  -- Manually compute search_text (same logic as GENERATED column)
  computed_search_text := COALESCE(NEW.first_name || ' ', '') ||
    COALESCE(NEW.last_name || ' ', '') ||
    COALESCE(NEW.company || ' ', '') ||
    COALESCE(NEW.email || ' ', '') ||
    COALESCE(NEW.notes, '');

  -- Generate embedding if search_text exists
  IF computed_search_text IS NOT NULL AND computed_search_text != '' THEN
    NEW.embedding := generate_deterministic_embedding(computed_search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Updated trigger function: Auto-index properties with inline search_text computation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_property()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  computed_search_text text;
BEGIN
  -- Manually compute search_text (same logic as GENERATED column)
  computed_search_text := COALESCE(NEW.address || ' ', '') ||
    COALESCE(NEW.city || ' ', '') ||
    COALESCE(NEW.state || ' ', '') ||
    COALESCE(NEW.zip_code || ' ', '') ||
    COALESCE(NEW.description, '');

  -- Generate embedding if search_text exists
  IF computed_search_text IS NOT NULL AND computed_search_text != '' THEN
    NEW.embedding := generate_deterministic_embedding(computed_search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Updated trigger function: Auto-index deals with inline search_text computation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_index_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  property_text text;
  contact_text text;
  computed_search_text text;
BEGIN
  -- Get related property text (if property_id exists)
  IF NEW.property_id IS NOT NULL THEN
    SELECT COALESCE(address || ' ' || city || ' ' || state, '')
    INTO property_text
    FROM properties
    WHERE id = NEW.property_id;
  ELSE
    property_text := '';
  END IF;

  -- Get related contact text (if contact_id exists)
  IF NEW.contact_id IS NOT NULL THEN
    SELECT COALESCE(first_name || ' ' || last_name || ' ' || company, '')
    INTO contact_text
    FROM contacts
    WHERE id = NEW.contact_id;
  ELSE
    contact_text := '';
  END IF;

  -- Compute search_text
  computed_search_text := property_text || ' ' ||
    contact_text || ' ' ||
    COALESCE(NEW.stage, '') || ' ' ||
    COALESCE(NEW.deal_type, '') || ' ' ||
    COALESCE(NEW.notes, '');

  -- Update NEW.search_text (so GENERATED column gets the right value)
  NEW.search_text := computed_search_text;

  -- Generate embedding
  IF computed_search_text IS NOT NULL AND computed_search_text != '' THEN
    NEW.embedding := generate_deterministic_embedding(computed_search_text);
    NEW.embedding_indexed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the old update_deal_search_text trigger (no longer needed)
DROP TRIGGER IF EXISTS trigger_update_deal_search_text ON deals;
