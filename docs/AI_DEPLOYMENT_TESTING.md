# AI Features Deployment Testing

**Date:** 2026-02-01
**Deployment:** Edge function fixes for AI streaming

## What Was Fixed

### Critical Fixes Deployed
1. ✅ `execute-agent` - Changed `LOVABLE_API_KEY` → `ANTHROPIC_API_KEY`
2. ✅ `ai-chat` - Added Anthropic → OpenAI streaming format conversion

### Files Modified
- `supabase/functions/execute-agent/index.ts`
- `supabase/functions/ai-chat/index.ts`
- `supabase/functions/_shared/stream-converter.ts` (NEW)

## Deployment Commands

```bash
# Login to Supabase
supabase login

# Deploy all functions
npm run functions:deploy

# Or deploy specific functions
supabase functions deploy ai-chat --project-ref sthnezuadfbmbqlxiwtq
supabase functions deploy execute-agent --project-ref sthnezuadfbmbqlxiwtq
```

## Verify Deployment

After deploying, check deployment status:

```bash
# Check function status
supabase functions list --project-ref sthnezuadfbmbqlxiwtq

# View function logs
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq
```

## Testing Checklist

### 1. AI Chat (Home Page)

**URL:** https://smart-agent-platform.vercel.app/

**Test Steps:**
1. [ ] Login to the app
2. [ ] Navigate to Home page
3. [ ] Open browser DevTools (F12) → Console tab
4. [ ] Type a message: "What can you help me with?"
5. [ ] Click Send

**Expected Results:**
- ✅ Message appears in chat
- ✅ Loading indicator shows
- ✅ AI response streams in character by character
- ✅ Response is complete and makes sense
- ✅ No errors in console

**Console Logs to Check:**
- Look for: `[useAIStreaming] Raw SSE data:`
- Look for: `[useAIStreaming] Parsed SSE event:`
- Should see: `{"choices":[{"delta":{"content":"..."}}]}`
- Should NOT see Anthropic format: `{"type":"content_block_delta"}`

**If it fails:**
- Check console for errors
- Check Network tab → `ai-chat` request
- Look at Response tab to see raw SSE data
- Copy any error messages

---

### 2. AI Chat (Chat Page)

**URL:** https://smart-agent-platform.vercel.app/chat

**Test Steps:**
1. [ ] Navigate to /chat page
2. [ ] Open browser DevTools → Console tab
3. [ ] Type: "Explain the real estate market in simple terms"
4. [ ] Click Send

**Expected Results:**
- ✅ AI responds with streaming text
- ✅ Response is relevant to real estate
- ✅ No console errors

---

### 3. Property Search Intent Detection

**URL:** https://smart-agent-platform.vercel.app/

**Test Steps:**
1. [ ] In AI chat, type: "Find me a 3 bedroom house in Austin under $500k"
2. [ ] Send the message

**Expected Results:**
- ✅ Status update: "Analyzing your request..."
- ✅ Status update: "Searching for properties..."
- ✅ Property cards appear OR message saying no properties found
- ✅ AI responds with context about the search
- ✅ No console errors

---

### 4. Document Upload & Indexing

**URL:** https://smart-agent-platform.vercel.app/documents

**Test Steps:**
1. [ ] Go to Documents page
2. [ ] Upload a PDF file (any PDF)
3. [ ] Wait for upload to complete
4. [ ] Click "Index" button
5. [ ] Watch processing status

**Expected Results:**
- ✅ Upload succeeds
- ✅ Indexing starts
- ✅ Processing completes
- ✅ AI summary appears
- ✅ Document type detected
- ✅ No errors in console

**Check Backend Logs:**
```bash
supabase functions logs index-document --project-ref sthnezuadfbmbqlxiwtq
```

---

### 5. Document Chat

**URL:** https://smart-agent-platform.vercel.app/documents/[document-id]/chat

**Test Steps:**
1. [ ] Click on an indexed document
2. [ ] Click "Chat" tab
3. [ ] Ask: "What is this document about?"
4. [ ] Send message

**Expected Results:**
- ✅ AI responds with document-specific information
- ✅ Response references document content
- ✅ Streaming works smoothly
- ✅ No console errors

---

### 6. Agent Execution

**URL:** https://smart-agent-platform.vercel.app/agents

**Test Steps:**
1. [ ] Go to Agents page
2. [ ] Select any agent
3. [ ] Provide required context
4. [ ] Click "Execute" or "Run"
5. [ ] Watch for response

**Expected Results:**
- ✅ Agent starts executing
- ✅ AI response streams
- ✅ Agent completes successfully
- ✅ No errors about LOVABLE_API_KEY
- ✅ No console errors

**Check Backend Logs:**
```bash
supabase functions logs execute-agent --project-ref sthnezuadfbmbqlxiwtq
```

---

### 7. Mortgage Calculator Intent

**Test Steps:**
1. [ ] In AI chat, type: "Calculate mortgage for a $400k home with 20% down"
2. [ ] Send message

**Expected Results:**
- ✅ Mortgage calculator widget appears
- ✅ Pre-filled with your values
- ✅ AI explains the calculation
- ✅ Streaming works
- ✅ No console errors

---

### 8. Error Handling

**Test Steps:**
1. [ ] In AI chat, type a very long message (1000+ characters)
2. [ ] Send 5 messages rapidly (test rate limiting)
3. [ ] Check for graceful error messages

**Expected Results:**
- ✅ Errors display user-friendly messages
- ✅ No cryptic error codes
- ✅ App doesn't crash
- ✅ Can continue using chat after error

---

## Common Issues & Solutions

### Issue: No AI response, no errors
**Cause:** Streaming format not being converted
**Solution:** Check that `stream-converter.ts` is deployed
**Check:** Look at Network tab → ai-chat response → should see `{"choices":[...]}`

### Issue: "LOVABLE_API_KEY is not configured"
**Cause:** execute-agent not deployed
**Solution:** Deploy execute-agent function
**Check:** `supabase functions list` shows latest version

### Issue: "ANTHROPIC_API_KEY is not configured"
**Cause:** Secret not set in Supabase
**Solution:** Add secret via dashboard or CLI
**Check:** `supabase secrets list --project-ref sthnezuadfbmbqlxiwtq`

### Issue: Streaming stops mid-response
**Cause:** Converter has a bug or Anthropic sent error event
**Solution:** Check backend logs
**Check:** `supabase functions logs ai-chat`

### Issue: Console shows Anthropic format events
**Cause:** Converter not being used
**Solution:** Verify ai-chat function was deployed with latest code
**Check:** View function code in Supabase dashboard

---

## Backend Logs Commands

```bash
# Watch ai-chat logs in real-time
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq --follow

# Watch execute-agent logs
supabase functions logs execute-agent --project-ref sthnezuadfbmbqlxiwtq --follow

# Watch index-document logs
supabase functions logs index-document --project-ref sthnezuadfbmbqlxiwtq --follow

# View all function logs
supabase functions logs --project-ref sthnezuadfbmbqlxiwtq
```

---

## Success Criteria

The AI features are fully working if:

- ✅ AI chat shows responses on Home page
- ✅ AI chat shows responses on Chat page
- ✅ Property search intent detection works
- ✅ Document indexing generates summaries
- ✅ Document chat uses document context
- ✅ Agent execution works without errors
- ✅ Calculators and widgets display correctly
- ✅ No console errors related to streaming
- ✅ No backend errors in function logs
- ✅ Streaming is smooth (no freezes/delays)

---

## Rollback Plan

If deployment breaks something:

```bash
# Revert the commits
git revert HEAD~2..HEAD

# Redeploy old version
npm run functions:deploy

# Or deploy from specific commit
git checkout <previous-commit-hash>
supabase functions deploy ai-chat --project-ref sthnezuadfbmbqlxiwtq
git checkout main
```

---

## Next Steps After Successful Testing

1. [ ] Update documentation (CLAUDE.md, README.md)
2. [ ] Remove all LOVABLE_API_KEY references
3. [ ] Add health check endpoint
4. [ ] Create automated deployment workflow
5. [ ] Add monitoring/alerting for AI failures
6. [ ] Update PRD with completed features

---

## Notes

**Deployment Date:** _Fill in after deployment_
**Deployed By:** _Fill in_
**Test Results:** _Fill in after testing_
**Issues Found:** _Fill in if any_
**Resolution:** _Fill in if issues found_
