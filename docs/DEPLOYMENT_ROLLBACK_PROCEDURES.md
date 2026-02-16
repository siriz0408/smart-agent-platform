# Deployment Rollback Procedures

> **Last Updated:** 2026-02-15
> **Created By:** PM-Infrastructure (INF-013)

This document outlines procedures for rolling back Vercel deployments when issues are detected in production.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run deploy:list` | List recent deployments |
| `npm run deploy:current` | Show current production deployment |
| `npm run deploy:rollback <id>` | Rollback to specific deployment |
| `npm run deploy:rollback:prev` | Rollback to previous production |
| `npm run deploy:rollback:status` | Check rollback status |
| `npm run deploy:verify` | Verify deployment health |

---

## When to Rollback

**Immediate Rollback Triggers:**
- Application crashes or white screen
- Critical features broken (auth, deals, AI chat)
- Security vulnerability discovered
- Data corruption detected
- Major performance degradation (>3x normal latency)

**Assessment Before Rollback:**
- Can the issue be hotfixed quickly (<15 min)?
- Is the issue affecting all users or specific scenarios?
- What percentage of traffic is impacted?

---

## Rollback Procedures

### 1. Quick Rollback to Previous Deployment

**Use when:** Current deployment has issues, previous version was stable.

```bash
# View current and previous deployments
npm run deploy:list

# Rollback to previous production deployment
npm run deploy:rollback:prev

# Verify the rollback was successful
npm run deploy:verify
```

### 2. Rollback to Specific Deployment

**Use when:** Need to go back multiple versions or specific known-good deployment.

```bash
# List all recent deployments to find the target
npm run deploy:list

# Identify the deployment ID you want (e.g., dpl_abc123...)
# Then rollback to that specific deployment
npm run deploy:rollback dpl_abc123xyz

# Verify
npm run deploy:verify
```

### 3. Emergency Rollback (Non-Interactive)

**Use when:** Automation or scripts need to rollback without prompts.

```bash
# Rollback to previous without confirmation
npm run deploy:rollback:prev -- --yes

# Or to specific deployment
npm run deploy:rollback dpl_abc123xyz -- --yes
```

### 4. Manual Vercel CLI Rollback

**Use when:** npm scripts unavailable or need direct CLI access.

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-id-or-url>

# Check rollback status
vercel rollback status
```

---

## Verification After Rollback

Always verify the rollback was successful:

```bash
# Run automated verification
npm run deploy:verify

# Manual checks:
# 1. Open production URL in browser
# 2. Test critical flows (login, view deals, AI chat)
# 3. Check Vercel dashboard for errors
# 4. Monitor Sentry for new errors
```

### Critical Paths to Test

| Feature | Test Steps |
|---------|------------|
| Authentication | Log in, log out, session persistence |
| Deals Pipeline | View deals, create deal, update status |
| AI Chat | Send message, receive response |
| Search | Global search for contacts/deals |
| Documents | Upload, view, delete document |

---

## Post-Rollback Actions

### Immediate (0-15 min)

1. **Notify team** - Post in Slack/communication channel
2. **Monitor errors** - Watch Sentry and Vercel logs
3. **Verify traffic** - Check that users can access the app

### Short-term (15 min - 1 hour)

1. **Document incident** - Create incident report
2. **Identify root cause** - What caused the issue?
3. **Plan fix** - How will this be resolved?

### Medium-term (1-24 hours)

1. **Implement fix** - Develop and test the fix
2. **Deploy fix** - After thorough testing
3. **Post-mortem** - Review what happened and how to prevent

---

## Rollback Script Details

### Script Location
`/scripts/deployment-rollback.ts`

### Features

- **Safe execution:** Uses `execFileSync` to prevent command injection
- **Input validation:** Validates deployment IDs before use
- **Interactive confirmation:** Requires explicit confirmation for rollbacks
- **Automatic verification:** Runs health checks after rollback
- **JSON output:** Use `--json` flag for programmatic access

### Command Options

```
Usage:
  npx tsx scripts/deployment-rollback.ts [options]

Options:
  --list, -l           List recent deployments (default)
  --current, -c        Show current production deployment
  --rollback <id>, -r  Rollback to specific deployment
  --previous, -p       Rollback to previous production
  --status, -s         Check rollback status
  --json               Output as JSON
  --yes, -y            Skip confirmation prompts
```

---

## Troubleshooting

### Rollback Failed

1. **Check Vercel CLI auth:** `vercel login`
2. **Verify deployment exists:** `npm run deploy:list`
3. **Check deployment state:** Only `READY` deployments can be promoted
4. **Try manual rollback:** `vercel rollback <id>`

### Rollback Taking Too Long

Default timeout is 3 minutes. If rollback is slow:

1. Check Vercel status page
2. Check Vercel dashboard for pending rollback
3. Run `npm run deploy:rollback:status`

### Wrong Deployment Rolled Back

If you accidentally rolled back to wrong version:

1. Note the current deployment ID
2. Find correct deployment: `npm run deploy:list`
3. Rollback again to correct version

---

## Related Documentation

- [Deployment Verification](../scripts/verify-deployment.sh)
- [Build Time Tracking](./BUILD_TIME_TRACKING.md)
- [CI/CD Pipeline](./CI_CD.md)

---

## Appendix: Vercel Rollback Internals

Vercel's rollback is actually a "promote" operation - it promotes a previous deployment to become the current production deployment. This means:

- No new build is triggered
- The exact same deployment artifacts are served
- DNS/routing updates typically complete in <30 seconds
- Previous production deployment remains available

The rollback command under the hood:
```bash
vercel rollback <deployment-id>
# Equivalent to:
vercel promote <deployment-id>
```
