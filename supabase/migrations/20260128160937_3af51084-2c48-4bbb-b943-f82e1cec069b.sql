-- Enable pgvector for document embeddings (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'agent', 'buyer', 'seller');

-- Create tenants table (organizations)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  title TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

-- Create contacts table (CRM)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  contact_type TEXT DEFAULT 'lead' CHECK (contact_type IN ('lead', 'buyer', 'seller', 'agent', 'vendor')),
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_agents table (relationship between contacts and agents)
CREATE TABLE public.contact_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  agent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (contact_id, agent_user_id)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  property_type TEXT DEFAULT 'single_family' CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'off_market', 'coming_soon')),
  price DECIMAL(12, 2),
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  square_feet INTEGER,
  lot_size DECIMAL(10, 2),
  year_built INTEGER,
  description TEXT,
  ai_description TEXT,
  features TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  mls_number TEXT,
  listing_agent_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deals table (transactions)
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('buyer', 'seller', 'dual')),
  stage TEXT DEFAULT 'lead' CHECK (stage IN ('lead', 'contacted', 'showing', 'offer', 'under_contract', 'pending', 'closed', 'lost')),
  estimated_value DECIMAL(12, 2),
  commission_rate DECIMAL(5, 2),
  expected_close_date DATE,
  actual_close_date DATE,
  notes TEXT,
  agent_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_milestones table
CREATE TABLE public.deal_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'other' CHECK (category IN ('contract', 'disclosure', 'inspection', 'appraisal', 'title', 'other')),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  indexed_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table for RAG
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI agents table (marketplace)
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'bot',
  category TEXT DEFAULT 'general',
  is_certified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  system_prompt TEXT,
  workflow JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_agents table (activated agents per user)
CREATE TABLE public.user_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_id)
);

-- Create subscriptions table (Stripe)
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'team', 'brokerage')),
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_records table
CREATE TABLE public.usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('ai_query', 'document_upload', 'storage')),
  quantity INTEGER DEFAULT 1,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their tenant"
  ON public.profiles FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their tenant"
  ON public.user_roles FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage roles in their tenant"
  ON public.user_roles FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- RLS Policies for contacts
CREATE POLICY "Users can view contacts in their tenant"
  ON public.contacts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert contacts in their tenant"
  ON public.contacts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update contacts in their tenant"
  ON public.contacts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete contacts in their tenant"
  ON public.contacts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS Policies for contact_agents
CREATE POLICY "Users can view contact_agents for their contacts"
  ON public.contact_agents FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Users can manage contact_agents for their contacts"
  ON public.contact_agents FOR ALL
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

-- RLS Policies for properties
CREATE POLICY "Users can view properties in their tenant"
  ON public.properties FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert properties in their tenant"
  ON public.properties FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update properties in their tenant"
  ON public.properties FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete properties in their tenant"
  ON public.properties FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS Policies for deals
CREATE POLICY "Users can view deals in their tenant"
  ON public.deals FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert deals in their tenant"
  ON public.deals FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update deals in their tenant"
  ON public.deals FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete deals in their tenant"
  ON public.deals FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS Policies for deal_milestones
CREATE POLICY "Users can view deal_milestones for their deals"
  ON public.deal_milestones FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Users can manage deal_milestones for their deals"
  ON public.deal_milestones FOR ALL
  USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their tenant"
  ON public.documents FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert documents in their tenant"
  ON public.documents FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update documents in their tenant"
  ON public.documents FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete documents in their tenant"
  ON public.documents FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS Policies for document_chunks
CREATE POLICY "Users can view document_chunks for their documents"
  ON public.document_chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

-- RLS Policies for ai_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON public.ai_conversations FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for ai_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.ai_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_conversations WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ai_agents
CREATE POLICY "Users can view public agents or agents in their tenant"
  ON public.ai_agents FOR SELECT
  USING (
    is_public = true 
    OR tenant_id IS NULL 
    OR tenant_id = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Users can insert agents in their tenant"
  ON public.ai_agents FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update agents they created"
  ON public.ai_agents FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete agents they created"
  ON public.ai_agents FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for user_agents
CREATE POLICY "Users can view their own activated agents"
  ON public.user_agents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own activated agents"
  ON public.user_agents FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their tenant subscription"
  ON public.subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can update their tenant subscription"
  ON public.subscriptions FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- RLS Policies for usage_records
CREATE POLICY "Users can view usage in their tenant"
  ON public.usage_records FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert usage in their tenant"
  ON public.usage_records FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for vector similarity search
CREATE INDEX ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);