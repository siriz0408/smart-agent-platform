# GitHub Repository Setup Guide

This guide walks you through creating the new GitHub repository and pushing the code.

## Prerequisites

- GitHub account
- GitHub CLI installed (`brew install gh`) OR access to github.com
- Git configured locally

## Option 1: Using GitHub CLI (Recommended)

```bash
# Login to GitHub CLI (if not already logged in)
gh auth login

# Navigate to project directory
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Create new repository
gh repo create smart-agent-platform \
  --public \
  --description "Smart Agent - AI Real Estate Assistant Platform" \
  --source=. \
  --remote=new-origin

# Verify remote was added
git remote -v
# Should show: new-origin https://github.com/<username>/smart-agent-platform.git
```

## Option 2: Using GitHub Web UI

### Step 1: Create Repository on GitHub

1. Navigate to https://github.com/new
2. Repository name: `smart-agent-platform`
3. Description: `Smart Agent - AI Real Estate Assistant Platform`
4. Visibility: **Public** (or Private if preferred)
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 2: Add New Remote Locally

```bash
# Navigate to project directory
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1

# Add new remote (replace <username> with your GitHub username)
git remote add new-origin https://github.com/<username>/smart-agent-platform.git

# Verify remote was added
git remote -v
```

## Push Code with Clean History

Now that you have the new remote set up, push the code:

```bash
# Create a single clean commit with all changes
git add .
git reset $(git commit-tree HEAD^{tree} -m "Initial commit: Smart Agent platform

Complete React + TypeScript + Vite + Supabase stack.

Features:
- AI-powered document analysis with Gemini Flash 3
- Real estate CRM (contacts, properties, deals)
- Multi-document RAG chat
- Stripe billing integration
- 32 database migrations, 22 edge functions

Tech stack:
- Frontend: React 18 + TypeScript + Vite + shadcn/ui + Tailwind
- Backend: Supabase (PostgreSQL + pgvector + Edge Functions)
- Deployment: Vercel
- Testing: Vitest + React Testing Library

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>")

# Push to new repository
git push new-origin main --force

# Update origin to point to new repo
git remote remove origin
git remote rename new-origin origin

# Verify origin is now the new repo
git remote -v
```

## Verify Push Success

```bash
# Check that code was pushed successfully
git log --oneline -1
# Should show: Initial commit: Smart Agent platform

# View remote repository
gh repo view --web
# Or manually visit: https://github.com/<username>/smart-agent-platform
```

## What Was Changed?

The following Lovable-specific items were removed:

1. **package.json**: Removed `lovable-tagger` from devDependencies
2. **vite.config.ts**: Removed `componentTagger` import and usage
3. **.gitignore**: Added `.vercel/` directory
4. **README.md**: Completely rewritten for Vercel deployment

## Next Steps

After pushing to GitHub:

1. ✅ GitHub repository created
2. ⏭️ Create new Supabase project (Phase 2)
3. ⏭️ Deploy to Vercel (Phase 3)

## Troubleshooting

### "remote origin already exists"

If you see this error when adding the new remote:

```bash
# Remove existing origin
git remote remove origin

# Then add new origin
git remote add origin https://github.com/<username>/smart-agent-platform.git
```

### "Permission denied (publickey)"

If using SSH and seeing this error:

```bash
# Use HTTPS instead
git remote set-url origin https://github.com/<username>/smart-agent-platform.git
```

### "refusing to merge unrelated histories"

If you get this when pushing:

```bash
# Use force push (safe since this is a new repo)
git push origin main --force
```

## Repository Settings (Optional but Recommended)

After creating the repository, configure these settings via GitHub web UI:

### Branch Protection

1. Navigate to: Settings → Branches
2. Click "Add rule" for `main` branch
3. Enable:
   - "Require status checks to pass before merging"
   - "Require branches to be up to date before merging"
   - Select: Vercel deployment check (after Vercel setup)

### Collaborators

1. Navigate to: Settings → Collaborators
2. Add team members if needed

### Topics

1. Navigate to repository homepage
2. Click gear icon next to "About"
3. Add topics: `react`, `typescript`, `supabase`, `vercel`, `ai`, `real-estate`, `saas`

## Repository URL

Your new repository will be accessible at:

```
https://github.com/<username>/smart-agent-platform
```

Save this URL - you'll need it for Vercel deployment in Phase 3.
