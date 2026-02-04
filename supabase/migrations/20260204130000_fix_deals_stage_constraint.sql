-- Fix deals stage constraint to include seller-specific stages
-- Issue: Seller deals with 'listing' or 'active' stages fail to insert due to CHECK constraint

-- Drop the existing constraint
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_stage_check;

-- Add new constraint including seller stages
ALTER TABLE public.deals 
  ADD CONSTRAINT deals_stage_check 
  CHECK (stage IN (
    'lead', 
    'contacted', 
    'showing', 
    'offer', 
    'listing',      -- New: Seller stage for listing signed
    'active',       -- New: Seller stage for active listing
    'under_contract', 
    'pending', 
    'closed', 
    'lost'
  ));

-- Add comment explaining the stages
COMMENT ON COLUMN public.deals.stage IS 'Deal stage. Buyer stages: lead, contacted, showing, offer, under_contract, pending, closed, lost. Seller stages: lead, contacted, listing, active, under_contract, pending, closed, lost.';
