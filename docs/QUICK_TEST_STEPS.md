# Quick AI Testing Steps

**Deployment completed:** 2026-02-01
**Functions deployed:** ai-chat, execute-agent

## Quick Test (5 minutes)

### Test 1: AI Chat - Home Page

1. Open https://smart-agent-platform.vercel.app/
2. Login with your account
3. You should see the Home page with chat interface
4. **Open Browser DevTools:**
   - Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
   - Click "Console" tab
5. Type in chat: **"What can you help me with?"**
6. Click Send or press Enter

**✅ SUCCESS if you see:**
- Message appears in chat
- AI response streams in character by character
- Response makes sense (talks about real estate features)
- No errors in console

**❌ FAILURE if you see:**
- No response appears
- Console shows errors
- Message just shows "loading" forever

**Screenshot the console if there are any errors!**

---

### Test 2: Property Search Intent

In the same chat window:

1. Type: **"Find me a 3 bedroom house in Austin under $500k"**
2. Send message

**✅ SUCCESS if you see:**
- Status message: "Analyzing your request..."
- Status message: "Searching for properties..."
- Either property cards appear OR message saying "no properties found"
- AI responds with context

**❌ FAILURE if you see:**
- No status messages
- No response
- Errors in console

---

### Test 3: Mortgage Calculator

In the same chat window:

1. Type: **"Calculate mortgage for a $400k home with 20% down"**
2. Send message

**✅ SUCCESS if you see:**
- Calculator widget appears
- Shows monthly payment estimate
- AI explains the calculation
- Can adjust sliders

**❌ FAILURE if you see:**
- No calculator widget
- No response
- Errors

---

## Console Debugging

If AI doesn't respond, check the console for these messages:

**Good signs (working):**
```
[useAIStreaming] Raw SSE data: {"choices":[{"delta":{"content":"Hello"}}]}
[useAIStreaming] Parsed SSE event: {"choices":[...]}
```

**Bad signs (broken):**
```
Error: Failed to get response
Failed to parse SSE event
content_block_delta (this means Anthropic format not converted)
```

---

## Network Tab Debugging

If console doesn't show clear errors:

1. In DevTools, click **"Network"** tab
2. Click **"Fetch/XHR"** filter
3. Send a chat message
4. Look for request to **"ai-chat"**
5. Click on it
6. Click **"Response"** tab
7. You should see streaming data like:
   ```
   data: {"choices":[{"delta":{"content":"I"}}]}
   data: {"choices":[{"delta":{"content":" can"}}]}
   data: {"choices":[{"delta":{"content":" help"}}]}
   ```

If you see different format like:
```
event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"I"}}
```
This means the stream converter didn't deploy correctly.

---

## Backend Logs (if needed)

If frontend seems fine but no responses:

```bash
# Watch backend logs in real-time
supabase functions logs ai-chat --project-ref sthnezuadfbmbqlxiwtq --follow
```

Look for errors like:
- "ANTHROPIC_API_KEY is not configured"
- API errors from Anthropic
- Timeout errors

---

## Quick Results

After testing, report back:

**Test 1 (Basic Chat):** ✅ / ❌
**Test 2 (Property Search):** ✅ / ❌
**Test 3 (Calculator):** ✅ / ❌
**Console Errors:** (paste any errors here)
**Network Response Format:** (paste SSE data if broken)

---

## Expected Timeline

- Each test: 10-30 seconds
- Total testing: 5 minutes
- If something fails, collect logs: +5 minutes

---

## Next Steps

**If all tests pass:**
- ✅ AI is working!
- Move to documentation updates
- Clean up Lovable references

**If tests fail:**
- Collect console errors
- Check backend logs
- Review network response format
- Debug based on error messages
