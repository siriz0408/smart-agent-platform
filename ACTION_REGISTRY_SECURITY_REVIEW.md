# Action Registry Security & Correctness Review

**File:** `supabase/functions/_shared/agentActions.ts`  
**Date:** February 4, 2026  
**Reviewer:** Security Audit

---

## Executive Summary

The action registry implementation has **several critical security vulnerabilities** and correctness issues that need immediate attention. The most severe issues involve:

1. **SQL Injection Risk** in `update_contact` executor
2. **Missing Tenant Isolation** checks in multiple executors
3. **Insufficient Input Validation** for several action types
4. **Insecure Parameter Passing** in `send_email` executor
5. **Missing Existence Checks** before updates/deletes

---

## 🔴 CRITICAL ISSUES

### 1. SQL Injection Vulnerability in `update_contact`

**Location:** Lines 290-313  
**Severity:** CRITICAL  
**Risk:** SQL Injection via parameter spreading

```typescript
update_contact: async (supabase, params, context) => {
  const { contact_id, ...updates } = params;
  
  const { error } = await supabase
    .from('contacts')
    .update(updates)  // ⚠️ DANGEROUS: Direct spread of user input
    .eq('id', contact_id)
    .eq('tenant_id', context.tenant_id);
```

**Problem:**
- The `updates` object is spread directly into `.update()` without sanitization
- An attacker could inject malicious fields like `tenant_id`, `created_by`, or arbitrary SQL
- While Supabase client uses parameterized queries, allowing arbitrary field updates bypasses business logic validation

**Impact:**
- Users could update fields they shouldn't (e.g., `tenant_id`, `created_by`, `created_at`)
- Potential privilege escalation by modifying `created_by` to another user
- Data integrity violations

**Fix:**
```typescript
update_contact: async (supabase, params, context) => {
  const { contact_id, ...rawUpdates } = params;
  
  // Whitelist allowed fields
  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'company',
    'contact_type', 'status', 'tags', 'notes', 'custom_fields'
  ];
  
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (allowedFields.includes(key)) {
      updates[key] = value;
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      action_type: 'update_contact',
      error: 'No valid fields to update',
    };
  }
  
  const { error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contact_id)
    .eq('tenant_id', context.tenant_id);
```

---

### 2. Missing Tenant Isolation in `send_email`

**Location:** Lines 379-446  
**Severity:** CRITICAL  
**Risk:** Cross-tenant data access

```typescript
if (!recipientUserId && params.contact_id) {
  const { data: contactAgent } = await supabase
    .from('contact_agents')
    .select('agent_user_id')
    .eq('contact_id', params.contact_id)
    .single();  // ⚠️ Missing tenant_id check
```

**Problem:**
- Query on `contact_agents` doesn't filter by `tenant_id`
- An attacker could pass a `contact_id` from another tenant to discover user IDs
- The `contact_id` parameter is not validated to belong to the current tenant

**Impact:**
- Information disclosure (discovering user IDs from other tenants)
- Potential cross-tenant email sending if validation is bypassed elsewhere

**Fix:**
```typescript
if (!recipientUserId && params.contact_id) {
  // First verify contact belongs to tenant
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.contact_id)
    .eq('tenant_id', context.tenant_id)
    .single();
  
  if (!contact) {
    throw new Error('Contact not found or access denied');
  }
  
  // Then get associated user
  const { data: contactAgent } = await supabase
    .from('contact_agents')
    .select('agent_user_id')
    .eq('contact_id', params.contact_id)
    .eq('tenant_id', context.tenant_id)  // Add tenant check if table has it
    .single();
```

---

### 3. Missing Existence Check in `update_contact`

**Location:** Lines 290-313  
**Severity:** HIGH  
**Risk:** Silent failures, misleading success responses

**Problem:**
- No check if contact exists before updating
- Returns success even if 0 rows updated
- No verification that contact belongs to tenant (only filters by it)

**Impact:**
- Misleading success responses when contact doesn't exist
- Poor error messages for debugging

**Fix:**
```typescript
update_contact: async (supabase, params, context) => {
  const { contact_id, ...updates } = params;
  
  // Verify contact exists and belongs to tenant
  const { data: existingContact, error: fetchError } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contact_id)
    .eq('tenant_id', context.tenant_id)
    .single();
  
  if (fetchError || !existingContact) {
    return {
      success: false,
      action_type: 'update_contact',
      error: 'Contact not found or access denied',
    };
  }
  
  // ... rest of update logic
```

---

### 4. Missing Tenant Isolation in `move_deal_stage`

**Location:** Lines 352-377  
**Severity:** HIGH  
**Risk:** Cross-tenant deal manipulation

**Problem:**
- Only filters by `tenant_id` but doesn't verify deal exists
- No check that deal belongs to tenant before update
- Returns success even if 0 rows updated

**Fix:**
```typescript
move_deal_stage: async (supabase, params, context) => {
  // Verify deal exists and belongs to tenant
  const { data: existingDeal, error: fetchError } = await supabase
    .from('deals')
    .select('id, stage')
    .eq('id', params.deal_id)
    .eq('tenant_id', context.tenant_id)
    .single();
  
  if (fetchError || !existingDeal) {
    return {
      success: false,
      action_type: 'move_deal_stage',
      error: 'Deal not found or access denied',
    };
  }
  
  // Optional: Check if stage transition is valid
  // ... rest of update logic
```

---

### 5. Insecure Parameter Passing in `send_email`

**Location:** Lines 417-426  
**Severity:** HIGH  
**Risk:** XSS, injection attacks via email content

**Problem:**
- `params.variables`, `params.subject`, `params.message` are passed directly without sanitization
- If email template rendering doesn't escape properly, could lead to XSS
- No validation of email content length or format

**Impact:**
- XSS if email templates render variables unsafely
- Email injection if SMTP server doesn't validate headers

**Recommendation:**
- Validate and sanitize all email parameters
- Enforce length limits
- Ensure email template engine escapes variables

---

## 🟡 HIGH PRIORITY ISSUES

### 6. Missing Contact Existence Check in `create_deal`

**Location:** Lines 316-350  
**Severity:** MEDIUM  
**Risk:** Data integrity violation

**Problem:**
- No verification that `contact_id` exists or belongs to tenant
- Deal creation will fail with foreign key error, but error message won't be clear

**Fix:**
```typescript
create_deal: async (supabase, params, context) => {
  // Verify contact exists and belongs to tenant
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.contact_id)
    .eq('tenant_id', context.tenant_id)
    .single();
  
  if (contactError || !contact) {
    return {
      success: false,
      action_type: 'create_deal',
      error: 'Contact not found or access denied',
    };
  }
  
  // Verify property if provided
  if (params.property_id) {
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', params.property_id)
      .eq('tenant_id', context.tenant_id)
      .single();
    
    if (propertyError || !property) {
      return {
        success: false,
        action_type: 'create_deal',
        error: 'Property not found or access denied',
      };
    }
  }
  
  // ... rest of creation logic
```

---

### 7. Missing Validation for `contact_id` Type

**Location:** Multiple validators  
**Severity:** MEDIUM  
**Risk:** Type confusion, runtime errors

**Problem:**
- Validators check for presence but not type
- `contact_id` could be a number, object, or malformed UUID
- Database will reject, but error message won't be clear

**Fix:**
```typescript
update_contact: (params) => {
  const errors: string[] = [];
  
  if (!params.contact_id) {
    errors.push('contact_id is required');
  } else if (typeof params.contact_id !== 'string') {
    errors.push('contact_id must be a string (UUID)');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.contact_id)) {
    errors.push('contact_id must be a valid UUID');
  }
  
  // ... rest of validation
```

---

### 8. Missing Validation for Email Length

**Location:** Lines 71-76, 105-110  
**Severity:** LOW  
**Risk:** Database errors, poor UX

**Problem:**
- Email regex validates format but not length
- Database may have length constraints that aren't checked

**Fix:**
```typescript
if (params.email && typeof params.email === 'string') {
  if (params.email.length > 255) {
    errors.push('Email must be 255 characters or less');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.email)) {
      errors.push('Invalid email format');
    }
  }
}
```

---

### 9. Missing Validation for `deal_id` Type

**Location:** Lines 134-151  
**Severity:** MEDIUM  
**Risk:** Type confusion, runtime errors

**Problem:**
- Same as `contact_id` - no type validation

**Fix:** Same pattern as `contact_id` validation above.

---

### 10. Missing Tenant Check in `enroll_drip`

**Location:** Lines 574-654  
**Severity:** MEDIUM  
**Risk:** Cross-tenant campaign enrollment

**Problem:**
- Campaign lookup doesn't verify tenant match when using `campaign_name`
- `contact_id` not verified to belong to tenant

**Fix:**
```typescript
enroll_drip: async (supabase, params, context) => {
  // Verify contact belongs to tenant
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', params.contact_id)
    .eq('tenant_id', context.tenant_id)
    .single();
  
  if (contactError || !contact) {
    return {
      success: false,
      action_type: 'enroll_drip',
      error: 'Contact not found or access denied',
    };
  }
  
  let campaignId = params.campaign_id as string;
  
  if (!campaignId && params.campaign_name) {
    const { data: campaign } = await supabase
      .from('email_campaigns')
      .select('id')
      .eq('tenant_id', context.tenant_id)  // Ensure tenant match
      .ilike('name', `%${params.campaign_name}%`)
      .single();
    
    // ... rest of logic
```

---

## 🟢 MEDIUM PRIORITY ISSUES

### 11. Missing Error Details in Executors

**Location:** All executors  
**Severity:** LOW  
**Risk:** Poor debugging experience

**Problem:**
- Error messages are generic
- No logging of full error details for debugging
- Database constraint violations don't provide helpful messages

**Recommendation:**
- Log full error details (with sensitive data redacted)
- Parse common database errors and provide user-friendly messages
- Include error codes for programmatic handling

---

### 12. Race Condition in `add_note`

**Location:** Lines 448-512  
**Severity:** LOW  
**Risk:** Lost updates

**Problem:**
- Reads existing notes, then updates
- If two notes are added simultaneously, one could be lost

**Fix:**
Use PostgreSQL's string concatenation or JSONB append operations:
```typescript
// For contacts
await supabase.rpc('append_contact_note', {
  p_contact_id: params.contact_id,
  p_tenant_id: context.tenant_id,
  p_note: formattedNote
});
```

Or use optimistic locking with version numbers.

---

### 13. Missing Validation for `tags` Array Content

**Location:** Lines 227-239  
**Severity:** LOW  
**Risk:** Data quality issues

**Problem:**
- Validates that `tags` is an array but not that elements are strings
- No length limit on tags array
- No validation of tag content (could contain malicious strings)

**Fix:**
```typescript
assign_tags: (params) => {
  const errors: string[] = [];
  
  if (!params.contact_id) {
    errors.push('contact_id is required');
  }
  
  if (!params.tags || !Array.isArray(params.tags) || params.tags.length === 0) {
    errors.push('tags array is required and must not be empty');
  } else {
    if (params.tags.length > 50) {
      errors.push('Maximum 50 tags allowed');
    }
    for (const tag of params.tags) {
      if (typeof tag !== 'string') {
        errors.push('All tags must be strings');
        break;
      }
      if (tag.length > 50) {
        errors.push('Each tag must be 50 characters or less');
        break;
      }
      if (!/^[a-zA-Z0-9\s_-]+$/.test(tag)) {
        errors.push('Tags can only contain letters, numbers, spaces, hyphens, and underscores');
        break;
      }
    }
  }
  
  return { valid: errors.length === 0, errors, sanitized_params: params };
}
```

---

### 14. Missing Validation for `custom_fields` Structure

**Location:** Lines 252-288 (create_contact)  
**Severity:** LOW  
**Risk:** Data corruption, storage bloat

**Problem:**
- `custom_fields` is accepted as any object
- No validation of structure or size
- Could store malicious data or cause storage issues

**Recommendation:**
- Validate that `custom_fields` is an object
- Enforce size limits (e.g., max 10KB serialized)
- Optionally validate against a schema

---

## 📋 VALIDATION SUMMARY

### Current Validation Coverage

| Action | Required Fields | Type Checks | Format Checks | Existence Checks | Tenant Checks |
|--------|----------------|-------------|---------------|------------------|---------------|
| `create_contact` | ✅ | ⚠️ Partial | ✅ Email | ❌ | ✅ |
| `update_contact` | ✅ | ❌ | ✅ Email | ❌ | ⚠️ Partial |
| `create_deal` | ✅ | ❌ | ❌ | ❌ | ⚠️ Partial |
| `move_deal_stage` | ✅ | ❌ | ✅ Stage enum | ❌ | ⚠️ Partial |
| `send_email` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `add_note` | ✅ | ❌ | ❌ | ❌ | ⚠️ Partial |
| `schedule_task` | ✅ | ❌ | ❌ | ❌ | ✅ |
| `enroll_drip` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `notify_user` | ⚠️ Partial | ❌ | ❌ | ❌ | ✅ |
| `assign_tags` | ✅ | ⚠️ Partial | ❌ | ❌ | ⚠️ Partial |

**Legend:**
- ✅ = Properly implemented
- ⚠️ = Partially implemented (needs improvement)
- ❌ = Missing

---

## 🔒 SECURITY RECOMMENDATIONS

### Immediate Actions Required

1. **Fix SQL Injection in `update_contact`** - Implement field whitelist
2. **Add tenant isolation checks** - Verify all foreign key references belong to tenant
3. **Add existence checks** - Verify entities exist before operations
4. **Add type validation** - Validate UUIDs, strings, numbers, arrays
5. **Sanitize email parameters** - Validate and escape email content

### Best Practices to Implement

1. **Input Sanitization Layer**
   - Create a shared sanitization utility
   - Whitelist allowed fields for each action type
   - Validate types and formats consistently

2. **Tenant Isolation Pattern**
   ```typescript
   async function verifyEntityBelongsToTenant(
     supabase: SupabaseClient,
     table: string,
     id: string,
     tenantId: string
   ): Promise<boolean> {
     const { data, error } = await supabase
       .from(table)
       .select('id')
       .eq('id', id)
       .eq('tenant_id', tenantId)
       .single();
     return !error && !!data;
   }
   ```

3. **Comprehensive Error Handling**
   - Map database errors to user-friendly messages
   - Log errors with context (action type, params, tenant_id)
   - Return structured error codes

4. **Rate Limiting**
   - Consider adding rate limits per tenant/user
   - Prevent abuse of action execution

5. **Audit Logging**
   - Log all action executions with full context
   - Track who executed what and when
   - Enable compliance and debugging

---

## ✅ CORRECTNESS IMPROVEMENTS

### Business Logic Issues

1. **`create_deal`**: Should verify contact exists and belongs to tenant
2. **`move_deal_stage`**: Should verify deal exists and optionally validate stage transitions
3. **`send_email`**: Should handle `to_email` parameter (currently only logs)
4. **`add_note`**: Should handle `property_id` parameter (currently only handles contact/deal)
5. **`schedule_task`**: Should verify `deal_id` exists if provided

### Edge Cases

1. **Empty updates**: `update_contact` with no valid fields should return error
2. **Duplicate tags**: `assign_tags` merges but doesn't prevent duplicates in input
3. **Concurrent operations**: Race conditions in `add_note` and `assign_tags`
4. **Large payloads**: No size limits on notes, custom_fields, email content

---

## 📊 RISK ASSESSMENT

| Issue | Severity | Likelihood | Impact | Priority |
|-------|----------|------------|--------|----------|
| SQL Injection (`update_contact`) | Critical | Medium | High | P0 |
| Missing Tenant Isolation (`send_email`) | Critical | Medium | High | P0 |
| Missing Existence Checks | High | High | Medium | P1 |
| Missing Type Validation | Medium | High | Medium | P1 |
| Missing Email Sanitization | High | Low | High | P1 |
| Race Conditions | Low | Low | Low | P2 |
| Missing Field Validation | Low | Medium | Low | P2 |

---

## 🎯 RECOMMENDED FIX PRIORITY

### Phase 1 (Immediate - This Week)
1. Fix SQL injection in `update_contact`
2. Add tenant isolation to `send_email`
3. Add existence checks to all update/delete operations
4. Add type validation for UUIDs

### Phase 2 (Short-term - Next Sprint)
5. Add field whitelisting to all update operations
6. Add comprehensive input validation
7. Improve error messages and logging
8. Add email parameter sanitization

### Phase 3 (Medium-term - Next Month)
9. Fix race conditions
10. Add rate limiting
11. Add audit logging
12. Add comprehensive tests

---

## 📝 TESTING RECOMMENDATIONS

1. **Unit Tests**
   - Test all validators with edge cases
   - Test executors with invalid inputs
   - Test tenant isolation scenarios

2. **Integration Tests**
   - Test cross-tenant access attempts
   - Test SQL injection attempts
   - Test concurrent operations

3. **Security Tests**
   - Penetration testing for injection vulnerabilities
   - Authorization bypass attempts
   - Input fuzzing

---

## CONCLUSION

The action registry has a solid foundation but requires **immediate security hardening** before production use. The most critical issues are:

1. SQL injection vulnerability in `update_contact`
2. Missing tenant isolation checks
3. Insufficient input validation

Addressing these issues will significantly improve the security posture of the autonomous agent system.
