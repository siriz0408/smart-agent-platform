# Pre-Deployment Checklist

> **Purpose:** Verify deployment readiness (complementary to feature-dev plugin)
> **Note:** Feature-dev plugin handles code quality (Phase 6). This checklist handles deployment readiness.
> **Last Updated:** 2026-02-07

---

## Before Any Deployment

### Code Quality (Handled by feature-dev Phase 6)
- ✅ Code review completed (via feature-dev Phase 6 or manual review)
- ✅ Tests written and passing
- ✅ Linting passes (`npm run lint`)
- ✅ TypeScript checks pass (`npm run typecheck`)

---

## Integration Checks (NEW - Not in feature-dev)

### Database Changes
- [ ] Migration tested locally
- [ ] Migration tested in staging (if available)
- [ ] RLS policies tested
- [ ] Data migration verified (if applicable)
- [ ] Rollback migration exists (if needed)

### Edge Functions
- [ ] Edge function tested locally
- [ ] Environment variables configured
- [ ] CORS settings verified
- [ ] JWT verification configured correctly
- [ ] Error handling tested

### API Changes
- [ ] API endpoints tested
- [ ] Request/response formats validated
- [ ] Rate limiting considered
- [ ] Authentication/authorization verified

---

## User Impact (NEW)

### Breaking Changes
- [ ] Breaking changes documented
- [ ] Migration path for existing data exists
- [ ] User-facing changes tested in UI
- [ ] Error messages user-friendly

### Rollback Plan
- [ ] Rollback plan exists
- [ ] Rollback tested (if critical)
- [ ] Data backup strategy (if needed)

### User Communication
- [ ] User-facing changes documented
- [ ] Help docs updated (if needed)
- [ ] Changelog updated (if needed)

---

## Performance (NEW)

### Performance Checks
- [ ] No obvious performance regressions
- [ ] Database queries optimized (no N+1 queries)
- [ ] Large payloads handled gracefully
- [ ] Loading states implemented
- [ ] Error boundaries in place

### Resource Usage
- [ ] Memory usage acceptable
- [ ] API call frequency reasonable
- [ ] File sizes reasonable
- [ ] Bundle size impact assessed

---

## Cross-PM Impact (NEW)

### Cross-PM Coordination
- [ ] Cross-PM impacts assessed
- [ ] Related PMs notified (if needed)
- [ ] Handoffs created (if needed)
- [ ] CROSS_PM_AWARENESS.md updated

### Architecture Changes
- [ ] Architecture changes documented
- [ ] Pattern changes shared with team
- [ ] Breaking changes communicated

---

## Security (NEW)

### Security Checks
- [ ] No secrets in code
- [ ] RLS policies verified
- [ ] Input validation in place
- [ ] XSS/CSRF protections verified
- [ ] Authentication flows tested

---

## Checklist Usage

**When to use:**
- Before marking work as "Ready to Test"
- Before deployment
- For any work that touches multiple systems

**How to use:**
1. Go through each section
2. Check items that apply
3. Note any issues in work report
4. Don't block on non-critical items

**Note:** This complements feature-dev plugin. Feature-dev handles code quality, this handles deployment readiness.

---

## Quick Reference

**Must Have (P0):**
- Code review done
- Tests passing
- No breaking changes without migration path
- Rollback plan exists

**Should Have (P1):**
- Cross-PM impact assessed
- Performance acceptable
- Security checks done

**Nice to Have (P2):**
- Documentation updated
- Changelog updated
- Help docs updated

---

*This checklist is maintained by PM-Orchestrator. PMs should use this before marking work complete.*
