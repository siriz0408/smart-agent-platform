# Security Audit Report: Exposed Secrets Scan (SEC-004)

**Date:** February 6, 2026  
**Auditor:** PM-Security  
**Scope:** Full codebase scan for exposed secrets, API keys, tokens, and credentials  
**Files Scanned:** ~1,070 source files

---

## Executive Summary

**Overall Risk Assessment:** 🟡 **MEDIUM**

The codebase scan identified **5 instances** of hardcoded Supabase anon keys in test/debug scripts. While these are "publishable" keys designed for client-side use, they should still be managed via environment variables for best practices. No service role keys, API keys, or other sensitive credentials were found hardcoded in production code.

**Key Findings:**
- ✅ No `.env` files committed to repository
- ✅ `.gitignore` properly configured to exclude sensitive files
- ✅ `.env.example` contains only placeholder values
- 🟡 Supabase anon keys hardcoded in 5 test/debug files
- 🟡 Supabase project ID exposed in `supabase/config.toml` (acceptable but noted)

---

## Files Scanned

**Total Files Scanned:** ~1,070 files

**File Types Scanned:**
- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
- Shell scripts (`.sh`)
- HTML files (`.html`)
- Configuration files (`.toml`, `.json`)
- Documentation files (`.md`)

**Excluded:**
- `node_modules/` directory
- `.git/` directory
- `dist/` build artifacts
- Test artifact HTML reports (base64 encoded data)

---

## Findings

### 🟡 MEDIUM RISK: Hardcoded Supabase Anon Keys

**Risk Level:** MEDIUM  
**Count:** 5 files

**Analysis:**
Supabase "anon" keys are publishable keys designed for client-side use. However, they should still be managed via environment variables rather than hardcoded. These keys are found in test/debug scripts, which reduces risk but violates best practices.

**Affected Files:**

1. **`test-search.html`** (Line 166)
   - **Secret Type:** Supabase Anon Key (JWT)
   - **Value:** `[REDACTED - JWT token starting with eyJhbGci...]`
   - **Context:** Test HTML file for search functionality
   - **Risk:** Medium - Test file, but key is exposed in repository

2. **`scripts/test-search-debug.ts`** (Line 19)
   - **Secret Type:** Supabase Anon Key (JWT)
   - **Value:** `[REDACTED - JWT token starting with eyJhbGci...]`
   - **Context:** Debug script for search testing
   - **Risk:** Medium - Debug script, key should use environment variable

3. **`scripts/test-messaging-ui.ts`** (Line 13)
   - **Secret Type:** Supabase Anon Key (JWT)
   - **Value:** `[REDACTED - JWT token starting with eyJhbGci...]`
   - **Context:** Test script for messaging UI
   - **Risk:** Medium - Different key than others (possibly rotated), should use env var

4. **`scripts/quick-search-test.sh`** (Line 11)
   - **Secret Type:** Supabase Anon Key (JWT)
   - **Value:** `[REDACTED - JWT token starting with eyJhbGci...]`
   - **Context:** Quick test script for search functionality
   - **Risk:** Medium - Shell script, should use environment variable

5. **`scripts/check-with-auth.ts`** (Line 8)
   - **Secret Type:** Supabase Anon Key (JWT)
   - **Value:** `[REDACTED - JWT token starting with eyJhbGci...]`
   - **Context:** Authentication check script
   - **Risk:** Medium - Should use environment variable

**Remediation:**
- Replace hardcoded keys with environment variable references
- Use `process.env.VITE_SUPABASE_PUBLISHABLE_KEY` or `Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")`
- Update scripts to read from `.env` file or environment

---

### 🟢 LOW RISK: Supabase Project ID in Config

**Risk Level:** LOW  
**Location:** `supabase/config.toml` (Line 1)

**Finding:**
```toml
project_id = "sthnezuadfbmbqlxiwtq"
```

**Analysis:**
Supabase project IDs are public-facing identifiers and are generally safe to commit. However, they expose the project reference which could be used for enumeration. This is acceptable per Supabase documentation, but should be noted.

**Risk:** Low - Public-facing identifier, acceptable per Supabase best practices

**Remediation:**
- No immediate action required
- Consider documenting that project IDs are intentionally public

---

### 🟢 LOW RISK: Test Passwords

**Risk Level:** LOW  
**Count:** Multiple test files

**Analysis:**
Test passwords found in test files (e.g., `Test1234!`, `testpassword123`) are clearly test values and pose minimal risk. These are appropriate for test environments.

**Affected Files:**
- `tests/edge-functions/universal-search.test.ts`
- `tests/database/search-rpc.test.ts`
- `tests/browser-automation/config.sh`
- Various test documentation files

**Risk:** Low - Test values only, not production credentials

**Remediation:**
- No action required - test values are acceptable

---

### ✅ SECURE: Environment Files

**Status:** ✅ **PROPERLY CONFIGURED**

**Findings:**
- ✅ `.env.example` contains only placeholder values (`your-project-id`, `your-anon-key-here`, `pk_test_...`, etc.)
- ✅ `.env.qa.example` contains only placeholder values
- ✅ No `.env` files found in repository
- ✅ `.gitignore` properly excludes:
  - `.env`
  - `.env.local`
  - `.env.*.local`
  - `*.local`

**Risk:** ✅ SECURE - No real secrets in example files

---

### ✅ SECURE: Base64 Encoded Data

**Status:** ✅ **LEGITIMATE**

**Analysis:**
Base64-encoded data found in:
- `package-lock.json` - Package integrity hashes (legitimate)
- `test-artifacts/playwright-report/index.html` - Test report artifacts (legitimate)

**Risk:** ✅ SECURE - Not secrets, legitimate encoded data

---

## Patterns Searched

The following patterns were searched across the codebase:

1. **API Keys:**
   - `sk-*` (Stripe/OpenAI style keys)
   - `sk_*` (Alternative format)
   - `apikey`, `api_key`, `API_KEY` (case-insensitive)

2. **Tokens:**
   - `token` assignments with values
   - `bearer` tokens
   - `jwt` assignments

3. **Passwords:**
   - `password` assignments
   - `passwd` assignments

4. **Secrets:**
   - `secret` assignments with values

5. **Connection Strings:**
   - `postgres://`, `mysql://`, `mongodb://` patterns

6. **Base64 Encoded:**
   - Long base64 strings (40+ characters)

---

## Remediation Steps

### Priority 1: Replace Hardcoded Anon Keys (MEDIUM)

**Action Items:**

1. **Update `test-search.html`:**
   ```javascript
   // Before:
   const SUPABASE_ANON_KEY = 'eyJhbGci...';
   
   // After:
   const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'your-anon-key-here';
   ```

2. **Update `scripts/test-search-debug.ts`:**
   ```typescript
   // Before:
   const SUPABASE_ANON_KEY = 'eyJhbGci...';
   
   // After:
   const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 'your-anon-key-here';
   ```

3. **Update `scripts/test-messaging-ui.ts`:**
   ```typescript
   // Before:
   const supabaseAnonKey = 'eyJhbGci...';
   
   // After:
   const supabaseAnonKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 'your-anon-key-here';
   ```

4. **Update `scripts/quick-search-test.sh`:**
   ```bash
   # Before:
   ANON_KEY="eyJhbGci..."
   
   # After:
   ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-your-anon-key-here}"
   ```

5. **Update `scripts/check-with-auth.ts`:**
   ```typescript
   // Before:
   const supabaseKey = 'eyJhbGci...';
   
   // After:
   const supabaseKey = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 'your-anon-key-here';
   ```

**Timeline:** Complete within 1 week

---

## Prevention Measures

### ✅ Already Implemented

1. **`.gitignore` Configuration:**
   - Properly excludes `.env`, `.env.local`, and variants
   - Excludes test artifacts with sensitive data

2. **Environment Variable Pattern:**
   - Production code uses `import.meta.env.VITE_*` for frontend
   - Edge functions use `Deno.env.get()` for server-side
   - No hardcoded secrets in production code

3. **Example Files:**
   - `.env.example` contains only placeholders
   - Documentation references environment variables

### 🔄 Recommended Improvements

1. **Pre-commit Hook:**
   - Add git pre-commit hook to scan for common secret patterns
   - Use tools like `git-secrets` or `truffleHog`

2. **CI/CD Scanning:**
   - Integrate secret scanning in CI/CD pipeline
   - Use GitHub Secret Scanning or similar tools

3. **Documentation:**
   - Add security guidelines for contributors
   - Document which keys are safe to commit (anon keys) vs. not (service role keys)

---

## Risk Assessment Summary

| Finding | Risk Level | Count | Status |
|--------|-----------|-------|--------|
| Hardcoded Supabase Anon Keys | 🟡 MEDIUM | 5 | Needs Remediation |
| Supabase Project ID | 🟢 LOW | 1 | Acceptable |
| Test Passwords | 🟢 LOW | Multiple | Acceptable |
| Environment Files | ✅ SECURE | - | Properly Configured |
| Base64 Data | ✅ SECURE | - | Legitimate |

**Overall Risk:** 🟡 **MEDIUM**

---

## Conclusion

The codebase demonstrates good security practices with proper `.gitignore` configuration and no committed `.env` files. The primary concern is hardcoded Supabase anon keys in test/debug scripts. While these are publishable keys with lower risk than service role keys, they should still be managed via environment variables for consistency and best practices.

**Next Steps:**
1. ✅ Complete SEC-004 audit (this report)
2. 🔄 Remediate hardcoded anon keys (Priority 1)
3. 📋 Consider SEC-014 (RLS policies) and SEC-015 (CORS restrictions) for next tasks

---

**Report Generated:** February 6, 2026  
**Auditor:** PM-Security  
**Task:** SEC-004
