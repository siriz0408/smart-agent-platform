# Smart Agent Platform - Technical Architecture

**Version:** 3.0
**Last Updated:** February 6, 2026
**Status:** Living Document

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Architecture](#2-database-architecture)
3. [Security & RLS Policies](#3-security--rls-policies)
4. [AI & RAG Pipeline](#4-ai--rag-pipeline)
5. [Edge Functions](#5-edge-functions)
6. [Frontend Architecture](#6-frontend-architecture)
7. [API Design](#7-api-design)
8. [Performance & Optimization](#8-performance--optimization)
9. [Deployment Architecture](#9-deployment-architecture)

---

## 1. System Overview

### 1.1 Technology Stack

**Frontend**
- React 18 (functional components, hooks)
- TypeScript 5.8 (strict mode)
- Vite 5.4 (build tool)
- Tailwind CSS 3.4 + shadcn/ui
- React Query (TanStack Query 5.x) for server state
- React Router v6 for routing
- Capacitor 8.0 for mobile (iOS/Android)

**Backend**
- Supabase (managed PostgreSQL 15 + Auth + Storage + Realtime)
- Edge Functions (Deno runtime)
- PostgreSQL extensions: pgvector, pg_trgm, uuid-ossp

**AI & ML**
- Anthropic Claude API (claude-sonnet-4-20250514)
- Deterministic hash-based embeddings (1536 dimensions)
- Future: Gemini, Perplexity, OpenAI integration

**Infrastructure**
- Vercel (frontend hosting + CDN)
- Supabase Cloud (database + backend)
- Stripe (billing)
- GitHub (source control + CI/CD)

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Web Browser  │  │  iOS App     │  │ Android App  │      │
│  │ (Vercel CDN) │  │ (Capacitor)  │  │ (Capacitor)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │   (Supabase)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐   ┌────────▼────────┐  ┌────▼────┐
    │ PostgreSQL│   │  Edge Functions │  │ Storage │
    │ + pgvector│   │     (Deno)      │  │ Bucket  │
    └───────────┘   └─────────────────┘  └─────────┘
                             │
                    ┌────────▼────────┐
                    │  External APIs  │
                    │  (Claude, Stripe)│
                    └─────────────────┘
```

---

## 2. Database Architecture

### 2.1 Multi-Workspace Model

**Workspaces (formerly Tenants)**
- Users can belong to multiple workspaces
- Each workspace is a brokerage, team, or personal workspace
- Workspace isolation enforced via Row-Level Security (RLS)

**Key Tables:**
```sql
-- Workspaces (organizations)
workspaces (
  id UUID PRIMARY KEY,
  name TEXT,
  slug TEXT UNIQUE,
  settings JSONB
)

-- Workspace membership (many-to-many)
workspace_memberships (
  id UUID PRIMARY KEY,
  workspace_id UUID → workspaces(id),
  user_id UUID → auth.users(id),
  role TEXT, -- 'admin', 'agent'
  joined_at TIMESTAMPTZ
)

-- User profiles
profiles (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id) UNIQUE,
  active_workspace_id UUID → workspaces(id),
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT
)
```

**Workspace Switching:**
- User selects workspace from dropdown
- `active_workspace_id` updated in profiles
- All subsequent queries filter by active workspace
- Seamless data context switch

### 2.2 Complete Schema

#### Core Tables

**workspaces**
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**workspace_memberships**
```sql
CREATE TABLE workspace_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX idx_workspace_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);
```

**profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  active_workspace_id UUID REFERENCES workspaces(id),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  headline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**user_preferences** ⭐ NEW
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- Search preferences
  price_min INTEGER,
  price_max INTEGER,
  preferred_beds INTEGER,
  preferred_baths NUMERIC(3,1),
  preferred_areas TEXT[],
  preferred_property_types TEXT[],
  -- Timeline
  target_move_date DATE,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'urgent')),
  -- Financial
  pre_approval_status TEXT CHECK (pre_approval_status IN ('none', 'in_progress', 'approved')),
  pre_approval_amount INTEGER,
  lender_name TEXT,
  -- Communication
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'any')),
  best_time_to_call TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

#### CRM Tables

**contacts**
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  -- Contact-user linking ⭐ NEW
  user_id UUID REFERENCES auth.users(id), -- Links to platform user
  ownership_type TEXT DEFAULT 'workspace' CHECK (ownership_type IN ('personal', 'workspace')),
  linked_from_user BOOLEAN DEFAULT FALSE,
  -- Standard fields
  type TEXT CHECK (type IN ('buyer', 'seller', 'both')),
  source TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address_json JSONB,
  tags TEXT[],
  custom_fields_json JSONB,
  notes TEXT,
  preferred_contact_method TEXT,
  -- CRM enrichment
  lead_score INTEGER,
  lifecycle_stage TEXT,
  enrichment_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_contacts_workspace_id ON contacts(workspace_id);
CREATE INDEX idx_contacts_created_by ON contacts(created_by);
CREATE INDEX idx_contacts_user_id ON contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_contacts_ownership_type ON contacts(ownership_type);
CREATE INDEX idx_contacts_email ON contacts(email);
```

**properties**
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  mls_id TEXT,
  address_id UUID REFERENCES addresses(id),
  -- Property details
  property_type TEXT CHECK (property_type IN ('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial')),
  beds INTEGER,
  baths NUMERIC(3,1),
  sqft INTEGER,
  lot_size NUMERIC(10,2),
  year_built INTEGER,
  -- Pricing
  price INTEGER,
  price_per_sqft NUMERIC(10,2),
  status TEXT CHECK (status IN ('active', 'pending', 'sold', 'off_market', 'expired')),
  -- Ownership
  listing_agent_id UUID REFERENCES profiles(id),
  listing_date DATE,
  sold_date DATE,
  -- Content
  description TEXT,
  features_json JSONB,
  -- Marketing ⭐ NEW
  virtual_tour_url TEXT,
  social_share_metadata JSONB,
  marketing_headline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_properties_workspace_id ON properties(workspace_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_price ON properties(price);
```

**deals**
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  property_id UUID REFERENCES properties(id),
  agent_id UUID REFERENCES profiles(id),
  -- Deal details
  deal_type TEXT CHECK (deal_type IN ('buy', 'sell')),
  stage TEXT NOT NULL,
  expected_close_date DATE,
  actual_close_date DATE,
  -- Financials
  list_price INTEGER,
  sale_price INTEGER,
  commission_percent NUMERIC(5,2),
  commission_amount INTEGER,
  -- Metadata
  notes TEXT,
  metadata_json JSONB,
  journey_metadata JSONB, -- Buyer journey tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_deals_workspace_id ON deals(workspace_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);
```

#### Documents & AI Tables

**documents**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  -- Storage
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  -- Classification
  doc_type TEXT CHECK (doc_type IN ('contract', 'disclosure', 'inspection', 'appraisal', 'marketing', 'other')),
  -- Associations
  deal_id UUID REFERENCES deals(id),
  property_id UUID REFERENCES properties(id),
  -- Indexing
  indexing_status TEXT DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
  indexing_error TEXT,
  -- Metadata
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_indexing_status ON documents(indexing_status);
```

**document_chunks** (RAG)
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- pgvector extension
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

**ai_conversations**
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT CHECK (context_type IN ('general', 'document', 'property', 'deal')),
  context_id UUID, -- Reference to relevant entity
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_workspace_id ON ai_conversations(workspace_id);
```

**ai_agents**
```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  tools_config_json JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  price_monthly INTEGER,
  created_by UUID REFERENCES auth.users(id),
  category TEXT,
  rating_avg NUMERIC(3,2),
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ai_agents_slug ON ai_agents(slug);
CREATE INDEX idx_ai_agents_category ON ai_agents(category);
```

#### Messaging Tables

**conversations**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('direct', 'group', 'ai')),
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_conversations_workspace_id ON conversations(workspace_id);
```

**messages**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
```

**user_presence** (Real-time)
```sql
CREATE TABLE user_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  status TEXT CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_presence_workspace_id ON user_presence(workspace_id);
```

#### Billing Tables

**subscriptions**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  tier TEXT CHECK (tier IN ('free', 'starter', 'professional', 'team', 'brokerage')),
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
```

**usage_records**
```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  ai_queries_used INTEGER DEFAULT 0,
  ai_queries_limit INTEGER,
  docs_uploaded INTEGER DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usage_records_workspace_id ON usage_records(workspace_id);
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
```

### 2.3 Database Functions

**Helper Functions:**

```sql
-- Get user's tenant/workspace ID (used in RLS policies)
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_uuid UUID)
RETURNS UUID
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT active_workspace_id FROM profiles WHERE user_id = user_uuid;
$$;

-- Check if user is workspace admin
CREATE OR REPLACE FUNCTION is_workspace_admin_for_tenant(tenant_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_memberships
    WHERE workspace_id = tenant_uuid
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = TRUE;
$$;

-- Find user by email (for contact-user linking)
CREATE OR REPLACE FUNCTION find_user_by_email(_email TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  linked_contact_count BIGINT
)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT
    p.user_id,
    au.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    (SELECT COUNT(*) FROM contacts
     WHERE user_id = p.user_id
     AND workspace_id = get_user_tenant_id(auth.uid())) AS linked_contact_count
  FROM profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE LOWER(au.email) = LOWER(TRIM(_email))
    AND LENGTH(_email) <= 255
    AND _email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  LIMIT 1;
$$;
```

---

## 3. Security & RLS Policies

### 3.1 Row-Level Security (RLS) Overview

**Design Principles:**
- All workspace-scoped tables have RLS enabled
- Policies enforce workspace isolation at database level
- SECURITY DEFINER functions bypass RLS for helper queries
- Direct `auth.uid()` checks avoid subquery recursion
- Super admin bypasses all policies

**Policy Pattern:**
```sql
CREATE POLICY "policy_name"
  ON table_name
  FOR operation
  TO authenticated
  USING (
    is_super_admin() OR
    workspace_id = get_user_tenant_id(auth.uid())
  );
```

### 3.2 Contacts Table Policies

**Agent-Level Isolation:**
```sql
-- SELECT: Users see only their own contacts (or workspace-wide if admin)
CREATE POLICY "contacts_select_own"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR
    created_by = auth.uid() OR
    is_workspace_admin_for_tenant(workspace_id)
  );

-- SELECT: Platform users see contacts linked to them
CREATE POLICY "contacts_select_linked_to_user"
  ON contacts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Users can create contacts in their workspace
CREATE POLICY "contacts_insert_own"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id = get_user_tenant_id(auth.uid()));

-- UPDATE: Creators or admins can update
CREATE POLICY "contacts_update_own_or_admin"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    is_workspace_admin_for_tenant(workspace_id)
  )
  WITH CHECK (workspace_id = get_user_tenant_id(auth.uid()));

-- DELETE: Creators or admins can delete
CREATE POLICY "contacts_delete_own_or_admin"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    is_workspace_admin_for_tenant(workspace_id)
  );
```

### 3.3 User Preferences Policies

**Read-Only for Agents:**
```sql
-- SELECT: Users manage their own preferences
CREATE POLICY "users_view_own_preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Agents can view preferences of linked contacts (read-only)
CREATE POLICY "agents_read_contact_preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT user_id FROM contacts
      WHERE created_by = auth.uid()
        AND workspace_id = get_user_tenant_id(auth.uid())
    )
  );

-- INSERT/UPDATE/DELETE: Only the user themselves
CREATE POLICY "users_manage_own_preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 3.4 Documents Table Policies

```sql
-- SELECT: Users see documents in their workspace
CREATE POLICY "documents_select_workspace"
  ON documents FOR SELECT
  TO authenticated
  USING (workspace_id = get_user_tenant_id(auth.uid()));

-- INSERT: Users can upload to their workspace
CREATE POLICY "documents_insert_own"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id = get_user_tenant_id(auth.uid()) AND
    uploaded_by = auth.uid()
  );

-- DELETE: Uploader or admin can delete
CREATE POLICY "documents_delete_own_or_admin"
  ON documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    is_workspace_admin_for_tenant(workspace_id)
  );
```

### 3.5 Document Chunks Policies

```sql
-- SELECT: Users can view chunks for documents in their workspace
CREATE POLICY "document_chunks_select_workspace"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE workspace_id = get_user_tenant_id(auth.uid())
    )
  );
```

### 3.6 Workspace Policies

```sql
-- SELECT: Users see workspaces they belong to
CREATE POLICY "workspace_select_member"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create workspace
CREATE POLICY "workspace_insert_authenticated"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- UPDATE: Workspace admins can update
CREATE POLICY "workspace_update_admin"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (is_workspace_admin_for_tenant(id))
  WITH CHECK (is_workspace_admin_for_tenant(id));
```

---

## 4. AI & RAG Pipeline

### 4.1 Document Indexing Flow

**Step-by-Step Process:**

```
1. Upload
   ├─ User uploads PDF/DOCX via Supabase Storage
   ├─ Frontend gets signed URL from Supabase
   └─ Document record created in `documents` table

2. Trigger
   ├─ Database trigger fires on INSERT into `documents`
   └─ Calls `index-document` Edge Function

3. Text Extraction
   ├─ PDF: pdfjs-serverless library
   ├─ DOCX: mammoth library
   ├─ TXT: TextDecoder
   └─ Extract full text content

4. Document Type Detection
   ├─ Keyword matching on content
   ├─ Types: settlement, inspection, contract, appraisal, disclosure, general
   └─ Stored in `documents.doc_type`

5. Smart Chunking
   ├─ Settlement/Contract: Section-aware (preserves document structure)
   ├─ Inspection: System-based (HVAC, Plumbing, Electrical)
   ├─ Default: Paragraph-aware with 200-char overlap
   ├─ Max chunk size: 2000 characters
   ├─ Max chunks per document: 100
   └─ Chunks stored with metadata (page, section, etc.)

6. Embedding Generation
   ├─ Deterministic hash-based algorithm
   ├─ Uses n-grams (unigrams, bigrams, trigrams)
   ├─ L2 normalization
   ├─ Output: 1536-dimensional vector
   └─ Stored in `document_chunks.embedding` (pgvector)

7. AI Summary Generation
   ├─ Type-specific prompts
   ├─ Anthropic Claude API
   ├─ Streaming response
   └─ Stored in `documents.metadata_json.summary`

8. Status Update
   ├─ Mark `documents.indexing_status` = 'completed'
   └─ Indexing job progress tracked in `document_indexing_jobs`
```

### 4.2 Deterministic Hash-Based Embeddings

**Why Not OpenAI?**
- Eliminates external API costs ($0.0001/1K tokens = $100-500/mo at scale)
- Consistency: Same text always produces same embedding
- Performance: Faster than API calls
- Privacy: No data sent to OpenAI

**Algorithm:**
```typescript
function generateEmbedding(text: string): number[] {
  const features = [];

  // 1. Character n-grams
  for (let n = 1; n <= 3; n++) {
    const ngrams = extractNGrams(text, n);
    features.push(...hashNGrams(ngrams));
  }

  // 2. Word-level features
  const words = tokenize(text);
  features.push(...hashWords(words));

  // 3. Normalize to 1536 dimensions
  const embedding = padOrTruncate(features, 1536);

  // 4. L2 normalization (for cosine similarity)
  return l2Normalize(embedding);
}
```

**Trade-offs:**
- ✅ Pro: No cost, fast, consistent
- ⚠️ Con: Lower quality than OpenAI (but sufficient for real estate docs)
- ⚠️ Con: No transfer learning (doesn't benefit from pre-training)

### 4.3 Query Expansion

**Real Estate Domain Synonyms:**
```typescript
const expansionMap = {
  "inspection": ["inspector", "condition", "defect", "issue", "repair"],
  "price": ["cost", "value", "amount", "dollar", "payment"],
  "closing": ["settlement", "escrow", "transaction"],
  "offer": ["bid", "proposal", "purchase agreement"],
  "appraisal": ["valuation", "assessment", "estimated value"]
};

function expandQuery(query: string): string {
  for (const [term, synonyms] of Object.entries(expansionMap)) {
    if (query.toLowerCase().includes(term)) {
      return `${query} ${synonyms.join(" ")}`;
    }
  }
  return query;
}
```

### 4.4 Hybrid Search

**Combines Multiple Strategies:**

```sql
-- RPC Function: search_documents_hybrid()
CREATE OR REPLACE FUNCTION search_documents_hybrid(
  query_text TEXT,
  query_embedding vector(1536),
  workspace_uuid UUID,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.content,
    -- Vector similarity (cosine distance)
    1 - (c.embedding <=> query_embedding) AS similarity,
    -- Full-text search rank
    ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) AS text_rank,
    -- Combined score (weighted average)
    (
      (1 - (c.embedding <=> query_embedding)) * 0.6 + -- 60% vector
      ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) * 0.4 -- 40% text
    ) AS combined_score
  FROM document_chunks c
  JOIN documents d ON d.id = c.document_id
  WHERE d.workspace_id = workspace_uuid
  ORDER BY combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

**Fallback Strategy:**
```typescript
async function searchDocuments(query: string, workspace_id: string) {
  // 1. Try hybrid search
  let results = await hybridSearch(query, workspace_id);

  // 2. If insufficient results, try ILIKE keyword search
  if (results.length < 3) {
    const keywordResults = await supabase
      .from('document_chunks')
      .select('*')
      .ilike('content', `%${query}%`)
      .limit(10);
    results = [...results, ...keywordResults];
  }

  return results;
}
```

### 4.5 Chunk Neighbors Retrieval

**For Context Continuity:**
```sql
-- RPC Function: get_chunk_neighbors()
CREATE OR REPLACE FUNCTION get_chunk_neighbors(
  target_chunk_id UUID
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_index INTEGER,
  content TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.chunk_index,
    c.content
  FROM document_chunks c
  WHERE c.document_id = (
    SELECT document_id FROM document_chunks WHERE id = target_chunk_id
  )
  AND c.chunk_index BETWEEN (
    (SELECT chunk_index FROM document_chunks WHERE id = target_chunk_id) - 1
  ) AND (
    (SELECT chunk_index FROM document_chunks WHERE id = target_chunk_id) + 1
  )
  ORDER BY c.chunk_index;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
- When a chunk is matched, retrieve chunk-1, chunk, and chunk+1
- Provides surrounding context to LLM
- Improves answer coherence

### 4.6 AI Chat Flow

```
1. User Query
   ├─ User enters question in AI chat
   ├─ Frontend sends to `ai-chat` Edge Function
   └─ Includes workspace_id, conversation_id

2. Query Expansion
   ├─ Expand query with real estate synonyms
   └─ Enhanced query: "inspection" → "inspection inspector condition defect"

3. Embedding Generation
   ├─ Generate embedding for expanded query
   └─ Uses same deterministic algorithm

4. Hybrid Search
   ├─ Vector similarity search (60% weight)
   ├─ Full-text search (40% weight)
   ├─ Retrieve top 10 chunks
   └─ Get chunk neighbors for context

5. Context Assembly
   ├─ Format retrieved chunks as context
   ├─ Include document metadata (filename, type, page)
   └─ Add citations [doc1:page5]

6. LLM Prompt
   ├─ System prompt: "You are a real estate expert..."
   ├─ Context: Retrieved document chunks
   ├─ User query
   └─ Send to Anthropic Claude API

7. Streaming Response
   ├─ Claude streams response via SSE
   ├─ Backend converts format for frontend
   ├─ Frontend displays streaming text
   └─ Citations rendered as clickable links

8. Save to Database
   ├─ Save user message to `ai_messages`
   ├─ Save assistant response to `ai_messages`
   ├─ Track tokens used in `usage_records`
   └─ Update conversation `updated_at`
```

---

## 5. Edge Functions

### 5.1 Edge Function Architecture

**Runtime:** Deno (TypeScript/JavaScript)
**Hosting:** Supabase Edge Functions
**Deployment:** `supabase functions deploy <function-name>`

**Key Functions:**

| Function | Purpose | Key Operations |
|----------|---------|----------------|
| `index-document` | Document indexing | PDF extraction, chunking, embeddings, AI summary |
| `ai-chat` | AI chat with RAG | Query expansion, hybrid search, Claude API, streaming |
| `search-documents` | Semantic search | Vector similarity, full-text search |
| `delete-document` | Document cleanup | Delete document + chunks + storage file |
| `execute-agent` | AI agent execution | Context gathering, Claude API, SSE streaming |
| `create-checkout-session` | Stripe checkout | Create Stripe session, redirect to checkout |
| `create-customer-portal` | Billing portal | Create Stripe portal session |
| `stripe-webhook` | Billing webhooks | Handle subscription events, update DB |
| `send-email` | Email notifications | Send via Resend API |
| `universal-search` | Cross-entity search | Search contacts, properties, documents, deals |

### 5.2 index-document Function

**Location:** `supabase/functions/index-document/index.ts`

**Flow:**
```typescript
export default async function handler(req: Request) {
  // 1. Parse request (document_id)
  const { document_id } = await req.json();

  // 2. Fetch document from database
  const doc = await getDocument(document_id);

  // 3. Download file from storage
  const file = await downloadFromStorage(doc.storage_path);

  // 4. Extract text based on file type
  const text = await extractText(file, doc.mime_type);

  // 5. Detect document type
  const docType = await detectDocumentType(text);
  await updateDocumentType(document_id, docType);

  // 6. Smart chunking
  const chunks = await smartChunk(text, docType);

  // 7. Generate embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = generateEmbedding(chunk.content);
    await saveChunk(document_id, chunk, embedding);
  }

  // 8. Generate AI summary
  const summary = await generateSummary(text, docType);
  await updateDocumentMetadata(document_id, { summary });

  // 9. Mark as completed
  await updateIndexingStatus(document_id, 'completed');

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 5.3 ai-chat Function

**Location:** `supabase/functions/ai-chat/index.ts`

**SSE Streaming:**
```typescript
export default async function handler(req: Request) {
  const { query, conversation_id, workspace_id } = await req.json();

  // Set up SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Expand query
        const expandedQuery = expandQuery(query);

        // 2. Generate embedding
        const embedding = generateEmbedding(expandedQuery);

        // 3. Hybrid search
        const chunks = await hybridSearch(expandedQuery, embedding, workspace_id);

        // 4. Get chunk neighbors
        const contextChunks = await getChunkNeighbors(chunks);

        // 5. Format context
        const context = formatContext(contextChunks);

        // 6. Call Claude API (streaming)
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
              { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
            ],
            stream: true
          })
        });

        // 7. Stream response to client
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert Anthropic SSE format to our format
          const text = new TextDecoder().decode(value);
          controller.enqueue(text);
        }

        // 8. Save to database
        await saveMessage(conversation_id, query, 'user');
        await saveMessage(conversation_id, fullResponse, 'assistant');

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

### 5.4 execute-agent Function

**Location:** `supabase/functions/execute-agent/index.ts`

**Agent Execution with Tool Connectors:**
```typescript
export default async function handler(req: Request) {
  const { agent_id, input_data, workspace_id } = await req.json();

  // 1. Fetch agent definition
  const agent = await getAgent(agent_id);

  // 2. Gather context based on input type
  let context = '';
  if (input_data.contact_id) {
    context += await getContactContext(input_data.contact_id);
  }
  if (input_data.property_id) {
    context += await getPropertyContext(input_data.property_id);
  }

  // 3. Get tool connectors for workspace
  const tools = await getWorkspaceToolConnectors(workspace_id);

  // 4. Build prompt
  const prompt = `
    ${agent.system_prompt}

    Context:
    ${context}

    Task:
    ${input_data.task}

    Available Tools:
    ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}
  `;

  // 5. Call Claude API with tool use
  const response = await callClaudeWithTools(prompt, tools);

  // 6. Execute approved actions
  for (const action of response.tool_calls) {
    if (action.requires_approval) {
      await createActionForApproval(action, workspace_id);
    } else {
      await executeToolAction(action);
    }
  }

  // 7. Return result
  return new Response(JSON.stringify({
    success: true,
    result: response.content,
    actions_created: response.tool_calls.length
  }));
}
```

---

## 6. Frontend Architecture

### 6.1 Component Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── contacts/        # Contact domain
│   │   ├── ContactDetailSheet.tsx
│   │   ├── ContactUserLinkModal.tsx
│   │   ├── UserPreferencesPanel.tsx
│   │   └── ContactOwnershipSwitch.tsx
│   ├── documents/       # Document domain
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentList.tsx
│   │   └── ChunkBrowser.tsx
│   ├── deals/           # Deal domain
│   │   ├── DealCard.tsx
│   │   ├── DealDetailSheet.tsx
│   │   └── StageColumn.tsx
│   ├── agents/          # AI agents domain
│   │   ├── AgentCard.tsx
│   │   ├── AgentExecutionSheet.tsx
│   │   └── AgentForm.tsx
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.ts
│   ├── useDocumentIndexing.ts
│   ├── useAIChat.ts
│   ├── useContactUserLink.ts
│   ├── useUserPreferences.ts
│   └── ...
├── pages/               # Route components
│   ├── Chat.tsx
│   ├── DocumentChat.tsx
│   ├── Contacts.tsx
│   ├── Properties.tsx
│   ├── Pipeline.tsx
│   ├── Agents.tsx
│   └── ...
└── lib/                 # Utilities
    ├── supabase.ts      # Supabase client
    ├── utils.ts         # Helper functions
    └── constants.ts     # Constants
```

### 6.2 State Management Strategy

**Server State (React Query):**
- All data fetching from Supabase
- Automatic caching, background refetching
- Optimistic updates
- Query invalidation on mutations

```typescript
// Example: useContacts hook
export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation with optimistic update
export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Contact) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newContact) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previous = queryClient.getQueryData(['contacts']);
      queryClient.setQueryData(['contacts'], (old: Contact[]) => [newContact, ...old]);
      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['contacts'], context.previous);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}
```

**Local State (useState, useContext):**
- UI state (modals, dropdowns, form inputs)
- Auth state (via AuthProvider)
- Workspace context (active workspace)

**Global State Avoided:**
- No Redux/Zustand - React Query handles server state
- Context only for auth and workspace
- Keep component state local when possible

### 6.3 Real-Time Subscriptions

**Supabase Realtime:**
```typescript
// Example: Real-time messages
useEffect(() => {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        // Add new message to React Query cache
        queryClient.setQueryData(['messages', conversationId], (old) => [
          ...old,
          payload.new
        ]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [conversationId]);
```

**Presence Tracking:**
```typescript
const channel = supabase.channel('workspace:presence', {
  config: { presence: { key: userId } }
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', Object.keys(state));
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() });
    }
  });
```

### 6.4 Mobile App (Capacitor)

**Configuration:**
```json
// capacitor.config.ts
{
  "appId": "com.smartagent.app",
  "appName": "Smart Agent",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#ffffff"
    },
    "StatusBar": {
      "style": "light",
      "backgroundColor": "#000000"
    }
  }
}
```

**Native Features:**
- Keyboard management
- Status bar styling
- Splash screen
- Push notifications (future)
- Camera access (future)

**Build Commands:**
```bash
npm run cap:sync          # Sync web → native
npm run cap:ios           # Open Xcode
npm run cap:android       # Open Android Studio
npm run cap:build:ios     # Build iOS
npm run cap:build:android # Build Android
```

---

## 7. API Design

### 7.1 REST Conventions

**Supabase Auto-Generated REST API:**
- GET `/rest/v1/contacts` - List contacts
- GET `/rest/v1/contacts?id=eq.{id}` - Get contact by ID
- POST `/rest/v1/contacts` - Create contact
- PATCH `/rest/v1/contacts?id=eq.{id}` - Update contact
- DELETE `/rest/v1/contacts?id=eq.{id}` - Delete contact

**Query Operators:**
- `eq` - Equal
- `neq` - Not equal
- `gt`, `gte`, `lt`, `lte` - Comparisons
- `like`, `ilike` - Pattern matching
- `in` - Array membership
- `is` - Null checks

**Example:**
```typescript
// Fetch contacts with filters
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('type', 'buyer')
  .ilike('last_name', 'smith%')
  .order('created_at', { ascending: false })
  .limit(10);
```

### 7.2 RPC Endpoints

**Custom Functions:**
```typescript
// Call RPC function
const { data, error } = await supabase.rpc('find_user_by_email', {
  _email: '[email protected]'
});

// Hybrid search
const { data, error } = await supabase.rpc('search_documents_hybrid', {
  query_text: 'inspection report',
  query_embedding: [0.1, 0.2, ...], // 1536-dim vector
  workspace_uuid: workspaceId,
  result_limit: 10
});
```

### 7.3 Edge Function Endpoints

**Invocation:**
```typescript
// POST to edge function
const { data, error } = await supabase.functions.invoke('execute-agent', {
  body: {
    agent_id: 'agent-uuid',
    input_data: {
      contact_id: 'contact-uuid',
      task: 'Draft follow-up email'
    },
    workspace_id: workspaceId
  }
});

// SSE streaming endpoint
const eventSource = new EventSource(
  `${supabaseUrl}/functions/v1/ai-chat`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
);

eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  // Handle streaming response
};
```

---

## 8. Performance & Optimization

### 8.1 Database Optimization

**Indexes:**
- All foreign keys indexed
- Workspace ID indexed on all workspace-scoped tables
- Full-text search indexes (`gin`)
- Vector indexes (`ivfflat` for pgvector)

**Query Optimization:**
- Use `select('*')` sparingly - select only needed columns
- Use `limit()` for pagination
- Use `range()` for offset pagination
- Avoid N+1 queries - use joins or `in` filters

**Connection Pooling:**
- Supabase provides automatic connection pooling
- Max connections: 100 (default)
- Idle timeout: 60 seconds

### 8.2 Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load pages
const Chat = lazy(() => import('./pages/Chat'));
const Documents = lazy(() => import('./pages/Documents'));

// Suspense boundary
<Suspense fallback={<LoadingSpinner />}>
  <Chat />
</Suspense>
```

**React Query Optimization:**
```typescript
// Prefetch on hover
const prefetchContact = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ['contact', id],
    queryFn: () => fetchContact(id)
  });
};

<ContactCard
  onMouseEnter={() => prefetchContact(contact.id)}
/>
```

**Memoization:**
```typescript
// Expensive computations
const sortedContacts = useMemo(() => {
  return contacts.sort((a, b) =>
    a.last_name.localeCompare(b.last_name)
  );
}, [contacts]);

// Callbacks to prevent re-renders
const handleClick = useCallback(() => {
  setOpen(true);
}, []);
```

### 8.3 Image Optimization

**Storage:**
- Images stored in Supabase Storage
- Automatic CDN distribution
- Public URLs for efficient serving

**Lazy Loading:**
```typescript
<img
  src={propertyImage.url}
  loading="lazy"
  alt={propertyImage.alt}
/>
```

**Responsive Images:**
```typescript
<img
  srcSet={`
    ${imageUrl}&width=400 400w,
    ${imageUrl}&width=800 800w,
    ${imageUrl}&width=1200 1200w
  `}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
/>
```

### 8.4 Bundle Size

**Current Stats:**
- Initial bundle: ~250KB (gzipped)
- React Query: ~40KB
- Tailwind CSS: ~10KB (purged)
- shadcn/ui: ~50KB
- Supabase client: ~30KB

**Optimization Strategies:**
- Tree-shaking (Vite automatic)
- Code splitting by route
- Lazy load modals and dialogs
- Remove unused dependencies

---

## 9. Deployment Architecture

### 9.1 Frontend Deployment (Vercel)

**Automatic Deployments:**
- Push to `main` → Production deployment
- Push to `feature/*` → Preview deployment
- Environment variables managed in Vercel dashboard

**Build Settings:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

**Vercel Configuration:**
```json
// vercel.json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 9.2 Backend Deployment (Supabase)

**Database Migrations:**
```bash
# Create migration
supabase migration new migration_name

# Apply to local
supabase db reset

# Apply to production
supabase db push --project-ref <project-ref>
```

**Edge Functions:**
```bash
# Deploy single function
supabase functions deploy function-name --project-ref <project-ref>

# Deploy all functions
supabase functions deploy --project-ref <project-ref>
```

**Secrets Management:**
```bash
# Set secret
supabase secrets set ANTHROPIC_API_KEY=sk-xxx --project-ref <project-ref>

# List secrets
supabase secrets list --project-ref <project-ref>
```

### 9.3 CI/CD Pipeline

**GitHub Actions (Vercel):**
- Automatic on push to main
- Preview deployments for PRs
- Environment variable injection

**Manual Deployment Commands:**
```bash
# Frontend
git push origin main  # Auto-deploys to Vercel

# Database migrations
npm run db:migrate

# Edge functions
npm run functions:deploy
```

### 9.4 Monitoring & Logging

**Supabase Logs:**
- PostgreSQL logs (query performance, errors)
- Edge function logs (console.log output)
- Auth logs (login attempts, errors)

**Frontend Errors:**
- Sentry integration (planned)
- Browser console (development)
- User feedback (planned)

**Performance Monitoring:**
- Vercel Analytics
- Supabase Dashboard (query performance)
- React Query DevTools (development)

---

## 10. Future Enhancements

### 10.1 Multi-Model AI Support

**Architecture:**
```typescript
interface AIProvider {
  name: string;
  models: string[];
  costPer1KTokens: number;
  call(prompt: string): Promise<string>;
}

const providers: AIProvider[] = [
  { name: 'Anthropic', models: ['claude-sonnet-4'], cost: 0.003 },
  { name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], cost: 0.005 },
  { name: 'Google', models: ['gemini-1.5-pro'], cost: 0.001 },
  { name: 'Perplexity', models: ['sonar-medium'], cost: 0.002 }
];

function selectModel(task: string): AIProvider {
  if (task === 'content_creation') return providers.find(p => p.name === 'Google');
  if (task === 'research') return providers.find(p => p.name === 'Perplexity');
  return providers.find(p => p.name === 'Anthropic'); // Default
}
```

### 10.2 MLS Integration

**IDX Data Feed:**
```typescript
// Scheduled job (cron)
async function syncMLSListings() {
  // 1. Fetch new listings from MLS API
  const listings = await fetchMLSListings();

  // 2. Import to external_properties
  for (const listing of listings) {
    await supabase.from('external_properties').upsert({
      mls_id: listing.id,
      address: listing.address,
      price: listing.price,
      ...listing
    });
  }

  // 3. Match against saved searches
  await matchSavedSearches();

  // 4. Send alerts
  await sendPropertyAlerts();
}
```

### 10.3 Tool Connector Framework

**Connector Interface:**
```typescript
interface ToolConnector {
  id: string;
  name: string; // 'Gmail', 'Google Calendar', 'Zoom'
  authenticate(): Promise<OAuth2Credentials>;
  execute(action: Action): Promise<Result>;
}

interface Action {
  type: string; // 'send_email', 'create_event', 'schedule_meeting'
  parameters: Record<string, any>;
}

// Example: Gmail connector
class GmailConnector implements ToolConnector {
  async execute(action: Action) {
    if (action.type === 'send_email') {
      return await sendGmail(action.parameters.to, action.parameters.subject, action.parameters.body);
    }
  }
}
```

---

**End of Architecture Document**

**For Product Requirements, see:** `Smart_Agent_Platform_PRD_v3.md`
**For Developer Context, see:** `CLAUDE.md`
