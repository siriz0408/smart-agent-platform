# GitHub Actions Secrets Setup

To enable automated deployments via GitHub Actions, you need to configure these secrets.

## Required Secrets

Navigate to your GitHub repository → **Settings → Secrets and variables → Actions** → **New repository secret**

### 1. Vercel Secrets

#### VERCEL_TOKEN
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions"
4. Scope: Full Account
5. Copy the token
6. Add as secret: `VERCEL_TOKEN`

#### VERCEL_ORG_ID
1. Run locally:
   ```bash
   vercel link
   cat .vercel/project.json | grep orgId
   ```
2. Copy the `orgId` value
3. Add as secret: `VERCEL_ORG_ID`

#### VERCEL_PROJECT_ID
1. Run locally:
   ```bash
   cat .vercel/project.json | grep projectId
   ```
2. Copy the `projectId` value
3. Add as secret: `VERCEL_PROJECT_ID`

### 2. Supabase Secrets

#### SUPABASE_PROJECT_REF
- Value: `sthnezuadfbmbqlxiwtq`
- Add as secret: `SUPABASE_PROJECT_REF`

#### SUPABASE_DB_URL
1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Add as secret: `SUPABASE_DB_URL`

### 3. Environment Variables (for builds)

#### VITE_SUPABASE_URL
- Value: `https://sthnezuadfbmbqlxiwtq.supabase.co`
- Add as secret: `VITE_SUPABASE_URL`

#### VITE_SUPABASE_PUBLISHABLE_KEY
1. Go to Supabase Dashboard → Project Settings → API
2. Copy "anon public" key
3. Add as secret: `VITE_SUPABASE_PUBLISHABLE_KEY`

#### VITE_SUPABASE_PROJECT_ID
- Value: `sthnezuadfbmbqlxiwtq`
- Add as secret: `VITE_SUPABASE_PROJECT_ID`

## Quick Setup Script

Run this locally to get all the values you need:

```bash
# 1. Link Vercel first
vercel link

# 2. Get Vercel IDs
echo "VERCEL_ORG_ID: $(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)"
echo "VERCEL_PROJECT_ID: $(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)"

# 3. Supabase values
echo "SUPABASE_PROJECT_REF: $(grep project_id supabase/config.toml | cut -d'"' -f2)"
echo "VITE_SUPABASE_URL: $(grep VITE_SUPABASE_URL .env | cut -d'=' -f2)"
echo "VITE_SUPABASE_PUBLISHABLE_KEY: $(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d'=' -f2)"
echo "VITE_SUPABASE_PROJECT_ID: $(grep VITE_SUPABASE_PROJECT_ID .env | cut -d'=' -f2)"
```

## Verification

After adding all secrets, push a commit to trigger the workflow:

```bash
git commit --allow-empty -m "Test GitHub Actions"
git push origin main
```

Check the Actions tab in GitHub to see if the workflow runs successfully.

## Workflow Triggers

- **deploy.yml**: Runs on push to `main` or PR creation
- **database-migrations.yml**: Manual trigger only (workflow_dispatch)

## Disable Auto-Deploy (Optional)

If you prefer manual deployments only, you can:

1. Go to repository Settings → Actions → General
2. Set "Actions permissions" to disable workflows
3. Or delete/rename `.github/workflows/deploy.yml`
