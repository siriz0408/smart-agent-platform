# Code Quality Audit Report
**Date:** February 5, 2026  
**Scope:** `/src/` directory  
**Focus Areas:** React anti-patterns, error handling, data handling bugs, logic errors

---

## Executive Summary

**Total Issues Found:** 23  
**Critical:** 5  
**High:** 8  
**Medium:** 7  
**Low:** 3

---

## 🔴 CRITICAL SEVERITY

### 1. **Race Condition in `useAuth.tsx` - Missing Dependency & setTimeout**
**File:** `src/hooks/useAuth.tsx:67-100`  
**Issue:** `fetchProfile` is called inside `useEffect` but not included in dependencies. Additionally, `setTimeout` is used without cleanup, causing potential race conditions.

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0); // ⚠️ No cleanup
      }
    }
  );
  // ...
  return () => subscription.unsubscribe();
}, []); // ⚠️ Missing fetchProfile dependency
```

**Impact:** 
- Stale closures if `fetchProfile` changes
- Race conditions if component unmounts before setTimeout executes
- Potential memory leaks

**Fix:** Add `fetchProfile` to dependencies and use cleanup for setTimeout, or wrap `fetchProfile` in `useCallback`.

---

### 2. **Memory Leak in `useTypingIndicator.ts` - Missing Cleanup Dependency**
**File:** `src/hooks/useTypingIndicator.ts:118-126`  
**Issue:** Cleanup effect calls `stopTyping.mutate()` but `stopTyping` is not in dependencies.

```typescript
useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping.mutate(); // ⚠️ stopTyping not in deps
  };
}, []); // ⚠️ Missing stopTyping dependency
```

**Impact:** 
- Stale closure - cleanup may use outdated `stopTyping` reference
- Mutation may fail silently if hook unmounts before mutation completes

**Fix:** Add `stopTyping` to dependencies array.

---

### 3. **Stale Closure in `useMessageStream.ts` - Messages Dependency**
**File:** `src/hooks/useMessageStream.ts:44-150`  
**Issue:** `sendMessage` callback uses `messages` in closure but dependency array includes `messages`, causing unnecessary re-renders and potential stale state.

```typescript
const sendMessage = useCallback(async (options: SendMessageOptions) => {
  // ...
  const streamMessages: StreamMessage[] = messages // ⚠️ Uses messages
    .concat(userMessage)
    .map((m) => ({ role: m.role, content: m.content }));
  // ...
}, [messages, streamMessage, isStreaming]); // ⚠️ messages causes re-creation
```

**Impact:** 
- Function recreated on every message change
- Potential race conditions if multiple messages sent quickly
- Performance degradation

**Fix:** Use functional state updates or ref for messages instead of including in dependencies.

---

### 4. **Race Condition in `useAIStreaming.ts` - Abort Controller Not Cleaned Up**
**File:** `src/hooks/useAIStreaming.ts:115-301`  
**Issue:** `abort()` is called at start of `streamMessage`, but if `streamMessage` is called multiple times rapidly, previous abort controllers may not be properly cleaned up.

```typescript
const streamMessage = useCallback(async (options: StreamOptions) => {
  abort(); // ⚠️ May abort previous stream, but cleanup happens in finally
  setIsStreaming(true);
  const controller = new AbortController();
  abortControllerRef.current = controller;
  // ...
}, [abort]);
```

**Impact:** 
- Multiple concurrent streams may interfere
- Abort signals may not work correctly
- Memory leaks from unhandled readers

**Fix:** Ensure abort controller cleanup happens synchronously before creating new one, or track multiple controllers.

---

### 5. **Unhandled Promise Rejection in `useAgentExecution.ts`**
**File:** `src/hooks/useAgentExecution.ts:89-117`  
**Issue:** `reader.read()` can throw errors that aren't caught in the while loop.

```typescript
while (true) {
  const { done, value } = await reader.read(); // ⚠️ No try-catch in loop
  if (done) break;
  // ...
}
```

**Impact:** 
- Unhandled promise rejections if stream fails mid-read
- Error state not properly set
- User sees no error feedback

**Fix:** Wrap `reader.read()` in try-catch within the loop.

---

## 🟠 HIGH SEVERITY

### 6. **useEffect Dependency Issue in `use-toast.ts`**
**File:** `src/hooks/use-toast.ts:169-177`  
**Issue:** `useEffect` includes `state` in dependencies, causing listener to be re-registered on every state change.

```typescript
React.useEffect(() => {
  listeners.push(setState);
  return () => {
    const index = listeners.indexOf(setState);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}, [state]); // ⚠️ state dependency causes re-registration
```

**Impact:** 
- Performance degradation
- Multiple listeners for same component
- Memory leaks

**Fix:** Remove `state` from dependencies - `setState` reference is stable.

---

### 7. **Missing Error Handling in `useAuth.tsx` - Silent Failure**
**File:** `src/hooks/useAuth.tsx:86-97`  
**Issue:** `.catch()` handler silently swallows errors without logging.

```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  // ...
}).catch(() => {
  setLoading(false); // ⚠️ Silent failure
});
```

**Impact:** 
- Errors go unnoticed
- Difficult to debug auth issues
- No user feedback

**Fix:** Log error and show user-friendly message.

---

### 8. **Race Condition in `useDocumentIndexing.ts` - setTimeout Cleanup**
**File:** `src/hooks/useDocumentIndexing.ts:135-141`  
**Issue:** `setTimeout` used without cleanup, can execute after component unmounts.

```typescript
setTimeout(() => {
  setProgress(prev => {
    const next = { ...prev };
    delete next[documentId];
    return next;
  });
}, 2000); // ⚠️ No cleanup if component unmounts
```

**Impact:** 
- State updates on unmounted component
- React warnings
- Potential memory leaks

**Fix:** Store timeout ID and clear in cleanup function.

---

### 9. **Missing Null Check in `Chat.tsx` - Potential Crash**
**File:** `src/pages/Chat.tsx:307`  
**Issue:** `convId!` uses non-null assertion without verification.

```typescript
await saveMessage(convId!, "assistant", fullContent, embeddedComps);
await supabase
  .from("ai_conversations")
  .update({ updated_at: new Date().toISOString() })
  .eq("id", convId!); // ⚠️ Non-null assertion without check
```

**Impact:** 
- Runtime crash if `convId` is null
- Data corruption
- Poor user experience

**Fix:** Add null check before using `convId`.

---

### 10. **Stale Closure in `useUserPresence.ts` - Missing Dependency**
**File:** `src/hooks/useUserPresence.ts:44-82`  
**Issue:** `updatePresence` mutation used in `useEffect` but not in dependencies.

```typescript
useEffect(() => {
  updatePresence.mutate({ status: "online", currentPage: window.location.pathname });
  // ...
  return () => {
    updatePresence.mutate({ status: "offline" }); // ⚠️ updatePresence not in deps
  };
}, [user?.id]); // ⚠️ Missing updatePresence
```

**Impact:** 
- Stale closure may use outdated mutation
- Cleanup may not execute properly
- Presence state may be incorrect

**Fix:** Add `updatePresence` to dependencies or use ref.

---

### 11. **Array Mutation Risk in `PropertyMap.tsx`**
**File:** `src/components/properties/PropertyMap.tsx:71-72`  
**Issue:** Using non-null assertion (`!`) on potentially undefined values in reduce.

```typescript
const avgLat = propertiesWithCoords.reduce((sum, p) => sum + p.address.latitude!, 0) / propertiesWithCoords.length;
const avgLng = propertiesWithCoords.reduce((sum, p) => sum + p.address.longitude!, 0) / propertiesWithCoords.length;
```

**Impact:** 
- Runtime error if `latitude` or `longitude` is undefined
- Type safety violation

**Fix:** Add proper null checks or use default values.

---

### 12. **Missing Error Handling in `useRealtimeMessages.ts`**
**File:** `src/hooks/useRealtimeMessages.ts:25-29`  
**Issue:** `onNewMessage` callback called without error handling.

```typescript
(payload) => {
  logger.debug("New message received:", payload);
  queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
  onNewMessage?.(); // ⚠️ No error handling if callback throws
}
```

**Impact:** 
- Unhandled errors break realtime subscription
- Silent failures

**Fix:** Wrap callback in try-catch.

---

### 13. **Logic Error in `Pipeline.tsx` - Missing Error Handling**
**File:** `src/pages/Pipeline.tsx:154-156`  
**Issue:** `createMilestonesMutation.mutateAsync` called without await or error handling.

```typescript
if (!existingMilestones || existingMilestones.length === 0) {
  await createMilestonesMutation.mutateAsync({ dealId, expectedCloseDate });
  // ⚠️ No error handling - if this fails, stage update succeeds but milestones don't create
}
```

**Impact:** 
- Inconsistent state if milestone creation fails
- User sees success but milestones missing
- Data integrity issue

**Fix:** Add try-catch and handle error appropriately.

---

## 🟡 MEDIUM SEVERITY

### 14. **Type Safety Issue in `useDocumentIndexing.ts`**
**File:** `src/hooks/useDocumentIndexing.ts:125`  
**Issue:** Accessing `prev[documentId]` without checking if it exists.

```typescript
setProgress(prev => ({
  ...prev,
  [documentId]: {
    ...prev[documentId], // ⚠️ May be undefined
    status: 'completed',
    progress: 100,
  }
}));
```

**Impact:** 
- Spread of undefined may cause issues
- Type safety violation

**Fix:** Provide default object if `prev[documentId]` is undefined.

---

### 15. **Missing Validation in `useAgentExecution.ts`**
**File:** `src/hooks/useAgentExecution.ts:60-78`  
**Issue:** Error response parsing assumes JSON without checking content-type.

```typescript
if (!response.ok) {
  const errorData = await response.json(); // ⚠️ Assumes JSON response
  // ...
}
```

**Impact:** 
- Parse error if response isn't JSON
- Unhandled exception

**Fix:** Check content-type or wrap in try-catch.

---

### 16. **Potential Null Access in `Chat.tsx`**
**File:** `src/pages/Chat.tsx:258-276`  
**Issue:** Accessing `prev[prev.length - 1]` without checking array length.

```typescript
setMessages((prev) => {
  const last = prev[prev.length - 1]; // ⚠️ May be undefined if array empty
  if (last?.role === "assistant") {
    // ...
  }
});
```

**Impact:** 
- Logic works due to optional chaining, but could be clearer
- Edge case not explicitly handled

**Fix:** Add explicit length check or keep optional chaining but add comment.

---

### 17. **Missing Cleanup in `usePresenceSubscription.ts`**
**File:** `src/hooks/useUserPresence.ts:140`  
**Issue:** Filter string built with `userIds.join(",")` - if userIds contains special characters, filter may fail.

```typescript
filter: `user_id=in.(${userIds.join(",")})`, // ⚠️ No escaping
```

**Impact:** 
- SQL injection risk (though Supabase should sanitize)
- Filter may fail with special characters

**Fix:** Use parameterized query or validate userIds.

---

### 18. **Error Handling Gap in `useAIStreaming.ts`**
**File:** `src/hooks/useAIStreaming.ts:154-169`  
**Issue:** Error response parsing doesn't handle non-JSON responses.

```typescript
if (!response.ok) {
  const errorData = await response.json(); // ⚠️ May not be JSON
  // ...
}
```

**Impact:** 
- Parse error if error response is text/HTML
- Unhandled exception

**Fix:** Check content-type or use try-catch with fallback.

---

### 19. **Race Condition in `Chat.tsx` - State Updates**
**File:** `src/pages/Chat.tsx:256-299`  
**Issue:** Multiple `setMessages` calls in callbacks may cause race conditions.

```typescript
onChunk: (_chunk, fullContent) => {
  setMessages((prev) => { /* ... */ }); // ⚠️ May race with onEmbeddedComponents
},
onEmbeddedComponents: (components) => {
  setMessages((prev) => { /* ... */ }); // ⚠️ May race with onChunk
},
```

**Impact:** 
- State updates may overwrite each other
- Inconsistent UI state

**Fix:** Combine updates or use reducer pattern.

---

### 20. **Missing Error Boundary in Async Operations**
**File:** Multiple files  
**Issue:** Many async operations don't have error boundaries or fallback UI.

**Impact:** 
- Unhandled errors crash entire component tree
- Poor user experience

**Fix:** Add error boundaries around async operations or use React Query error handling.

---

## 🟢 LOW SEVERITY

### 21. **Console.log in Production Code**
**File:** `src/hooks/useAIStreaming.ts:203-225`  
**Issue:** Multiple `console.log` statements left in production code.

```typescript
console.log("[useAIStreaming] Raw SSE data:", jsonStr.slice(0, 150));
console.log("[useAIStreaming] Parsed SSE event:", JSON.stringify(parsed).slice(0, 200));
```

**Impact:** 
- Performance overhead
- Security risk (may leak data)
- Cluttered console

**Fix:** Remove or wrap in development check.

---

### 22. **Inefficient Array Operations**
**File:** `src/pages/Properties.tsx:172-174`  
**Issue:** Multiple filter operations could be combined.

```typescript
const activeListings = properties.filter((p) => p.status === "active").length;
const totalValue = properties
  .filter((p) => p.status === "active")
  .reduce((acc, p) => acc + (p.price || 0), 0);
```

**Impact:** 
- Unnecessary array iterations
- Performance impact on large datasets

**Fix:** Combine into single reduce operation.

---

### 23. **Type Assertion Without Validation**
**File:** `src/hooks/useSavedProperties.ts:120-142`  
**Issue:** Multiple `as` type assertions without runtime validation.

```typescript
return ((data || []) as unknown as SavedPropertyRow[]).map((item) => ({
  // Multiple 'as' assertions
  id: item.properties.id as string,
  address: item.properties.address as string,
  // ...
}));
```

**Impact:** 
- Runtime errors if data structure changes
- Type safety illusion

**Fix:** Add runtime validation or use proper type guards.

---

## Recommendations

### Immediate Actions (Critical & High)
1. Fix race conditions in `useAuth.tsx`, `useTypingIndicator.ts`, `useMessageStream.ts`
2. Add proper error handling for all async operations
3. Fix memory leaks in cleanup functions
4. Add null checks before using non-null assertions

### Short-term (Medium)
1. Add error boundaries around async components
2. Improve type safety with runtime validation
3. Remove console.log statements
4. Optimize array operations

### Long-term (Low)
1. Add comprehensive error tracking
2. Implement proper logging system
3. Add unit tests for edge cases
4. Consider using React Query error boundaries

---

## Testing Recommendations

1. **Test race conditions:** Rapidly trigger actions that cause state updates
2. **Test error scenarios:** Simulate network failures, invalid responses
3. **Test cleanup:** Verify all subscriptions/timeouts are cleaned up on unmount
4. **Test edge cases:** Empty arrays, null values, undefined properties

---

## Tools & Linting

Consider adding:
- `eslint-plugin-react-hooks` for hook dependency checking
- `eslint-plugin-react` for React best practices
- TypeScript strict mode enabled
- Pre-commit hooks to catch these issues early

---

**Report Generated:** February 5, 2026  
**Next Audit:** After fixes are implemented
