# Vercel Deployment Guide

This guide walks you through deploying Smart Agent to Vercel and configuring automatic deployments.

## Prerequisites

- Vercel account (free tier is sufficient)
- GitHub repository pushed (completed in Phase 1)
- Supabase project configured (completed in Phase 2)
- Supabase credentials (anon key, project URL, project ID)

## Phase 3.1: Create Vercel Project

### Via Vercel Dashboard (Recommended)

1. Navigate to https://vercel.com/new
2. Click "Add New..." → "Project"
3. **Import Git Repository**:
   - Select "GitHub"
   - Authorize Vercel if first time
   - Find and select `smart-agent-platform` repository
   - Click "Import"

### Configure Build Settings

Vercel should auto-detect the Vite framework and configure settings automatically:

| Setting | Auto-Detected Value | Manual Override (if needed) |
|---------|---------------------|----------------------------|
| **Framework Preset** | Vite | (leave as-is) |
| **Root Directory** | `./` | (leave as-is) |
| **Build Command** | `npm run build` | (leave as-is) |
| **Output Directory** | `dist` | (leave as-is) |
| **Install Command** | `npm install` | (leave as-is) |

### Configure Project Name

- **Project Name**: `smart-agent-platform` (or customize)
- This will determine your URL: `https://smart-agent-platform.vercel.app`

## Phase 3.2: Add Environment Variables

**CRITICAL**: Add these environment variables before deploying.

Click **"Environment Variables"** section, then add each variable:

### Variable 1: VITE_SUPABASE_URL

| Field | Value |
|-------|-------|
| **Key** | `VITE_SUPABASE_URL` |
| **Value** | `https://<new-project-id>.supabase.co` |
| **Environments** | ✅ Production, ✅ Preview, ✅ Development |

### Variable 2: VITE_SUPABASE_PUBLISHABLE_KEY

| Field | Value |
|-------|-------|
| **Key** | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Value** | `<your-anon-key-from-supabase>` |
| **Environments** | ✅ Production, ✅ Preview, ✅ Development |

### Variable 3: VITE_SUPABASE_PROJECT_ID

| Field | Value |
|-------|-------|
| **Key** | `VITE_SUPABASE_PROJECT_ID` |
| **Value** | `<new-project-id>` |
| **Environments** | ✅ Production, ✅ Preview, ✅ Development |

**Get these values from**: Supabase Dashboard → Settings → API

### Verify Environment Variables

Before proceeding, double-check:
- All 3 variables are added
- All 3 are enabled for Production, Preview, and Development
- No typos in variable names (must start with `VITE_`)
- Values are correct (copy-paste from Supabase dashboard)

## Phase 3.3: Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (~2-3 minutes)

### Build Process

You'll see these stages:

```
1. Cloning repository
2. Installing dependencies (npm install)
3. Building application (npm run build)
4. Uploading build output
5. Deploying to Vercel Edge Network
```

### Expected Output

```
✓ Cloned repository
✓ Installed dependencies
✓ Built application
✓ Deployment ready

Your project is live at: https://smart-agent-platform-<hash>.vercel.app
```

### If Build Fails

Check the build logs for errors:

**Common Issues:**

| Error | Solution |
|-------|----------|
| "Missing environment variable" | Add missing variable in project settings |
| "TypeScript errors" | Run `npm run typecheck` locally to see errors |
| "Module not found" | Run `npm install` locally, verify package.json |
| "Build timed out" | Contact Vercel support (unlikely with our app size) |

## Phase 3.4: Update Supabase Configuration

**IMPORTANT**: After successful deployment, update Supabase with your Vercel URL.

### Get Your Vercel URL

```bash
# Via Vercel CLI (if installed)
vercel ls

# Via Dashboard
# Navigate to: Dashboard → Your Project → Domains
# Copy the production URL (e.g., smart-agent-platform.vercel.app)
```

### Update Supabase Secrets

```bash
# Update APP_URL secret
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Replace with your actual Vercel production URL
supabase secrets set APP_URL=https://smart-agent-platform.vercel.app
```

### Update Supabase Auth Redirect URLs

1. Navigate to Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: Change from `http://localhost:8080` to `https://smart-agent-platform.vercel.app`
3. **Redirect URLs**: Add:
   - `https://smart-agent-platform.vercel.app/*`
   - `https://smart-agent-platform.vercel.app/**`
   - Keep existing: `http://localhost:8080/**` (for local development)
4. Click **"Save"**

### Update Stripe Webhook URL (If Using Stripe)

1. Navigate to Stripe Dashboard → **Developers → Webhooks**
2. Find existing webhook or create new
3. **Endpoint URL**: `https://<new-project-id>.supabase.co/functions/v1/stripe-webhook`
4. **Events to send**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy **Signing secret** (starts with `whsec_`)
6. Update Supabase secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Phase 3.5: Configure Project Settings

### Automatic Deployments

Navigate to **Project Settings → Git** and configure:

| Setting | Recommended Value |
|---------|------------------|
| **Production Branch** | `main` |
| **Preview Deployments** | ✅ Enable for all branches |
| **Auto Deploy** | ✅ Enable |
| **Deploy Hooks** | (optional - for manual triggers) |

### Environment-Specific Settings

Navigate to **Project Settings → General**:

| Setting | Value |
|---------|-------|
| **Node.js Version** | 20.x (or latest LTS) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Custom Domain (Optional - Later)

To add a custom domain like `app.smartagent.ai`:

1. Navigate to **Project Settings → Domains**
2. Click **"Add Domain"**
3. Enter domain name
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (~10 minutes)

## Phase 3.6: Test Deployment

### Visit Your Application

Open your Vercel deployment URL:
```
https://smart-agent-platform.vercel.app
```

### Quick Verification Checklist

- [ ] Homepage loads without errors
- [ ] No console errors (F12 → Console tab)
- [ ] Login page accessible
- [ ] Images and assets load correctly
- [ ] Dark mode toggle works
- [ ] Navigation between pages works

### Check Browser Console

Open browser DevTools (F12) and check:

**No errors like:**
- ❌ "Supabase client error"
- ❌ "CORS error"
- ❌ "Environment variable undefined"

**Expected logs:**
- ✅ Supabase client initialized
- ✅ React app loaded

## Phase 3.7: Set Up CI/CD (Optional but Recommended)

### Create GitHub Actions Workflow

This workflow runs tests and checks before deployment:

```bash
# Create workflow file
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
EOF

# Commit and push
git add .github/workflows/ci.yml
git commit -m "Add CI workflow for automated testing"
git push
```

### Add Secrets to GitHub

1. Navigate to GitHub repository → **Settings → Secrets and variables → Actions**
2. Add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

### Configure Vercel Integration

Navigate to **Project Settings → Git → Deploy Hooks**:

**Deployment Protection:**
- ✅ Enable "Only deploy if CI checks pass"
- ✅ Require GitHub Actions to succeed before deploy

## Deployment Workflow

### Production Deployments

```bash
# Make changes locally
git add .
git commit -m "Add new feature"

# Push to main branch
git push origin main

# Vercel automatically:
# 1. Detects push to main
# 2. Runs build
# 3. Deploys to production
# 4. Updates https://smart-agent-platform.vercel.app
```

### Preview Deployments

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Work on new feature"

# Push feature branch
git push origin feature/new-feature

# Vercel automatically:
# 1. Detects push to feature branch
# 2. Creates preview deployment
# 3. Comments on PR with preview URL
# 4. Example: https://smart-agent-platform-<hash>-preview.vercel.app
```

## Verification Checklist

Before proceeding to Phase 4 (Testing), verify:

- [ ] Vercel project created and deployed
- [ ] All 3 environment variables configured
- [ ] Production URL is live and accessible
- [ ] Supabase APP_URL secret updated
- [ ] Supabase Auth redirect URLs updated
- [ ] No build errors
- [ ] No runtime errors in browser console
- [ ] Homepage loads successfully
- [ ] GitHub Actions CI workflow configured (optional)

## Troubleshooting

### "Build Failed" Error

```bash
# Check build logs in Vercel dashboard
# Common fixes:

# 1. Missing environment variables
# → Add in Project Settings → Environment Variables

# 2. TypeScript errors
# → Run locally: npm run typecheck
# → Fix errors and push again

# 3. Missing dependencies
# → Run locally: npm install
# → Commit package-lock.json changes
```

### "Application Error" at Runtime

```bash
# Check Runtime Logs in Vercel dashboard
# Navigate to: Deployments → [Latest] → Runtime Logs

# Common fixes:

# 1. Wrong environment variable values
# → Double-check Supabase URL and keys

# 2. CORS errors
# → Verify Supabase Auth redirect URLs include Vercel domain

# 3. Supabase connection errors
# → Test Supabase directly: curl https://<project-id>.supabase.co
```

### "Cannot connect to Supabase"

```bash
# Verify environment variables are correct
# Vercel Dashboard → Project → Settings → Environment Variables

# Test Supabase connection manually:
curl https://<project-id>.supabase.co/rest/v1/ \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"

# Should return JSON response with database info
```

## Vercel Dashboard Quick Links

- **Project Dashboard**: https://vercel.com/dashboard
- **Your Project**: https://vercel.com/<username>/smart-agent-platform
- **Deployments**: https://vercel.com/<username>/smart-agent-platform/deployments
- **Settings**: https://vercel.com/<username>/smart-agent-platform/settings
- **Logs**: https://vercel.com/<username>/smart-agent-platform/logs

## What's Next?

After completing Vercel deployment:

1. ✅ Application deployed to Vercel
2. ✅ Production URL live
3. ⏭️ Complete end-to-end testing (Phase 4)
4. ⏭️ Execute cutover (Phase 5)

## Estimated Time

- Creating Vercel project: 5 minutes
- Configuring environment variables: 5 minutes
- Initial deployment: 3 minutes
- Updating Supabase configuration: 5 minutes
- Setting up CI/CD (optional): 10 minutes
- Testing & verification: 10 minutes

**Total: ~30-40 minutes**

## Production URL

Your application is now live at:
```
https://smart-agent-platform.vercel.app
```

Save this URL - you'll use it for testing in Phase 4.
