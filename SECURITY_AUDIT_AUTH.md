# Authentication & Authorization Security Audit Report

**Date:** February 5, 2026  
**Scope:** Authentication and authorization implementation across frontend, backend, and edge functions  
**Auditor:** AI Security Review

---

## Executive Summary

This audit identified **1 Critical**, **4 High**, **5 Medium**, and **3 Low** severity security vulnerabilities in the authentication and authorization system. The most critical issues involve hardcoded super admin credentials, disabled JWT verification in edge functions, and session token storage vulnerabilities.

---

## 1. Auth Implementation (`src/hooks/useAuth.tsx`, `src/components/auth/`)

### 🔴 CRITICAL: Session Tokens Stored in localStorage

**Location:** `src/integrations/supabase/client.ts:13`

**Issue:** Supabase client is configured to store session tokens in `localStorage`:
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,  // ⚠️ VULNERABLE TO XSS
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Risk:** 
- XSS attacks can steal authentication tokens from localStorage
- Tokens persist across browser sessions, increasing attack window
- No protection against client-side script injection

**Recommendation:**
- Use `sessionStorage` for session tokens (cleared on tab close)
- Consider httpOnly cookies for production (requires backend changes)
- Implement Content Security Policy (CSP) headers to mitigate XSS
- Add token encryption for sensitive applications

**Severity:** 🔴 **CRITICAL**

---

### 🟠 HIGH: Race Condition in Auth State Initialization

**Location:** `src/hooks/useAuth.tsx:67-100`

**Issue:** Potential race condition between `onAuthStateChange` listener and `getSession()`:
```typescript
useEffect(() => {
  // Set up auth state listener FIRST
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      // ... handler
    }
  );

  // THEN check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    // ... handler
  });
}, []);
```

**Risk:**
- Both handlers can fire simultaneously
- Profile fetch may be called twice
- `setLoading(false)` may be called prematurely
- setTimeout workaround (line 76) suggests known timing issues

**Recommendation:**
- Use a single source of truth for auth state
- Implement proper async/await flow control
- Add debouncing or request cancellation
- Remove setTimeout workaround and fix root cause

**Severity:** 🟠 **HIGH**

---

### 🟠 HIGH: Incomplete Logout Implementation

**Location:** `src/hooks/useAuth.tsx:126-131`

**Issue:** `signOut()` function doesn't clear all auth-related localStorage data:
```typescript
const signOut = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setSession(null);
  setProfile(null);
  // ⚠️ Missing: Clear localStorage role data, preferences, etc.
};
```

**Risk:**
- Role override data persists (`smart_agent_role_override`)
- Active role persists (`smart_agent_active_role`)
- User preferences may leak to next user on shared devices
- Sensitive data remains accessible after logout

**Recommendation:**
```typescript
const signOut = async () => {
  await supabase.auth.signOut();
  setUser(null);
  setSession(null);
  setProfile(null);
  
  // Clear all auth-related localStorage
  localStorage.removeItem(ROLE_STORAGE_KEY);
  localStorage.removeItem(ROLE_OVERRIDE_KEY);
  // Consider clearing other sensitive data
};
```

**Severity:** 🟠 **HIGH**

---

### 🟡 MEDIUM: No Explicit Token Refresh Error Handling

**Location:** `src/hooks/useAuth.tsx` (throughout)

**Issue:** While `autoRefreshToken: true` is enabled, there's no explicit handling for refresh failures:
- No retry logic for failed refresh attempts
- No user notification when token refresh fails
- Silent failures may cause unexpected logout

**Risk:**
- Users may be logged out unexpectedly
- Poor user experience during network issues
- No visibility into refresh failures

**Recommendation:**
- Add `onAuthStateChange` handler for `TOKEN_REFRESHED` and `SIGNED_OUT` events
- Implement retry logic with exponential backoff
- Show user-friendly error messages
- Log refresh failures for monitoring

**Severity:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM: Profile Fetch Error Handling

**Location:** `src/hooks/useAuth.tsx:43-59`

**Issue:** Profile fetch errors are logged but don't prevent auth state from being set:
```typescript
const fetchProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      logger.error("Error fetching profile:", error);
      // ⚠️ Still sets profile to null even if error occurred
    }
    
    setProfile(data as Profile | null);
  } catch (err) {
    logger.error("Error fetching profile:", err);
    // ⚠️ No retry, no user notification
  }
};
```

**Risk:**
- Users may authenticate but have no profile data
- Silent failures make debugging difficult
- RLS policy failures may go unnoticed

**Recommendation:**
- Add retry logic for transient failures
- Show user notification for critical profile fetch failures
- Distinguish between "no profile" (PGRST116) and actual errors
- Consider blocking auth completion until profile is loaded

**Severity:** 🟡 **MEDIUM**

---

## 2. Protected Routes (`src/components/auth/ProtectedRoute.tsx`, `src/App.tsx`)

### 🟠 HIGH: Super Admin Email Hardcoded in Frontend

**Location:** `src/components/auth/ProtectedRoute.tsx:11`

**Issue:** Super admin email is hardcoded in multiple frontend files:
```typescript
const SUPER_ADMIN_EMAIL = "siriz04081@gmail.com";
```

**Risk:**
- Email address exposed in client-side code
- Easy to identify admin account for targeted attacks
- Cannot change admin without code deployment
- Violates principle of least privilege visibility

**Recommendation:**
- Move super admin check to backend/database only
- Use role-based checks instead of email comparison
- If email check is required, use environment variable (still not ideal)
- Consider using a separate admin flag in user_roles table

**Severity:** 🟠 **HIGH**

---

### 🟡 MEDIUM: Role Check Logic Complexity

**Location:** `src/components/auth/ProtectedRoute.tsx:56-77`

**Issue:** Complex role checking logic with multiple conditions:
```typescript
const requiresSuperAdmin = requiredRoles.includes("super_admin") && requiredRoles.length === 1;
const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

if (requiresSuperAdmin && !isSuperAdmin) {
  return <Navigate to="/dashboard" replace />;
}

const isAdminRoute = requiredRoles.includes("super_admin") || requiredRoles.includes("admin");

const hasAccess = isSuperAdmin || (isAdminRoute
  ? requiredRoles.some(r => availableRoles.includes(r))
  : requiredRoles.includes(activeRole));
```

**Risk:**
- Logic is difficult to audit and maintain
- Edge cases may allow unauthorized access
- Inconsistent behavior between super_admin routes and admin routes
- Potential for logic errors in future modifications

**Recommendation:**
- Simplify role checking logic
- Extract to a dedicated authorization utility function
- Add unit tests for all role combinations
- Document the authorization matrix clearly

**Severity:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM: No Route-Level Rate Limiting

**Location:** `src/components/auth/ProtectedRoute.tsx` (throughout)

**Issue:** Protected routes don't implement rate limiting for authentication attempts or route access.

**Risk:**
- Brute force attacks on protected routes
- No protection against enumeration attacks
- Resource exhaustion from rapid route navigation

**Recommendation:**
- Implement rate limiting for route access attempts
- Add CAPTCHA for repeated failed auth attempts
- Monitor and alert on suspicious access patterns

**Severity:** 🟡 **MEDIUM**

---

### 🟢 LOW: Redirect Loop Potential

**Location:** `src/components/auth/ProtectedRoute.tsx:44-51`

**Issue:** Onboarding redirect logic could theoretically cause loops if profile state is inconsistent:
```typescript
if (!isOnboardingExempt && profile && profile.onboarding_completed === false) {
  return <Navigate to="/onboarding" replace />;
}
```

**Risk:**
- Low risk due to `skipOnboardingCheck` prop
- Could occur if profile state becomes inconsistent

**Recommendation:**
- Add loop detection (max redirects counter)
- Ensure onboarding page always sets `skipOnboardingCheck={true}`
- Add logging for redirect loops

**Severity:** 🟢 **LOW**

---

## 3. Super Admin Hardcoding

### 🔴 CRITICAL: Super Admin Email Hardcoded Across Codebase

**Locations:**
- `src/hooks/useAuth.tsx:7`
- `src/components/auth/ProtectedRoute.tsx:11`
- `src/contexts/WorkspaceContext.tsx:7`
- `src/contexts/RoleContext.tsx:38` (referenced)
- `supabase/functions/invite-to-workspace/index.ts:18`
- `supabase/migrations/20260204200000_workspace_architecture.sql:40`
- `supabase/migrations/20260206100000_handle_new_user_linkedin_name.sql:32`

**Issue:** Super admin email `"siriz04081@gmail.com"` is hardcoded in:
- Frontend components (exposed to clients)
- Edge functions (server-side but still hardcoded)
- Database migrations and functions (persistent in schema)

**Risk:**
- **CRITICAL:** Email address is public knowledge (visible in client bundle)
- Cannot change admin without code changes and migrations
- Single point of failure - if email is compromised, entire platform is at risk
- Violates security best practices (no hardcoded credentials)
- Makes it easy for attackers to identify and target admin account

**Recommendation:**
1. **Immediate:** Remove email checks from frontend entirely
2. **Short-term:** Use database-backed super admin flag in `user_roles` table
3. **Long-term:** Implement proper admin management system with:
   - Database table for platform admins
   - Admin invitation/approval workflow
   - Audit logging for admin actions
   - Multi-factor authentication for admins

**Example Fix:**
```sql
-- Migration: Remove hardcoded email, use role-based check
ALTER TABLE user_roles ADD COLUMN is_platform_admin BOOLEAN DEFAULT FALSE;

-- Update is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND is_platform_admin = TRUE
  );
$$;
```

**Severity:** 🔴 **CRITICAL**

---

### 🟠 HIGH: Database Function Uses Hardcoded Email

**Location:** `supabase/migrations/20260204200000_workspace_architecture.sql:30-42`

**Issue:** `is_super_admin()` database function hardcodes email:
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid())
    AND email = 'siriz04081@gmail.com'  -- ⚠️ HARDCODED
  );
$$;
```

**Risk:**
- Function is used in RLS policies throughout the database
- Changing admin requires database migration
- Email is stored in database schema (visible in migrations)
- Cannot easily rotate admin credentials

**Recommendation:**
- Replace with role-based check using `user_roles` table
- Remove email dependency entirely
- Use a dedicated `is_platform_admin` flag

**Severity:** 🟠 **HIGH**

---

### 🟡 MEDIUM: Inconsistent Super Admin Checks

**Location:** Multiple files (see grep results)

**Issue:** Super admin status is checked inconsistently:
- Frontend: Email comparison (`user.email === SUPER_ADMIN_EMAIL`)
- Backend: Database function (`is_super_admin()`)
- Edge functions: Sometimes email, sometimes role check

**Risk:**
- Frontend and backend may disagree on admin status
- Edge cases where user has super_admin role but different email
- Inconsistent authorization decisions

**Recommendation:**
- Standardize on database role check only
- Remove all email-based checks
- Use single source of truth (database)

**Severity:** 🟡 **MEDIUM**

---

## 4. Edge Functions Auth (`supabase/functions/`)

### 🔴 CRITICAL: All Edge Functions Have JWT Verification Disabled

**Location:** `supabase/config.toml` (all functions)

**Issue:** **ALL 28 edge functions** have `verify_jwt = false`:
```toml
[functions.ai-chat]
verify_jwt = false

[functions.execute-agent]
verify_jwt = false

[functions.index-document]
verify_jwt = false

# ... all other functions
```

**Risk:**
- **CRITICAL:** Edge functions must manually verify tokens (error-prone)
- No automatic token validation by Supabase platform
- Inconsistent token verification across functions
- Some functions may miss token validation entirely
- Increased attack surface

**Current State:** Functions manually verify tokens using:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
  });
}

const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
if (claimsError || !claimsData?.user) {
  return new Response(JSON.stringify({ error: "Invalid token" }), {
    status: 401,
  });
}
```

**Recommendation:**
1. **Enable JWT verification** in `config.toml` for all functions:
   ```toml
   [functions.ai-chat]
   verify_jwt = true
   ```
2. **Remove manual token verification** code (redundant when `verify_jwt = true`)
3. **Use `Deno.env.get("SUPABASE_AUTH_USER_ID")`** to get authenticated user ID
4. **Exception:** Keep `verify_jwt = false` only for webhook endpoints (Stripe, etc.)

**Severity:** 🔴 **CRITICAL**

---

### 🟠 HIGH: Inconsistent Token Validation in Edge Functions

**Location:** Multiple edge functions

**Issue:** Different functions use different token validation methods:

1. **`execute-agent/index.ts`**: Uses `getUser(token)` ✅
2. **`ai-chat/index.ts`**: Uses `getUser(token)` but allows `null` userId ⚠️
3. **`zillow-search/index.ts`**: Uses `getClaims(token)` ✅
4. **`index-document/index.ts`**: No auth check at all ❌

**Examples:**

**ai-chat/index.ts (lines 1446-1472):**
```typescript
if (authHeader?.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_ANON_KEY) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabase.auth.getUser(token);
  
  if (claimsData?.user?.id) {
    userId = claimsData.user.id;
    // ... continues even if userId is null
  }
}
// ⚠️ Function continues even if userId is null - no error returned
```

**index-document/index.ts:**
```typescript
// ⚠️ NO AUTHENTICATION CHECK AT ALL
serve(async (req) => {
  // ... directly processes document without verifying user
});
```

**Risk:**
- Some functions may allow unauthenticated access
- Inconsistent security posture
- Difficult to audit authorization

**Recommendation:**
- Standardize token validation across all functions
- Use `verify_jwt = true` in config.toml (removes need for manual checks)
- Add authentication middleware/helper function
- Fail closed: reject requests without valid tokens

**Severity:** 🟠 **HIGH**

---

### 🟠 HIGH: Service Role Key Usage in Edge Functions

**Location:** All edge functions using service role client

**Issue:** Edge functions create service role clients for database operations:
```typescript
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
```

**Risk:**
- Service role key bypasses RLS policies
- If leaked, provides full database access
- No audit trail for service role operations
- Functions may bypass intended security controls

**Recommendation:**
- Use service role key only when necessary (bypassing RLS)
- Prefer authenticated user client when possible
- Add logging for all service role operations
- Rotate service role key regularly
- Consider using separate service accounts with limited permissions

**Severity:** 🟠 **HIGH**

---

### 🟡 MEDIUM: No Authorization Checks in Some Functions

**Location:** `supabase/functions/index-document/index.ts`

**Issue:** `index-document` function doesn't verify user owns the document:
```typescript
// Gets document without checking user ownership
const { data: document, error: docError } = await supabase
  .from("documents")
  .select("*")
  .eq("id", documentId)
  .single();
```

**Risk:**
- Users may index documents they don't own (if they know document ID)
- No tenant isolation check before processing
- Potential for unauthorized document access

**Recommendation:**
- Add user authentication check
- Verify document belongs to user's tenant
- Use RLS policies to enforce access control
- Add authorization check before processing

**Severity:** 🟡 **MEDIUM**

---

### 🟡 MEDIUM: Token Validation Errors Not Logged

**Location:** Multiple edge functions

**Issue:** Failed token validation returns generic errors without logging:
```typescript
if (claimsError || !claimsData?.user) {
  return new Response(JSON.stringify({ error: "Invalid token" }), {
    status: 401,
  });
  // ⚠️ No logging of the error
}
```

**Risk:**
- Cannot detect attack patterns
- Difficult to debug authentication issues
- No visibility into failed auth attempts

**Recommendation:**
- Log authentication failures (without sensitive data)
- Include request metadata (IP, user-agent, timestamp)
- Set up alerts for suspicious patterns
- Rate limit failed auth attempts

**Severity:** 🟡 **MEDIUM**

---

### 🟢 LOW: CORS Headers Allow All Origins

**Location:** All edge functions

**Issue:** CORS headers allow all origins:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // ...
};
```

**Risk:**
- Low risk for authenticated endpoints
- Could allow CSRF if authentication is bypassed
- Not ideal for production

**Recommendation:**
- Restrict CORS to known frontend origins
- Use environment variable for allowed origins
- Consider removing CORS for internal-only functions

**Severity:** 🟢 **LOW**

---

## Summary of Vulnerabilities

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 **CRITICAL** | 3 | Session tokens in localStorage, JWT verification disabled, Super admin hardcoded |
| 🟠 **HIGH** | 6 | Race conditions, incomplete logout, hardcoded email in DB, inconsistent token validation, service role usage |
| 🟡 **MEDIUM** | 8 | Token refresh handling, profile fetch errors, role check complexity, inconsistent admin checks, missing auth checks |
| 🟢 **LOW** | 3 | Redirect loops, CORS headers, token error logging |

---

## Recommended Priority Fixes

### Immediate (Critical - Fix Within 24 Hours)

1. **Enable JWT verification in config.toml** for all edge functions
2. **Remove super admin email from frontend** - use database role checks only
3. **Add authentication check to `index-document` function**

### Short-term (High - Fix Within 1 Week)

4. **Fix race condition in useAuth.tsx**
5. **Complete logout implementation** - clear all localStorage
6. **Standardize token validation** across all edge functions
7. **Replace hardcoded email in database function** with role-based check

### Medium-term (Medium - Fix Within 1 Month)

8. **Add token refresh error handling**
9. **Improve profile fetch error handling**
10. **Simplify role check logic** in ProtectedRoute
11. **Add authorization checks** to all edge functions

### Long-term (Low - Fix Within 3 Months)

12. **Implement proper admin management system**
13. **Add rate limiting** to protected routes
14. **Restrict CORS headers** to known origins
15. **Add comprehensive auth logging** and monitoring

---

## Testing Recommendations

1. **Penetration Testing:**
   - Attempt to access protected routes without authentication
   - Test token manipulation and replay attacks
   - Verify RLS policies are enforced

2. **Automated Security Scanning:**
   - Run OWASP ZAP or similar tool
   - Check for XSS vulnerabilities
   - Verify CSP headers

3. **Code Review:**
   - Review all authentication flows
   - Verify authorization checks are consistent
   - Check for hardcoded credentials

4. **Monitoring:**
   - Set up alerts for failed auth attempts
   - Monitor for unusual access patterns
   - Track admin actions

---

## Compliance Considerations

- **OWASP Top 10:** Addresses A01 (Broken Access Control), A02 (Cryptographic Failures), A07 (Identification and Authentication Failures)
- **CWE-798:** Use of Hard-coded Credentials
- **CWE-287:** Improper Authentication
- **CWE-306:** Missing Authentication for Critical Function

---

## Conclusion

The authentication and authorization system has several critical vulnerabilities that should be addressed immediately. The most pressing issues are the disabled JWT verification, hardcoded super admin credentials, and localStorage token storage. Implementing the recommended fixes will significantly improve the security posture of the application.

**Overall Security Rating:** 🟠 **HIGH RISK** - Immediate action required

---

*This audit was conducted on February 5, 2026. Regular security audits should be conducted quarterly or after major changes to the authentication system.*
