-- Migration: Alter deals table to add journey tracking
-- Part of Phase 2 Architecture Revamp - Sprint 2.1.8

-- Create buyer journey stages enum
CREATE TYPE public.deal_stage_buyer AS ENUM (
  'browsing',
  'interested',
  'touring',
  'offer_prep',
  'offer_submitted',
  'negotiating',
  'under_contract',
  'inspection',
  'appraisal',
  'final_walkthrough',
  'closing',
  'closed',
  'lost'
);

-- Create seller journey stages enum
CREATE TYPE public.deal_stage_seller AS ENUM (
  'preparing',
  'listed',
  'showing',
  'offer_received',
  'negotiating',
  'under_contract',
  'inspection',
  'appraisal',
  'closing',
  'closed',
  'withdrawn'
);

-- Add buyer user reference (for platform buyers viewing their deals)
ALTER TABLE public.deals ADD COLUMN buyer_user_id UUID REFERENCES auth.users(id);

-- Add seller user reference (for platform sellers viewing their deals)
ALTER TABLE public.deals ADD COLUMN seller_user_id UUID REFERENCES auth.users(id);

-- Add typed stage columns for buyer and seller journeys
ALTER TABLE public.deals ADD COLUMN buyer_stage deal_stage_buyer;
ALTER TABLE public.deals ADD COLUMN seller_stage deal_stage_seller;

-- Create indexes for buyer/seller queries
CREATE INDEX idx_deals_buyer_user ON public.deals(buyer_user_id) WHERE buyer_user_id IS NOT NULL;
CREATE INDEX idx_deals_seller_user ON public.deals(seller_user_id) WHERE seller_user_id IS NOT NULL;
CREATE INDEX idx_deals_buyer_stage ON public.deals(buyer_stage) WHERE buyer_stage IS NOT NULL;
CREATE INDEX idx_deals_seller_stage ON public.deals(seller_stage) WHERE seller_stage IS NOT NULL;

-- Update RLS policies to allow buyers and sellers to view their own deals
CREATE POLICY "Buyers can view their own deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Sellers can view their own deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_user_id);

-- Comments
COMMENT ON COLUMN public.deals.buyer_user_id IS 'Platform user who is the buyer in this deal';
COMMENT ON COLUMN public.deals.seller_user_id IS 'Platform user who is the seller in this deal';
COMMENT ON COLUMN public.deals.buyer_stage IS 'Current stage in the buyer journey';
COMMENT ON COLUMN public.deals.seller_stage IS 'Current stage in the seller journey';
