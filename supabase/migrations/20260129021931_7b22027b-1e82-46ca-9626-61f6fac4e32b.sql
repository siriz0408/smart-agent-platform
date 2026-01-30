-- =====================================================
-- Smart Agent Platform - Backend Schema Updates
-- Sprints 2-4: Complete Implementation
-- =====================================================

-- =====================================================
-- PHASE 1A: Create Deal Stage Enums
-- =====================================================

-- Buyer journey stages (13 stages)
CREATE TYPE public.deal_stage_buyer AS ENUM (
  'browsing', 'interested', 'touring', 'offer_prep', 'offer_submitted',
  'negotiating', 'under_contract', 'inspection', 'appraisal',
  'final_walkthrough', 'closing', 'closed', 'lost'
);

-- Seller journey stages (11 stages)
CREATE TYPE public.deal_stage_seller AS ENUM (
  'preparing', 'listed', 'showing', 'offer_received', 'negotiating',
  'under_contract', 'inspection', 'appraisal', 'closing', 'closed', 'withdrawn'
);

-- =====================================================
-- PHASE 1B: Alter Profiles Table
-- =====================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS primary_role public.app_role DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS can_switch_roles BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_platform_user BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_primary_role ON public.profiles(primary_role);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_users ON public.profiles(is_platform_user) WHERE is_platform_user = true;

-- =====================================================
-- PHASE 1C: Alter Deals Table for Journey Tracking
-- =====================================================

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS seller_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS buyer_stage public.deal_stage_buyer,
  ADD COLUMN IF NOT EXISTS seller_stage public.deal_stage_seller;

CREATE INDEX IF NOT EXISTS idx_deals_buyer_user ON public.deals(buyer_user_id) WHERE buyer_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_seller_user ON public.deals(seller_user_id) WHERE seller_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_buyer_stage ON public.deals(buyer_stage) WHERE buyer_stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_seller_stage ON public.deals(seller_stage) WHERE seller_stage IS NOT NULL;

-- RLS policies for buyer/seller deal access
CREATE POLICY "Buyers can view their own deals" 
  ON public.deals FOR SELECT TO authenticated 
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Sellers can view their own deals" 
  ON public.deals FOR SELECT TO authenticated 
  USING (auth.uid() = seller_user_id);

-- =====================================================
-- PHASE 1D: Alter Properties and Contacts Tables
-- =====================================================

-- Add address normalization to contacts
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id);

CREATE INDEX IF NOT EXISTS idx_contacts_address ON public.contacts(address_id) WHERE address_id IS NOT NULL;

-- Add address normalization and seller link to properties
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id),
  ADD COLUMN IF NOT EXISTS seller_contact_id UUID REFERENCES public.contacts(id);

CREATE INDEX IF NOT EXISTS idx_properties_address ON public.properties(address_id) WHERE address_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_seller ON public.properties(seller_contact_id) WHERE seller_contact_id IS NOT NULL;

-- =====================================================
-- PHASE 1E: Create Document Projects Tables
-- =====================================================

-- Document projects table for organizing documents
CREATE TABLE IF NOT EXISTS public.document_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_projects_tenant ON public.document_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_projects_created_by ON public.document_projects(created_by);

ALTER TABLE public.document_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their tenant" 
  ON public.document_projects FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create projects in their tenant" 
  ON public.document_projects FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update projects in their tenant" 
  ON public.document_projects FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete their own projects" 
  ON public.document_projects FOR DELETE
  USING (created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_document_projects_updated_at 
  BEFORE UPDATE ON public.document_projects 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Document project members junction table
CREATE TABLE IF NOT EXISTS public.document_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.document_projects(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_project_members_project ON public.document_project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_project_members_document ON public.document_project_members(document_id);

ALTER TABLE public.document_project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project members in their tenant" 
  ON public.document_project_members FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.document_projects 
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Users can add documents to projects in their tenant" 
  ON public.document_project_members FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM public.document_projects 
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Users can remove documents from projects in their tenant" 
  ON public.document_project_members FOR DELETE
  USING (project_id IN (
    SELECT id FROM public.document_projects 
    WHERE tenant_id = public.get_user_tenant_id(auth.uid())
  ));

-- Add project_id to documents table
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.document_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id) WHERE project_id IS NOT NULL;

-- =====================================================
-- PHASE 1F: Alter Subscriptions Table
-- =====================================================

ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end) WHERE trial_end IS NOT NULL;