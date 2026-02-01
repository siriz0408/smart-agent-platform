# AI Features Troubleshooting Guide

Quick guide for debugging AI features when they're not working.

## Quick Diagnostic

Run these commands to check AI system health:

```bash
# 1. Check ANTHROPIC_API_KEY is configured
supabase secrets list --project-ref sthnezuadfbmbqlxiwtq | grep ANTHROPIC

# 2. Check ai-chat function is deployed
supabase functions list --project-ref sthnezuadfbmbqlxiwtq | grep ai-chat

# 3. Watch AI logs in real-time
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq --follow
```

## Common Issues

### Issue: No AI Response, No Errors

**Symptoms:**
- Message sends successfully
- Loading indicator shows
- No response appears
- No console errors

**Cause:** Streaming format mismatch

**Fix:**
1. Check Network tab in DevTools
2. Find `ai-chat` request
3. Look at Response tab
4. Should see: `data: {"choices":[{"delta":{"content":"..."}}]}`
5. If you see `{"type":"content_block_delta"}`, the converter isn't working

**Solution:**
```bash
# Redeploy ai-chat with latest code
git pull origin main
supabase functions deploy ai-chat --project-ref sthnezuadfbmbqlxiwtq
```

---

### Issue: "ANTHROPIC_API_KEY is not configured"

**Symptoms:**
- Error in console or function logs
- AI doesn't respond

**Fix:**
```bash
# Set the API key
supabase secrets set ANTHROPIC_API_KEY=<your-key> --project-ref sthnezuadfbmbqlxiwtq

# Verify it's set
supabase secrets list --project-ref sthnezuadfbmbqlxiwtq
```

---

### Issue: Document Indexing Fails

**Symptoms:**
- Document uploads but indexing fails
- No AI summary generated

**Check logs:**
```bash
supabase functions logs index-document --project-ref sthnezuadfbmbqlxiwtq --follow
```

**Common causes:**
- ANTHROPIC_API_KEY not set
- PDF too large (>10MB)
- Invalid PDF format

**Fix:**
1. Ensure ANTHROPIC_API_KEY is set
2. Try smaller PDF
3. Check logs for specific error

---

### Issue: Agent Execution Fails

**Symptoms:**
- Agent doesn't run
- Error: "LOVABLE_API_KEY is not configured" (old error)

**Fix:**
```bash
# Ensure latest execute-agent is deployed
supabase functions deploy execute-agent --project-ref sthnezuadfbmbqlxiwtq

# Check logs
supabase functions logs execute-agent --project-ref sthnezuadfbmbqlxiwtq --follow
```

---

### Issue: Streaming Stops Mid-Response

**Symptoms:**
- Response starts streaming
- Stops after a few words
- No error message

**Possible causes:**
1. Network timeout
2. Anthropic API error
3. Rate limiting

**Check:**
```bash
# View backend logs
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq

# Look for errors like:
# - "rate_limit_exceeded"
# - "timeout"
# - "stream interrupted"
```

---

## Frontend Debugging

### Console Commands

Open DevTools console and run:

```javascript
// Check if API endpoint is configured
console.log(import.meta.env.VITE_SUPABASE_URL);

// Check auth status
const { data } = await supabase.auth.getSession();
console.log('Auth:', data);

// Test AI endpoint directly
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'test' }]
  })
});
console.log('Response status:', response.status);
```

### Network Tab Inspection

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Send AI chat message
4. Click on `ai-chat` request
5. Check **Response** tab

**Healthy response:**
```
data: {"choices":[{"delta":{"content":"I"}}]}
data: {"choices":[{"delta":{"content":" can"}}]}
data: {"choices":[{"delta":{"content":" help"}}]}
data: [DONE]
```

**Unhealthy (Anthropic format not converted):**
```
event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"I"}}
```

---

## Backend Debugging

### View Real-Time Logs

```bash
# AI chat logs
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq --follow

# Document indexing logs
supabase functions logs index-document --project-ref sthnezuadfbmbqlxiwtq --follow

# Agent execution logs
supabase functions logs execute-agent --project-ref sthnezuadfbmbqlxiwtq --follow
```

### Check Function Health

```bash
# List all functions and their status
supabase functions list --project-ref sthnezuadfbmbqlxiwtq

# Test function directly
curl -i --location --request POST \
  'https://sthnezuadfbmbqlxiwtq.supabase.co/functions/v1/ai-chat' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"test"}]}'
```

---

## API Key Issues

### Verify ANTHROPIC_API_KEY

```bash
# List all secrets (values hidden for security)
supabase secrets list --project-ref sthnezuadfbmbqlxiwtq

# Should show:
# ANTHROPIC_API_KEY: ********
```

### Test API Key Directly

```bash
# Test with curl
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "test"}]
  }'
```

---

## Recovery Steps

If AI features are completely broken:

### 1. Verify Configuration
```bash
supabase secrets list --project-ref sthnezuadfbmbqlxiwtq
# Ensure ANTHROPIC_API_KEY is present
```

### 2. Redeploy Functions
```bash
git pull origin main
npm run functions:deploy
```

### 3. Check Deployment
```bash
supabase functions list --project-ref sthnezuadfbmbqlxiwtq
# Verify ai-chat, execute-agent, index-document are listed
```

### 4. Test in Browser
- Go to https://smart-agent-platform.vercel.app/
- Open DevTools console
- Send test message
- Check for errors

### 5. If Still Broken
- Check backend logs: `supabase functions logs ai-chat --follow`
- Check Network tab in DevTools
- Look for specific error messages
- Contact support with logs

---

## Prevention

To avoid AI issues:

1. **Always deploy edge functions after code changes:**
   ```bash
   git push origin main
   npm run functions:deploy
   ```

2. **Test AI after deployment:**
   - Send test chat message
   - Upload and index a document
   - Check console for errors

3. **Monitor logs regularly:**
   ```bash
   supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq
   ```

4. **Keep secrets updated:**
   - Rotate ANTHROPIC_API_KEY periodically
   - Update other secrets as needed

---

## Getting Help

If you're still stuck:

1. Collect diagnostic info:
   ```bash
   # Backend logs
   supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq > ai-logs.txt

   # Function list
   supabase functions list --project-ref sthnezuadfbmbqlxiwtq > functions.txt

   # Secrets list (values hidden)
   supabase secrets list --project-ref sthnezuadfbmbqlxiwtq > secrets.txt
   ```

2. Take screenshot of:
   - Browser console errors
   - Network tab showing failed request
   - Error message in UI

3. Note:
   - What action triggered the error
   - When it started happening
   - What you've tried already

4. Share all above info with support team
