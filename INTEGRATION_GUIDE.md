# Integration Guide: Vercel + Supabase + GitHub

This guide explains how to use the CLI-first workflow for Smart Agent Platform.

## 🚀 Quick Start

### Initial Setup (Run Once)

```bash
# 1. Link all services
npm run setup

# 2. Pull environment variables from Vercel
npm run sync:env:pull
```

That's it! You're now connected to all three services.

## 📋 Daily Workflow

### Making Changes & Deploying

```bash
# 1. Make your changes locally
# Edit files...

# 2. Test locally
npm run dev

# 3. Run checks
npm run lint
npm run typecheck
npm run test

# 4. Commit changes
git add .
git commit -m "Your message"

# 5. Deploy (choose one method)

# Option A: Push to GitHub (auto-deploys to Vercel) ⭐ RECOMMENDED
git push origin main

# Option B: Use deploy script (runs all checks)
npm run deploy

# Option C: Direct Vercel CLI deploy
npm run deploy:prod
```

### Database Changes

```bash
# After modifying database schema or creating migrations:

# 1. Generate migration from changes
npm run db:diff

# 2. Push migrations to Supabase
npm run db:migrate

# Or use the interactive menu
npm run db:push
```

### Environment Variables

```bash
# Pull latest from Vercel → .env.local
npm run sync:env:pull

# Push .env → Vercel & Supabase (interactive)
npm run sync:env
```

## 🛠️ Available Commands

### Setup & Linking

| Command | Description |
|---------|-------------|
| `npm run setup` | Link Vercel, verify Supabase & GitHub (one-time) |
| `npm run link:vercel` | Link to Vercel project |

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server (port 8080) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

### Deployment

| Command | Description |
|---------|-------------|
| `npm run deploy` | Interactive deployment script (recommended) |
| `npm run deploy:prod` | Deploy to production via Vercel |
| `npm run deploy:preview` | Create preview deployment |
| `git push` | Push to GitHub (auto-deploys) ⭐ |

### Environment Variables

| Command | Description |
|---------|-------------|
| `npm run sync:env` | Interactive sync menu |
| `npm run sync:env:pull` | Pull from Vercel → .env.local |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:push` | Interactive database sync menu |
| `npm run db:pull` | Pull schema from Supabase |
| `npm run db:migrate` | Push migrations to Supabase |
| `npm run db:diff` | Generate migration from changes |

### Functions

| Command | Description |
|---------|-------------|
| `npm run functions:deploy` | Deploy all edge functions to Supabase |

### Status

| Command | Description |
|---------|-------------|
| `npm run status` | Show status of Git, Vercel, Supabase |
| `npm run status:git` | Git status |
| `npm run status:vercel` | List Vercel deployments |
| `npm run status:supabase` | Show Supabase project info |

## 🔄 Common Workflows

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run dev

# Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# This creates a preview deployment automatically
# Vercel will comment on your PR with the preview URL

# After review, merge to main
git checkout main
git merge feature/new-feature
git push origin main

# Production deployment happens automatically
```

### 2. Database Schema Changes

```bash
# 1. Create/modify migration files in supabase/migrations/

# 2. Test locally (if Docker running)
supabase db reset

# 3. Generate migration from schema diff
npm run db:diff

# 4. Review the generated migration file

# 5. Push to production
npm run db:migrate

# 6. Commit the migration file
git add supabase/migrations/
git commit -m "Add new migration"
git push
```

### 3. Environment Variable Updates

```bash
# When you need to add/update environment variables:

# 1. Update .env locally
echo "NEW_VAR=value" >> .env

# 2. Sync to Vercel & Supabase
npm run sync:env
# Select option 4 (push to both)

# 3. Trigger redeploy in Vercel to pick up new vars
npm run deploy:prod
```

### 4. Edge Function Updates

```bash
# After modifying edge functions in supabase/functions/

# 1. Test locally
supabase functions serve

# 2. Deploy to production
npm run functions:deploy

# 3. Commit changes
git add supabase/functions/
git commit -m "Update edge functions"
git push
```

### 5. Hotfix to Production

```bash
# Quick fix without full deployment flow
git add .
git commit -m "hotfix: critical bug fix"

# Direct production deploy
npm run deploy:prod

# Or push to GitHub
git push origin main
```

## 🔐 Security Best Practices

### Environment Variables

**Never commit these files:**
- `.env` - Local development secrets
- `.env.local` - Local overrides (from Vercel)
- `.vercel` - Vercel project config (contains project ID)

**These are safe to commit:**
- `.env.example` - Template with dummy values
- `vercel.json` - Public configuration
- `supabase/config.toml` - Public configuration

### Secrets Management

```bash
# Store secrets in:
# 1. Vercel: For frontend environment variables
vercel env add SECRET_NAME

# 2. Supabase: For edge function secrets
supabase secrets set SECRET_NAME --project-ref sthnezuadfbmbqlxiwtq

# Never use git for secrets!
```

## 🐛 Troubleshooting

### "Vercel not linked"

```bash
npm run link:vercel
# Select 'smart-agent-platform' when prompted
```

### "Supabase connection failed"

```bash
# Verify project ID
cat supabase/config.toml | grep project_id

# Check login status
supabase auth
```

### "Build fails on Vercel"

```bash
# Test build locally first
npm run verify-build

# Check Vercel logs
vercel logs

# View latest deployment
npm run status:vercel
```

### "Environment variables not syncing"

```bash
# Pull from Vercel to verify
npm run sync:env:pull

# Check .env.local was created
cat .env.local

# Manually add to Vercel if needed
vercel env add VARIABLE_NAME production
```

## 🎯 Pro Tips

### 1. Use Git Push for Most Deploys

The GitHub → Vercel auto-deploy is the most reliable:
```bash
git push origin main  # Deploys automatically
```

### 2. Preview Deployments for Testing

Every branch gets a preview URL:
```bash
git push origin feature/test  # Creates preview deploy
```

### 3. Check Status Before Working

```bash
npm run status  # Shows Git, Vercel, Supabase status
```

### 4. Database Changes Need Two Steps

1. Push migration: `npm run db:migrate`
2. Commit migration file: `git add supabase/migrations/ && git commit`

### 5. Test Locally Before Deploying

```bash
# Always run these before deploying
npm run lint
npm run typecheck
npm run test
npm run build
```

## 📚 Further Reading

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [GitHub CLI Manual](https://cli.github.com/manual/)

## 🆘 Need Help?

Run the setup script for a guided walkthrough:
```bash
npm run setup
```

Check individual service status:
```bash
npm run status
```

View deployment logs:
```bash
vercel logs
```
