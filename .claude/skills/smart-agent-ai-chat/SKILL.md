---
name: smart-agent-ai-chat
description: Reference implementation patterns for AI chat features - compare against Smart Agent's existing implementation
---

# AI Chat

**When to Use:** Reference implementation patterns for AI chat features. Smart Agent already has AI chat implemented - use this skill to compare patterns or improve existing implementation.

## Already Implemented in Smart Agent

- ✅ Multi-document RAG chat (ai-chat edge function)
- ✅ Streaming responses with SSE
- ✅ Conversation persistence (ai_conversations, ai_messages tables)
- ✅ Document context injection
- ✅ Embedded components (property cards)

## Use This Skill For

- Comparing our implementation vs best practices
- Adding features like conversation titles, sharing, export
- Optimizing streaming performance
- Improving error handling patterns

## Current Architecture

### Frontend
- `src/hooks/useAIChat.ts` - Chat hook with streaming
- `src/components/chat/` - Chat UI components
- React Query for conversation persistence

### Backend
- `supabase/functions/ai-chat/` - Edge function
- Lovable AI Gateway for model access
- Vector search for document context

### Database
- `ai_conversations` - Conversation metadata
- `ai_messages` - Message history
- `document_chunks` - Vector embeddings for RAG

## Improvement Opportunities

### 1. Conversation Titles
```typescript
// Auto-generate title from first message
async function generateTitle(firstMessage: string): Promise<string> {
  // Use AI to create concise title
  // Store in ai_conversations.title
}
```

### 2. Export Conversations
```typescript
// Export as markdown, PDF, or JSON
function exportConversation(conversationId: string, format: 'md' | 'pdf' | 'json') {
  // Fetch messages
  // Format according to type
  // Trigger download
}
```

### 3. Share Conversations
```typescript
// Generate shareable link
async function shareConversation(conversationId: string) {
  // Create share token
  // Generate public URL
  // Handle permissions
}
```

### 4. Streaming Optimization
```typescript
// Reduce latency with chunked responses
// Implement token-by-token streaming
// Add typing indicators
```

### 5. Error Handling
```typescript
// Graceful degradation
// Retry logic with backoff
// User-friendly error messages
// Fallback responses
```

## Best Practices Reference

### RAG Implementation
1. **Query Expansion** - Rephrase user query for better retrieval
2. **Hybrid Search** - Combine vector + keyword search
3. **Reranking** - Score and filter retrieved chunks
4. **Context Window** - Manage token limits intelligently

### Streaming
1. **Server-Sent Events** - Already using, good choice
2. **Token Batching** - Send every N tokens for efficiency
3. **Heartbeat** - Keep connection alive during processing
4. **Error Recovery** - Resume from last token on disconnect

### UX Patterns
1. **Typing Indicator** - Show AI is processing
2. **Source Citations** - Link to original documents
3. **Copy/Edit** - Allow copying or editing messages
4. **Regenerate** - Retry with same context
5. **Branch** - Create new conversation from any point

## Code Locations

```
supabase/functions/ai-chat/index.ts    - Main chat handler
supabase/functions/_shared/ai-config.ts - Model configuration
src/hooks/useAIChat.ts                  - React hook
src/components/chat/ChatMessage.tsx     - Message display
src/components/chat/ChatInput.tsx       - Input handling
```

## Testing AI Chat

```bash
# Run chat tests
npx vitest run -t "ai-chat"

# Test edge function locally
supabase functions serve ai-chat

# Test streaming
curl -X POST http://localhost:54321/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "conversation_id": "..."}'
```

**Note:** Smart Agent's AI chat is already functional. Use this skill as a reference for enhancements, not rebuilding from scratch. Focus on UX improvements and optimization rather than core architecture changes.
