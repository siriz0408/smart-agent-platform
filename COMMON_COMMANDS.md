# Common Commands Reference

**ALWAYS recommend these commands when relevant. User prefers not to remember them.**

## 🎯 Most Common Actions

### Check Status
```bash
npm run status
```
Shows status of Git, Vercel, and Supabase in one command.

**When to suggest:**
- User asks "what's the status?"
- Before starting work
- After deployment
- When troubleshooting

---

### Deploy Changes
```bash
git push origin main
```
**This is the preferred deployment method!** Auto-deploys to Vercel.

**Alternative (with interactive checks):**
```bash
npm run deploy
```

**When to suggest:**
- User makes code changes
- User asks "how do I deploy?"
- After committing changes
- When user wants to update production

---

### Sync Environment Variables
```bash
npm run sync:env
```
Interactive menu to sync env vars between local, Vercel, and Supabase.

**Quick pull from Vercel:**
```bash
npm run sync:env:pull
```

**When to suggest:**
- User mentions environment variables
- After adding new secrets
- When .env is missing
- Setting up on new machine

---

### Database Operations
```bash
npm run db:push
```
Interactive menu for database operations.

**Specific operations:**
```bash
npm run db:migrate    # Push migrations to production
npm run db:pull       # Pull schema from Supabase
npm run db:diff       # Generate new migration
```

**When to suggest:**
- User modifies database schema
- User creates migrations
- User asks about database
- After schema changes

---

## 📋 Standard Workflows

### Making Changes & Deploying

```bash
# 1. Make changes, test locally
npm run dev

# 2. Run quality checks
npm run lint
npm run typecheck
npm run test

# 3. Commit
git add .
git commit -m "description"

# 4. Deploy
git push origin main
```

**ALWAYS suggest this workflow when user wants to deploy changes.**

---

### Database Schema Changes

```bash
# 1. Create/edit migration files in supabase/migrations/

# 2. Push to Supabase production
npm run db:migrate

# 3. Commit migration files
git add supabase/migrations/
git commit -m "Add migration"
git push origin main
```

**ALWAYS suggest this workflow when user modifies database.**

---

### Updating Environment Variables

```bash
# 1. Edit .env locally
echo "NEW_VAR=value" >> .env

# 2. Sync to Vercel & Supabase
npm run sync:env
# Select option 4 (push to both)

# 3. Redeploy to pick up changes
npm run deploy:prod
```

**ALWAYS suggest this workflow when user adds environment variables.**

---

### Deploying Edge Functions

```bash
# After editing files in supabase/functions/
npm run functions:deploy

# Then commit
git add supabase/functions/
git commit -m "Update edge functions"
git push origin main
```

**ALWAYS suggest this workflow when user edits edge functions.**

---

## 🆘 Troubleshooting Commands

### Something's not working?
```bash
npm run status         # Check all services
```

### Need to re-link Vercel?
```bash
npm run link:vercel
```

### Environment variables missing?
```bash
npm run sync:env:pull  # Pull from Vercel
```

### Check deployment logs
```bash
vercel logs
gh run list           # GitHub Actions
```

### Check what's changed locally
```bash
git status
```

---

## 🎓 Command Categories

### Status & Info
- `npm run status` - All services
- `npm run status:git` - Git only
- `npm run status:vercel` - Vercel only
- `npm run status:supabase` - Supabase only

### Deployment
- `git push origin main` - Auto-deploy (PREFERRED)
- `npm run deploy` - Interactive deploy
- `npm run deploy:prod` - Direct production deploy
- `npm run deploy:preview` - Preview deploy

### Environment
- `npm run sync:env` - Interactive sync
- `npm run sync:env:pull` - Pull from Vercel
- `npm run sync:env:push` - Push to Vercel

### Database
- `npm run db:push` - Interactive menu
- `npm run db:migrate` - Push migrations
- `npm run db:pull` - Pull schema
- `npm run db:diff` - Generate migration

### Development
- `npm run dev` - Start dev server
- `npm run lint` - Lint code
- `npm run typecheck` - Type check
- `npm run test` - Run tests
- `npm run build` - Build for production

### Setup
- `npm run setup` - Initial setup (one-time)
- `npm run link:vercel` - Link Vercel project

---

## 💡 Pro Tips for Claude

1. **Always suggest `npm run status` first** when user asks about state of project

2. **Always recommend `git push origin main`** as the primary deployment method

3. **Always offer `npm run sync:env`** when environment variables are mentioned

4. **Always suggest `npm run db:push`** for database operations

5. **Never assume user remembers commands** - always show the exact command to run

6. **Prefer simple commands over complex ones** - `git push` beats multi-step manual deployment

7. **Show the workflow, not just the command** - give context on what will happen

---

## 📚 Full Documentation

For complete details, see:
- `CLI_QUICKSTART.md` - Quick start guide
- `INTEGRATION_GUIDE.md` - Comprehensive documentation
- `SETUP_COMPLETE.md` - Setup summary
