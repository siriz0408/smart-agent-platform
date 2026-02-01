# Testing & Validation Checklist

This comprehensive checklist covers all testing required before considering the migration complete.

## Testing Environment

- **Frontend**: https://smart-agent-platform.vercel.app
- **Backend**: https://<new-project-id>.supabase.co
- **GitHub**: https://github.com/<username>/smart-agent-platform

## Pre-Testing Setup

### Create Test Accounts

Create 2-3 test user accounts for testing:

```bash
# User 1: Primary test user
Email: test+user1@example.com
Password: TestPassword123!

# User 2: Secondary test user (for multi-tenant testing)
Email: test+user2@example.com
Password: TestPassword123!
```

### Prepare Test Documents

Have these ready for document upload testing:
- [ ] PDF contract (real estate purchase agreement)
- [ ] PDF inspection report
- [ ] Image file (property photo)
- [ ] Text document (simple .txt file)

## Phase 4.1: Infrastructure Tests

### Database Connectivity ✓

```bash
# Test database connection
curl https://<new-project-id>.supabase.co/rest/v1/ \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"

# Expected: JSON response with database info
```

- [ ] Database responds with 200 OK
- [ ] No timeout errors
- [ ] Response contains schema information

### Edge Functions Health Check ✓

```bash
# Test edge function is deployed
curl https://<new-project-id>.supabase.co/functions/v1/calculate-profile-completion \
  -H "Authorization: Bearer <anon-key>"

# Expected: 200 OK or appropriate error (not 404)
```

- [ ] Function responds (not 404 Not Found)
- [ ] Returns JSON response
- [ ] No internal server errors

### Frontend Deployment ✓

Visit: https://smart-agent-platform.vercel.app

- [ ] Homepage loads without errors
- [ ] No console errors (F12 → Console)
- [ ] No CORS errors
- [ ] CSS styles loaded correctly
- [ ] Images and icons visible
- [ ] Dark mode toggle works

## Phase 4.2: Authentication Flow Tests

### Sign Up Flow ✓

1. Navigate to `/login`
2. Click "Sign Up" or "Create Account"
3. Fill in test email: `test+user1@example.com`
4. Fill in password: `TestPassword123!`
5. Submit form

**Expected Results:**
- [ ] Form submits without errors
- [ ] "Check your email" message appears
- [ ] Email received (check inbox/spam)
- [ ] Email contains confirmation link
- [ ] Link format: `https://<project>.supabase.co/auth/v1/verify?token=...`

### Email Confirmation ✓

1. Open confirmation email
2. Click confirmation link

**Expected Results:**
- [ ] Redirects to app
- [ ] Shows onboarding or dashboard
- [ ] User is logged in
- [ ] Profile created in database

**Verify in Supabase Dashboard:**
- Navigate to: Authentication → Users
- [ ] User appears in list
- [ ] Email confirmed = true
- [ ] No duplicate users

**Verify in Database:**
- Navigate to: Database → Table Editor → profiles
- [ ] Profile record exists for user
- [ ] tenant_id populated
- [ ] created_at timestamp correct

### Login Flow ✓

1. Log out (if logged in)
2. Navigate to `/login`
3. Enter credentials:
   - Email: `test+user1@example.com`
   - Password: `TestPassword123!`
4. Submit form

**Expected Results:**
- [ ] Login successful
- [ ] Redirects to dashboard
- [ ] User avatar/name visible in navbar
- [ ] No console errors

### Password Reset Flow ✓

1. Navigate to `/login`
2. Click "Forgot Password"
3. Enter email: `test+user1@example.com`
4. Submit form

**Expected Results:**
- [ ] "Check your email" message appears
- [ ] Password reset email received
- [ ] Email contains reset link
- [ ] Clicking link opens reset password page
- [ ] Can set new password
- [ ] Can log in with new password

### Session Persistence ✓

1. Log in
2. Refresh page
3. Close tab and reopen app

**Expected Results:**
- [ ] Still logged in after refresh
- [ ] Still logged in after closing/reopening
- [ ] Session expires after 7 days (test later)

## Phase 4.3: Document Management Tests

### Document Upload ✓

1. Log in as `test+user1@example.com`
2. Navigate to **Documents** page
3. Click "Upload Document"
4. Select test PDF file
5. Fill in details:
   - Category: "Contract"
   - Tags: "test, purchase"
6. Submit

**Expected Results:**
- [ ] Upload progress indicator appears
- [ ] Upload completes successfully
- [ ] Document appears in list
- [ ] Processing status shows "Processing" → "Ready"
- [ ] Wait ~30-60 seconds for processing
- [ ] Status updates to "Ready" (refresh page if needed)

**Verify in Supabase Database:**

Navigate to: Database → Table Editor

1. **documents table:**
   - [ ] Document record exists
   - [ ] tenant_id matches user's tenant
   - [ ] status = 'ready'
   - [ ] file_path populated

2. **document_chunks table:**
   - [ ] Multiple chunk records exist for document
   - [ ] embeddings column populated (pgvector data)
   - [ ] chunk_index sequential (0, 1, 2, ...)

3. **Storage bucket:**
   - Navigate to: Storage → documents
   - [ ] File exists in storage
   - [ ] File size correct

### Document Processing Verification ✓

1. Click on uploaded document
2. View document details

**Expected Results:**
- [ ] AI summary visible
- [ ] Summary is relevant to document content
- [ ] Document type detected (e.g., "contract", "inspection")
- [ ] Key information extracted (if applicable)
- [ ] Can download original document

### Document Search ✓

1. Navigate to Documents page
2. Use search bar
3. Search for keyword from document (e.g., "purchase price")

**Expected Results:**
- [ ] Search returns relevant documents
- [ ] Results appear quickly (<2 seconds)
- [ ] Highlighting shows matching keywords
- [ ] No results for unrelated keywords

### Document Deletion ✓

1. Select a document
2. Click delete/trash icon
3. Confirm deletion

**Expected Results:**
- [ ] Confirmation dialog appears
- [ ] After confirming, document removed from list
- [ ] Document removed from database
- [ ] File removed from storage (verify in Supabase Storage)

## Phase 4.4: AI Chat Functionality Tests

### Single Document Chat ✓

1. Navigate to uploaded document
2. Click "Chat with this document"
3. Ask question: "What is this document about?"
4. Submit

**Expected Results:**
- [ ] Loading indicator appears
- [ ] Response streams in (text appears gradually)
- [ ] Response is relevant to document content
- [ ] Response completes without errors
- [ ] Message appears in chat history

### Multi-Document Chat ✓

1. Upload 2-3 different documents (if not already)
2. Navigate to **Chat** page (homepage)
3. Select multiple documents or "All Documents"
4. Ask question: "What properties do I have contracts for?"
5. Submit

**Expected Results:**
- [ ] Question sent successfully
- [ ] AI responds with information from multiple documents
- [ ] Response cites which documents information came from
- [ ] Can see document references/links in response

### Conversation Persistence ✓

1. Start a chat conversation
2. Ask 2-3 questions
3. Navigate away from chat page
4. Return to chat page

**Expected Results:**
- [ ] Previous conversation still visible
- [ ] All messages preserved
- [ ] Can continue conversation
- [ ] Conversations listed in sidebar

**Verify in Database:**
- Navigate to: Database → Table Editor → ai_conversations
- [ ] Conversation record exists
- [ ] tenant_id correct
- [ ] Navigate to: ai_messages
- [ ] All messages saved
- [ ] role = 'user' for user messages
- [ ] role = 'assistant' for AI responses

### AI Streaming Test ✓

1. Ask a complex question that requires long response
2. Watch response appear

**Expected Results:**
- [ ] Response appears word-by-word or chunk-by-chunk
- [ ] No long pauses or freezing
- [ ] If connection drops, shows error and allows retry
- [ ] Streaming completes fully

## Phase 4.5: CRM Functionality Tests

### Contacts CRUD ✓

**Create:**
1. Navigate to **Contacts** page
2. Click "Add Contact"
3. Fill in details:
   - Name: "John Smith"
   - Email: "john@example.com"
   - Phone: "555-1234"
   - Type: "Buyer"
4. Submit

**Expected Results:**
- [ ] Contact created successfully
- [ ] Appears in contacts list
- [ ] Can view contact details

**Read:**
1. Click on created contact
2. View full details

**Expected Results:**
- [ ] All information visible
- [ ] Can see contact history
- [ ] Can see linked properties/deals

**Update:**
1. Edit contact
2. Change phone number
3. Save

**Expected Results:**
- [ ] Changes saved successfully
- [ ] Updated info visible
- [ ] updated_at timestamp changed

**Delete:**
1. Delete contact
2. Confirm deletion

**Expected Results:**
- [ ] Contact removed from list
- [ ] Related data handled appropriately

### Properties CRUD ✓

**Create:**
1. Navigate to **Properties** page
2. Click "Add Property"
3. Fill in details:
   - Address: "123 Main St, Anytown, CA"
   - Price: "$500,000"
   - Bedrooms: 3
   - Bathrooms: 2
4. Submit

**Expected Results:**
- [ ] Property created successfully
- [ ] Appears in properties list
- [ ] Can view property details

**Map View (if implemented):**
- [ ] Property shows on map
- [ ] Can click marker to view details

### Deals/Pipeline Tests ✓

**Create Deal:**
1. Navigate to **Pipeline** page
2. Click "New Deal"
3. Link contact and property
4. Set deal amount
5. Submit

**Expected Results:**
- [ ] Deal created
- [ ] Appears in pipeline
- [ ] Shows correct stage (e.g., "Lead")

**Move Deal Through Pipeline:**
1. Drag deal to next stage
2. Add notes
3. Set milestone dates

**Expected Results:**
- [ ] Deal stage updates
- [ ] Notes saved
- [ ] Milestones created
- [ ] Timeline accurate

## Phase 4.6: Billing Integration Tests

**Note:** Test in **Stripe Test Mode** only.

### View Pricing Plans ✓

1. Navigate to **Billing** page or **Settings → Billing**
2. View available plans

**Expected Results:**
- [ ] Plans visible (Free, Pro, Enterprise, etc.)
- [ ] Pricing displayed correctly
- [ ] Features listed for each plan
- [ ] Current plan highlighted

### Stripe Checkout Flow ✓

1. Click "Upgrade to Pro"
2. Redirected to Stripe Checkout

**Expected Results:**
- [ ] Stripe hosted page loads
- [ ] Plan details correct
- [ ] Test mode indicator visible

3. Fill in test card details:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

4. Submit payment

**Expected Results:**
- [ ] Payment processes successfully
- [ ] Redirected back to app
- [ ] Success message displayed
- [ ] Subscription status updated

**Verify in Supabase:**
- Navigate to: Database → Table Editor → profiles
- [ ] subscription_status = 'active'
- [ ] subscription_tier = 'pro'
- [ ] stripe_customer_id populated

**Verify in Stripe Dashboard:**
- Navigate to: Stripe Dashboard → Customers
- [ ] Customer created
- [ ] Subscription active
- [ ] Payment successful

### Stripe Webhooks Test ✓

This tests that Stripe webhooks are reaching Supabase edge function.

1. Navigate to: Stripe Dashboard → Developers → Webhooks
2. Find webhook for: `https://<project-id>.supabase.co/functions/v1/stripe-webhook`
3. Click "Send test webhook"
4. Select event: `customer.subscription.updated`
5. Send

**Expected Results:**
- [ ] Webhook delivers successfully
- [ ] Returns 200 OK status
- [ ] No errors in Stripe logs
- [ ] Check Supabase edge function logs:
  ```bash
  supabase functions logs stripe-webhook --tail
  ```

### Customer Portal Test ✓

1. Navigate to **Billing** page
2. Click "Manage Subscription" or "Customer Portal"

**Expected Results:**
- [ ] Redirected to Stripe Customer Portal
- [ ] Can see current subscription
- [ ] Can update payment method
- [ ] Can cancel subscription (test if safe)
- [ ] After changes, redirected back to app

## Phase 4.7: Performance Tests

### Lighthouse Audit ✓

Run Lighthouse on production URL:

```bash
npx lighthouse https://smart-agent-platform.vercel.app \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-report.html \
  --view
```

**Target Scores:**
- [ ] Performance: **>90** (green)
- [ ] Accessibility: **>95** (green)
- [ ] Best Practices: **>90** (green)
- [ ] SEO: **>90** (green)

**If scores are low:**
- Check for large unoptimized images
- Check for render-blocking resources
- Check for accessibility violations

### Mobile Performance ✓

```bash
npx lighthouse https://smart-agent-platform.vercel.app \
  --preset=mobile \
  --output=html \
  --output-path=./lighthouse-mobile-report.html \
  --view
```

**Target Scores:**
- [ ] Performance: **>85** (acceptable for mobile)
- [ ] Other scores: Same as desktop

### Page Load Times ✓

Test with browser DevTools (F12 → Network tab):

| Page | Target Load Time | Actual |
|------|------------------|--------|
| Homepage | <2s | ___ |
| Documents | <2s | ___ |
| Chat | <2s | ___ |
| Properties | <2s | ___ |

- [ ] All pages load within target time
- [ ] No slow API calls (>3s)
- [ ] Images load progressively

## Phase 4.8: Security Tests

### Row Level Security (RLS) Test ✓

**Test Multi-Tenant Isolation:**

1. Create document as User 1
2. Log out
3. Log in as User 2
4. Navigate to Documents page

**Expected Results:**
- [ ] User 2 **cannot** see User 1's documents
- [ ] User 2 **cannot** access User 1's document URLs directly
- [ ] Each user sees only their own data

**Verify via Database Query:**

Navigate to: Supabase Dashboard → SQL Editor

```sql
-- Check that RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should show rowsecurity = true for all tables
```

- [ ] All tables have RLS enabled
- [ ] Policies exist for all tables

### Storage Security Test ✓

1. Upload document as User 1
2. Copy document URL from storage
3. Log out (or open incognito window)
4. Try to access document URL directly

**Expected Results:**
- [ ] Access denied (403 Forbidden) for private bucket
- [ ] Cannot view document without authentication
- [ ] Public buckets (avatars) are accessible

### Secrets Test ✓

1. View page source (Ctrl+U)
2. Check browser console
3. Check Network tab requests

**Expected Results:**
- [ ] No API keys visible in source code
- [ ] No service role keys in frontend
- [ ] Only anon key present (which is safe for frontend)
- [ ] No sensitive secrets in localStorage

## Phase 4.9: Cross-Browser Testing

### Desktop Browsers ✓

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if Mac available)
- [ ] Edge (latest)

**For each browser, verify:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Document upload works
- [ ] AI chat works
- [ ] No console errors

### Mobile Testing ✓

Test on real devices if available:

**iOS (iPhone):**
- [ ] Safari: App loads and works
- [ ] Safari: Touch interactions responsive
- [ ] Safari: No layout issues

**Android:**
- [ ] Chrome: App loads and works
- [ ] Chrome: Touch interactions responsive
- [ ] Chrome: No layout issues

**Mobile Emulation (if no real devices):**
- Chrome DevTools → Toggle device toolbar
- Test on: iPhone 13 Pro, Pixel 5
- [ ] Responsive layout works
- [ ] Touch targets are large enough (44px minimum)
- [ ] Text readable without zooming

## Phase 4.10: Error Handling Tests

### Network Errors ✓

1. Navigate to Documents page
2. Open DevTools → Network tab
3. Throttle network to "Offline"
4. Try to upload document

**Expected Results:**
- [ ] Shows "No connection" or similar error
- [ ] Does not crash or freeze
- [ ] Allows retry after reconnecting

### Invalid Input Tests ✓

1. Try to create contact with invalid email
2. Try to upload non-PDF file to documents (if restricted)
3. Try to submit empty forms

**Expected Results:**
- [ ] Validation errors shown
- [ ] User-friendly error messages
- [ ] No console errors
- [ ] Can correct and resubmit

### Edge Function Errors ✓

Simulate edge function failure:

```bash
# Temporarily break ANTHROPIC_API_KEY secret
supabase secrets set ANTHROPIC_API_KEY=invalid_key_for_testing

# Try to upload document
# Should fail gracefully

# Restore correct key
supabase secrets set ANTHROPIC_API_KEY=<correct-key>
```

**Expected Results:**
- [ ] Error message shown to user
- [ ] Error logged in edge function logs
- [ ] App doesn't crash
- [ ] Can retry after fixing

## Testing Report Template

After completing all tests, document results:

```markdown
# Smart Agent Migration Testing Report
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: https://smart-agent-platform.vercel.app

## Infrastructure Tests
- [x] Database connectivity: PASS
- [x] Edge functions health: PASS
- [x] Frontend deployment: PASS

## Authentication Tests
- [x] Sign up: PASS
- [x] Email confirmation: PASS
- [x] Login: PASS
- [x] Password reset: PASS
- [x] Session persistence: PASS

## Document Management Tests
- [x] Upload: PASS
- [x] Processing: PASS
- [x] Search: PASS
- [x] Deletion: PASS

## AI Chat Tests
- [x] Single document chat: PASS
- [x] Multi-document chat: PASS
- [x] Conversation persistence: PASS
- [x] Streaming: PASS

## CRM Tests
- [x] Contacts CRUD: PASS
- [x] Properties CRUD: PASS
- [x] Deals/Pipeline: PASS

## Billing Tests
- [x] View plans: PASS
- [x] Stripe checkout: PASS
- [x] Webhooks: PASS
- [x] Customer portal: PASS

## Performance Tests
- [x] Lighthouse desktop: 93 (PASS)
- [x] Lighthouse mobile: 87 (PASS)
- [x] Page load times: All <2s (PASS)

## Security Tests
- [x] RLS multi-tenant: PASS
- [x] Storage security: PASS
- [x] No secrets exposed: PASS

## Cross-Browser Tests
- [x] Chrome: PASS
- [x] Firefox: PASS
- [x] Safari: PASS
- [x] Mobile (Chrome): PASS

## Error Handling Tests
- [x] Network errors: PASS
- [x] Invalid input: PASS
- [x] Edge function errors: PASS

## Issues Found
[List any issues discovered and their resolutions]

## Recommendation
☑️ READY FOR CUTOVER
☐ NOT READY (list blockers)
```

## Estimated Time

- Infrastructure tests: 15 minutes
- Authentication tests: 20 minutes
- Document management tests: 30 minutes
- AI chat tests: 20 minutes
- CRM tests: 30 minutes
- Billing tests: 20 minutes
- Performance tests: 15 minutes
- Security tests: 20 minutes
- Cross-browser tests: 30 minutes
- Error handling tests: 15 minutes

**Total: ~3-4 hours** (comprehensive testing)

## What's Next?

After all tests pass:
1. ✅ Complete testing validation
2. ⏭️ Execute cutover (Phase 5)
3. ⏭️ Monitor for 24-48 hours
4. ⏭️ Archive old infrastructure (Phase 6)
