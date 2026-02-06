-- Migration: Milestone System Improvements
-- Part of TRX-004: Audit milestone system
-- Adds indexes, constraints, and validations for better performance and data integrity

-- 1. Add indexes for performance
-- Index on due_date for reminder queries and sorting
CREATE INDEX IF NOT EXISTS idx_deal_milestones_due_date 
  ON public.deal_milestones(due_date) 
  WHERE completed_at IS NULL;

-- Composite index for milestone indicator queries (deal_id + completed_at)
CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_completed 
  ON public.deal_milestones(deal_id, completed_at) 
  WHERE completed_at IS NULL;

-- Composite index for sorting milestones by deal and due date
CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_due_date 
  ON public.deal_milestones(deal_id, due_date NULLS LAST);

-- 2. Add check constraints for data integrity

-- Prevent completed_at from being set before due_date (if due_date exists)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_completed_after_due;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_completed_after_due 
  CHECK (
    completed_at IS NULL 
    OR due_date IS NULL 
    OR completed_at::date >= due_date
  );

-- Prevent completed_at from being in the future (more than 1 day tolerance for timezone issues)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_completed_not_future;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_completed_not_future 
  CHECK (
    completed_at IS NULL 
    OR completed_at <= (NOW() + INTERVAL '1 day')
  );

-- Prevent due_date from being unreasonably far in the past (more than 10 years)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_due_date_reasonable_past;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_due_date_reasonable_past 
  CHECK (
    due_date IS NULL 
    OR due_date >= (CURRENT_DATE - INTERVAL '10 years')
  );

-- Prevent due_date from being unreasonably far in the future (more than 5 years)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_due_date_reasonable_future;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_due_date_reasonable_future 
  CHECK (
    due_date IS NULL 
    OR due_date <= (CURRENT_DATE + INTERVAL '5 years')
  );

-- 3. Add length constraints on title and notes
-- Note: PostgreSQL TEXT type doesn't have built-in length limits,
-- so we'll add check constraints instead of changing column types

-- Title length constraint (max 100 characters)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_title_length;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_title_length 
  CHECK (LENGTH(title) <= 100);

-- Notes length constraint (max 500 characters)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS check_notes_length;

ALTER TABLE public.deal_milestones
  ADD CONSTRAINT check_notes_length 
  CHECK (notes IS NULL OR LENGTH(notes) <= 500);

-- 4. Add unique constraint to prevent duplicate milestones
-- Prevent same title for same deal (allows different deals to have same milestone titles)
ALTER TABLE public.deal_milestones
  DROP CONSTRAINT IF EXISTS unique_deal_milestone_title;

-- Only enforce uniqueness for incomplete milestones (completed milestones can have duplicates)
-- This allows recreating a milestone after completion
CREATE UNIQUE INDEX IF NOT EXISTS unique_deal_milestone_title_incomplete
  ON public.deal_milestones(deal_id, LOWER(TRIM(title)))
  WHERE completed_at IS NULL;

-- Comments for documentation
COMMENT ON CONSTRAINT check_completed_after_due ON public.deal_milestones IS 
  'Ensures completed_at is not before due_date (if both exist)';

COMMENT ON CONSTRAINT check_completed_not_future ON public.deal_milestones IS 
  'Prevents completed_at from being set in the future (1 day tolerance for timezone issues)';

COMMENT ON CONSTRAINT check_due_date_reasonable_past ON public.deal_milestones IS 
  'Prevents due_date from being more than 10 years in the past';

COMMENT ON CONSTRAINT check_due_date_reasonable_future ON public.deal_milestones IS 
  'Prevents due_date from being more than 5 years in the future';

COMMENT ON CONSTRAINT check_title_length ON public.deal_milestones IS 
  'Ensures title does not exceed 100 characters';

COMMENT ON CONSTRAINT check_notes_length ON public.deal_milestones IS 
  'Ensures notes do not exceed 500 characters';

COMMENT ON INDEX unique_deal_milestone_title_incomplete IS 
  'Prevents duplicate milestone titles for the same deal (only for incomplete milestones)';
