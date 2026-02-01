# AI Features Not Working - Root Cause Analysis

**Date:** 2026-02-01
**Status:** ✅ Root cause identified

## Executive Summary

AI chat shows no responses due to **streaming format mismatch** between backend and frontend after migration from Lovable gateway to direct Anthropic API.

## Root Cause

### What's Happening

1. User sends chat message → Frontend calls `/functions/v1/ai-chat`
2. Backend correctly calls Anthropic API with `ANTHROPIC_API_KEY` ✅
3. Backend receives Anthropic's streaming response ✅
4. Backend **passes Anthropic's raw SSE stream** directly to frontend ❌
5. Frontend tries to parse as **OpenAI format** ❌
6. Frontend can't extract content → **No response shown** ❌

### The Format Mismatch

**Anthropic Streaming Format** (what backend sends):
```
event: message_start
data: {"type":"message_start","message":{"id":"msg_123",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_stop
data: {"type":"message_stop"}
```

**OpenAI Streaming Format** (what frontend expects):
```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

### Evidence

**Backend** (`supabase/functions/ai-chat/index.ts:1441-1447`):
```typescript
const reader = aiResponse.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  await writer.write(value);  // ❌ Passing raw Anthropic stream!
}
```

**Frontend** (`src/hooks/useAIStreaming.ts:205`):
```typescript
const content = parsed.choices?.[0]?.delta?.content;  // ❌ Looking for OpenAI format!
if (content) {
  fullContent += content;
  onChunk?.(content, fullContent);
}
```

**Frontend** (`src/hooks/useAIChat.ts:111`):
```typescript
const content = parsed.choices?.[0]?.delta?.content;  // ❌ Same issue!
```

## Why This Happened

### Migration Timeline

1. **Original implementation**: Used Lovable AI Gateway
   - Gateway accepted OpenAI-style requests
   - Returned OpenAI-style SSE streams
   - Frontend was built for OpenAI format

2. **Migration**: Direct Anthropic API integration
   - Backend updated to call `api.anthropic.com` directly ✅
   - `ANTHROPIC_API_KEY` configured ✅
   - Backend NOT updated to convert streaming format ❌
   - Frontend NOT updated to parse Anthropic format ❌

3. **Result**: Format mismatch → broken AI features

## Components Affected

### Broken Features
- ❌ AI Chat (Home page) - No responses show up
- ❌ AI Chat (Chat page) - No responses show up
- ❌ Document AI (probably) - If it uses streaming
- ❌ Agent Execution (partially) - Has wrong env var + format issues

### Working Features
- ✅ Document upload (doesn't use chat)
- ✅ CRM features (contacts, properties)
- ✅ Authentication

## Fix Options

### Option 1: Fix Backend (Convert Anthropic → OpenAI format)

**Pros:**
- Frontend unchanged (simpler, less risk)
- Centralized conversion logic
- Maintains OpenAI compatibility if needed later

**Cons:**
- Need to parse and reconstruct SSE stream in backend
- More backend processing overhead
- Adds complexity to edge functions

**Implementation:**
```typescript
// In ai-chat/index.ts, convert Anthropic stream to OpenAI format
const reader = aiResponse.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  let newlineIndex;

  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    let line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (!line.startsWith("data: ")) continue;
    const jsonStr = line.slice(6).trim();

    try {
      const anthropicEvent = JSON.parse(jsonStr);

      // Convert content_block_delta to OpenAI format
      if (anthropicEvent.type === "content_block_delta" &&
          anthropicEvent.delta?.type === "text_delta") {
        const openAIFormat = {
          choices: [{
            delta: {
              content: anthropicEvent.delta.text
            }
          }]
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
      }

      // Handle message_stop as [DONE]
      if (anthropicEvent.type === "message_stop") {
        await writer.write(encoder.encode(`data: [DONE]\n\n`));
      }
    } catch (e) {
      // Partial JSON, will be completed in next chunk
      buffer = line + "\n" + buffer;
      break;
    }
  }
}
```

### Option 2: Fix Frontend (Parse Anthropic format)

**Pros:**
- More direct (use Anthropic format natively)
- Simpler backend (less processing)
- Potentially better performance

**Cons:**
- Need to update multiple hooks (useAIChat, useAIStreaming)
- Risk of breaking other features if not comprehensive
- Need to understand all Anthropic event types

**Implementation:**
```typescript
// In useAIStreaming.ts, handle Anthropic events
const parsed = JSON.parse(jsonStr);

// Handle Anthropic streaming events
if (parsed.type === "content_block_delta" &&
    parsed.delta?.type === "text_delta") {
  const content = parsed.delta.text;
  if (content) {
    fullContent += content;
    onChunk?.(content, fullContent);
  }
  continue;
}

// Handle status/components (keep existing)
if (parsed.status) {
  onStatus?.(parsed.status);
  continue;
}

// Fallback to OpenAI format for backward compatibility
const content = parsed.choices?.[0]?.delta?.content;
if (content) {
  fullContent += content;
  onChunk?.(content, fullContent);
}
```

## Recommended Solution

**Option 1 (Backend Conversion)** is recommended because:
1. Single point of change
2. Frontend remains stable
3. Easier to test
4. Maintains compatibility with existing code

## Implementation Plan (Updated)

### Phase 1: Critical Fixes
1. ✅ Fix execute-agent environment variable (DONE)
2. ⏳ Add Anthropic → OpenAI stream conversion in backend
3. ⏳ Deploy all edge functions
4. ⏳ Test AI chat, document indexing, agents

### Phase 2: Testing & Validation
5. Test AI features work correctly
6. Verify no console errors
7. Check streaming performance
8. Test error scenarios

### Phase 3: Documentation & Future-Proofing
9. Update documentation
10. Add health checks
11. Create troubleshooting guide

## Next Steps

1. Get confirmation on fix approach (Option 1 vs Option 2)
2. Implement streaming format conversion
3. Deploy and test
4. Update documentation

## Files to Modify

### Critical (Option 1 - Backend Fix)
- `/supabase/functions/ai-chat/index.ts` - Add format conversion
- `/supabase/functions/_shared/anthropic-to-openai-stream.ts` - NEW helper

### Critical (Option 2 - Frontend Fix)
- `/src/hooks/useAIChat.ts` - Update SSE parsing
- `/src/hooks/useAIStreaming.ts` - Update SSE parsing

### Supporting
- `/supabase/functions/execute-agent/index.ts` - Already fixed ✅

## Testing Checklist

After fix:
- [ ] AI chat on Home page shows responses
- [ ] AI chat on Chat page shows responses
- [ ] Streaming is smooth (no delays/freezes)
- [ ] No console errors
- [ ] Document indexing works
- [ ] Agent execution works
- [ ] Error messages display properly
- [ ] Usage tracking works

## References

- [Anthropic Streaming API Docs](https://docs.anthropic.com/claude/reference/messages-streaming)
- [OpenAI Streaming API Format](https://platform.openai.com/docs/api-reference/streaming)
- Original issue: User reported "AI chat shows no responses"
