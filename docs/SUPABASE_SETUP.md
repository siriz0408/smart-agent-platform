# Supabase Project Setup Guide

This guide walks you through creating and configuring the new Supabase project for Smart Agent.

## Prerequisites

- Supabase account (free tier is sufficient to start)
- Supabase CLI installed: `npm install -g supabase`
- Access to API keys for external services

## Phase 2.1: Create New Supabase Project

### Via Supabase Dashboard

1. Navigate to https://app.supabase.com/
2. Click "New project"
3. Configure project settings:

   | Setting | Value | Notes |
   |---------|-------|-------|
   | **Name** | `smart-agent-platform` | Or `smart-agent-prod` |
   | **Database Password** | Generate strong password | **SAVE THIS SECURELY** |
   | **Region** | `us-east-1` | Or closest to your users |
   | **Plan** | Free | Upgrade to Pro when needed |

4. Click "Create new project"
5. Wait for provisioning (~2 minutes)

### Record These Credentials

Once the project is created, navigate to **Settings → API** and record:

```bash
# Project Details
Project URL: https://<new-project-id>.supabase.co
Project ID: <new-project-id>
Region: us-east-1

# API Keys
Anon/Public Key: eyJhbGc...  (used in frontend)
Service Role Key: eyJhbGc...  (KEEP SECRET - used in edge functions)

# Database
Database Password: [your-generated-password]
```

**Save these in a secure location** (password manager, encrypted file, etc.)

## Phase 2.2: Configure Authentication & Storage

### Authentication Settings

1. Navigate to **Authentication → URL Configuration**
2. Configure Site URL:
   - **Site URL**: `http://localhost:8080` (update to Vercel URL after Phase 3)
3. Configure Redirect URLs:
   - Add: `http://localhost:8080/**`
   - Add: `https://*.vercel.app/**` (for preview deployments)
4. Click "Save"

### Create Storage Buckets

Navigate to **Storage** and create 4 buckets:

#### 1. documents (Private)

```
Name: documents
Public: NO (private)
File size limit: 52428800 (50MB)
Allowed MIME types: application/pdf, image/*, text/plain, application/msword,
                    application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

After creation, set RLS policy:
- Navigate to bucket → Policies → New policy
- Template: "Users can access their own folders"
- Apply policy

#### 2. avatars (Public)

```
Name: avatars
Public: YES
File size limit: 2097152 (2MB)
Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
```

#### 3. profile-covers (Public)

```
Name: profile-covers
Public: YES
File size limit: 5242880 (5MB)
Allowed MIME types: image/jpeg, image/png, image/webp
```

#### 4. profile-gallery (Public)

```
Name: profile-gallery
Public: YES
File size limit: 10485760 (10MB)
Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
```

### Verify Buckets

Navigate to **Storage** and confirm all 4 buckets are created with correct settings.

## Phase 2.3: Run Database Migrations

### Link Supabase CLI to New Project

```bash
# Navigate to project directory
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Login to Supabase CLI
supabase login

# Link to new project (replace <new-project-id> with your actual project ID)
supabase link --project-ref <new-project-id>

# Enter database password when prompted
# Password: [paste your database password]
```

### Verify Migrations

```bash
# List all migration files
ls supabase/migrations

# Should show 32 migration files like:
# 20240101000000_initial_schema.sql
# 20240101000001_create_profiles.sql
# ... etc
```

### Push All Migrations

```bash
# Push all 32 migrations to new project
supabase db push

# This will:
# - Apply all migration files in order
# - Create all tables, views, functions, triggers
# - Set up Row Level Security (RLS) policies
# - Configure database extensions (pgvector, uuid-ossp, etc.)

# Expected output:
# Applying migration 20240101000000_initial_schema.sql...
# Applying migration 20240101000001_create_profiles.sql...
# ... (32 migrations total)
# Finished supabase db push.
```

### Verify Migration Success

```bash
# List migration status
supabase migration list

# All 32 migrations should show status: "Applied"

# Check for schema differences
supabase db diff

# Expected output: "No schema differences detected"
```

### Verify Database Tables

Navigate to **Database → Tables** in Supabase dashboard and confirm these tables exist:

**Core Tables:**
- tenants
- profiles
- user_roles

**CRM Tables:**
- contacts
- contact_agents
- properties
- deals
- deal_stages
- milestones

**Document Tables:**
- documents
- document_chunks
- document_metadata

**AI Tables:**
- ai_conversations
- ai_messages

**Agent Tables:**
- agents
- agent_tools
- agent_executions

**Other:**
- properties_saved
- analytics_events
- notifications

## Phase 2.4: Deploy Edge Functions

### List Available Functions

```bash
# List all edge functions
ls supabase/functions

# Should show 22 function directories:
# ai-chat/
# calculate-profile-completion/
# check-milestone-reminders/
# clone-shared-document/
# create-checkout-session/
# create-customer-portal/
# create-test-users/
# deal-stage-webhook/
# delete-document/
# execute-agent/
# index-document/
# list-invoices/
# save-external-property/
# search-documents/
# send-email/
# send-invite/
# stripe-webhook/
# usage-history/
# zillow-property-detail/
# zillow-search/
# _shared/ (utilities)
```

### Deploy All Functions

```bash
# Deploy all functions at once
supabase functions deploy

# Expected output:
# Deploying function ai-chat...
# Deploying function calculate-profile-completion...
# ... (22 functions total)
# Finished deploying functions.
```

### Verify Deployment

```bash
# List deployed functions
supabase functions list

# All 22 functions should show status: "deployed"
```

### Test a Function (Optional)

```bash
# Test the health check or a simple function
curl -i --location --request POST \
  'https://<new-project-id>.supabase.co/functions/v1/calculate-profile-completion' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"userId": "test"}'

# Should return 200 OK (or appropriate response)
```

## Phase 2.5: Configure Supabase Secrets

These secrets are required for edge functions to work properly.

### Required Secrets (8 Total)

```bash
# Navigate to project directory
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# 1. Anthropic API Key (for AI operations)
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-api-key>

# 2. Stripe Test Mode Keys (for billing)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Resend API Key (for email notifications)
supabase secrets set RESEND_API_KEY=re_...

# 4. RapidAPI Key (for Zillow integration)
supabase secrets set RAPIDAPI_KEY=<your-rapidapi-key>

# 5. Application URL (update after Vercel deployment)
supabase secrets set APP_URL=http://localhost:8080

# 6. AI Gateway Configuration
# AI_GATEWAY_URL and AI_MODEL are no longer needed
# The backend now uses Anthropic API directly
```

### Verify Secrets

```bash
# List all configured secrets
supabase secrets list

# Should show configured secrets (values are hidden for security)
# ANTHROPIC_API_KEY: ********
# STRIPE_SECRET_KEY: ********
# STRIPE_WEBHOOK_SECRET: ********
# RESEND_API_KEY: ********
# RAPIDAPI_KEY: ********
# APP_URL: http://localhost:8080
```

### Update APP_URL After Vercel Deployment

**IMPORTANT**: After deploying to Vercel in Phase 3, update the APP_URL:

```bash
# Replace with your actual Vercel URL
supabase secrets set APP_URL=https://smart-agent-platform.vercel.app
```

## Phase 2.6: Update Local Configuration

### Edit supabase/config.toml

```bash
# Open config file
nano supabase/config.toml

# Find line: project_id = "roxwxcyglpxkufvwfdcj"
# Change to: project_id = "<new-project-id>"

# Save and exit (Ctrl+X, Y, Enter)
```

### Update Local .env File

```bash
# Create or update .env file in project root
cat > .env << EOF
VITE_SUPABASE_URL=https://<new-project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<new-project-id>
EOF
```

### Test Local Development

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Visit http://localhost:8080
# You should see the app loading (may show login screen)
```

## Verification Checklist

Before proceeding to Phase 3 (Vercel deployment), verify:

- [ ] New Supabase project created
- [ ] All credentials recorded securely
- [ ] Authentication configured with redirect URLs
- [ ] All 4 storage buckets created
- [ ] All 32 migrations applied successfully
- [ ] All 22 edge functions deployed
- [ ] All 8 secrets configured
- [ ] Local config.toml updated
- [ ] Local .env file updated
- [ ] Local development server runs without errors

## Troubleshooting

### "Failed to link project"

```bash
# Make sure you're logged in
supabase login

# Verify project ID is correct
# Navigate to Supabase dashboard → Settings → General
# Copy Project ID exactly
```

### "Migration failed"

```bash
# Check database is accessible
supabase db status

# View detailed migration errors
supabase db push --debug

# If specific migration fails, check migration file for syntax errors
```

### "Function deployment failed"

```bash
# Check function syntax
deno check supabase/functions/<function-name>/index.ts

# Deploy individual function to see detailed errors
supabase functions deploy <function-name> --debug
```

### "Secret not found in functions"

```bash
# Secrets take a moment to propagate
# Wait 30 seconds after setting secrets, then redeploy functions
supabase functions deploy
```

## What's Next?

After completing Supabase setup:

1. ✅ Supabase project fully configured
2. ⏭️ Deploy to Vercel (Phase 3)
3. ⏭️ Update Supabase APP_URL secret with Vercel URL
4. ⏭️ Update Supabase Auth redirect URLs with Vercel URL

## Supabase Dashboard Quick Links

**For your new project:**

- Dashboard: https://app.supabase.com/project/<new-project-id>
- Table Editor: https://app.supabase.com/project/<new-project-id>/editor
- SQL Editor: https://app.supabase.com/project/<new-project-id>/sql
- Storage: https://app.supabase.com/project/<new-project-id>/storage/buckets
- Edge Functions: https://app.supabase.com/project/<new-project-id>/functions
- Logs: https://app.supabase.com/project/<new-project-id>/logs/edge-functions

## Estimated Time

- Creating project: 5 minutes
- Configuring auth & storage: 10 minutes
- Running migrations: 5 minutes
- Deploying edge functions: 10 minutes
- Configuring secrets: 5 minutes
- Testing & verification: 10 minutes

**Total: ~45 minutes**
