# CLI Quick Start Guide

Get up and running with the integrated CLI workflow in 5 minutes.

## ⚡ One-Time Setup

```bash
# 1. Run the setup script
npm run setup

# This will:
# ✅ Link Vercel project
# ✅ Verify Supabase connection
# ✅ Verify GitHub connection
# ✅ Pull environment variables from Vercel
```

**That's it!** You're now connected to all three services and ready to work.

## 🎯 Most Common Commands

### Development

```bash
# Start dev server
npm run dev

# Run all checks
npm run lint && npm run typecheck && npm run test
```

### Deployment (Pick One)

```bash
# Method 1: Git push (RECOMMENDED - triggers auto-deploy)
git push origin main

# Method 2: Interactive deployment script
npm run deploy

# Method 3: Direct to production
npm run deploy:prod
```

### Database

```bash
# Interactive database menu
npm run db:push

# Or specific commands
npm run db:migrate  # Push migrations to Supabase
npm run db:pull     # Pull schema from Supabase
npm run db:diff     # Generate migration from changes
```

### Environment Variables

```bash
# Pull from Vercel
npm run sync:env:pull

# Interactive sync menu
npm run sync:env
```

### Check Status

```bash
# See everything
npm run status

# Or individually
npm run status:git
npm run status:vercel
npm run status:supabase
```

## 📝 Typical Workflow

```bash
# 1. Pull latest
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes, test locally
npm run dev

# 4. Check your work
npm run lint
npm run typecheck
npm run test

# 5. Commit
git add .
git commit -m "Add my feature"

# 6. Push (creates preview deployment)
git push origin feature/my-feature

# 7. Merge to main (deploys to production)
git checkout main
git merge feature/my-feature
git push origin main
```

## 🔄 When You Need To...

### Update Environment Variables

```bash
# 1. Edit .env
echo "NEW_VAR=value" >> .env

# 2. Sync to services
npm run sync:env
# Choose option 4 (push to both)

# 3. Redeploy
npm run deploy:prod
```

### Change Database Schema

```bash
# 1. Edit migration files or make schema changes

# 2. Push to Supabase
npm run db:migrate

# 3. Commit migration
git add supabase/migrations/
git commit -m "Add migration"
git push
```

### Deploy Edge Functions

```bash
# After editing files in supabase/functions/
npm run functions:deploy
```

### Link Vercel (If Not Done)

```bash
npm run link:vercel
```

## 🚨 Troubleshooting

```bash
# Vercel not linked?
npm run link:vercel

# Environment variables missing?
npm run sync:env:pull

# Check what's connected
npm run status

# Need to reset?
rm -rf .vercel
npm run setup
```

## 📚 Full Documentation

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for complete details.

## 🆘 Get Help

```bash
# Run setup again for guided walkthrough
npm run setup

# Check deployment logs
vercel logs

# View recent deployments
npm run status:vercel
```

---

**Pro Tip:** Bookmark these three commands:
1. `npm run dev` - Development
2. `git push origin main` - Deploy
3. `npm run status` - Check everything
