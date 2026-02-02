# Retry Strategies for QA Orchestrator

## Overview

The QA orchestrator implements intelligent retry strategies to handle transient failures, fix bugs automatically, and maximize test success rates without infinite loops.

## Retry Policy

### Default Configuration

```json
{
  "maxRetries": 3,
  "retryDelayMs": 5000,
  "exponentialBackoff": false,
  "retryOnlyFailed": true
}
```

### Retry Decision Logic

```bash
# Check if retry is allowed
RETRY_COUNT=$(cat test-artifacts/state.json | jq -r '.testRun.retryCount')
MAX_RETRIES=$(cat test-artifacts/state.json | jq -r '.testRun.maxRetries')
FAILURES=$(cat test-artifacts/state.json | jq '.failures | length')

if [ $FAILURES -gt 0 ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
  echo "Retry allowed (cycle $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  # Trigger debugger and retry
else
  echo "No retry (no failures or max retries reached)"
  # Proceed to reporter
fi
```

## Retry Workflows

### Workflow 1: Single Test Failure

```
Run 1: 24/25 tests pass, 1 fails
    ↓
Debugger analyzes failure
    ↓
Debugger implements fix
    ↓
Retry 1: Re-run ONLY failed test
    ↓
Result: ✅ PASS
    ↓
Total: 25/25 tests pass (1 retry cycle used)
```

### Workflow 2: Multiple Failures

```
Run 1: 20/25 tests pass, 5 fail
    ↓
Debugger processes failures sequentially
    ↓
Debugger fixes 3/5 issues
    ↓
Retry 1: Re-run 5 failed tests
    ↓
Result: 3 now pass, 2 still fail
    ↓
Debugger analyzes remaining 2 failures
    ↓
Debugger fixes 1/2 issues
    ↓
Retry 2: Re-run 2 failed tests
    ↓
Result: 1 now passes, 1 still fails
    ↓
Debugger cannot fix remaining issue
    ↓
Retry 3: Re-run 1 failed test
    ↓
Result: Still fails
    ↓
Max retries reached → Manual investigation required
    ↓
Total: 24/25 tests pass (3 retry cycles used)
```

### Workflow 3: All Tests Fail (Blocker)

```
Run 1: 0/25 tests pass (authentication broken)
    ↓
Debugger identifies: "All API calls returning 401"
    ↓
Debugger fixes: JWT token bug in universal-search
    ↓
Retry 1: Re-run ALL tests
    ↓
Result: 25/25 tests pass
    ↓
Total: 25/25 tests pass (1 retry cycle used)
```

## Retry-Only-Failed Strategy

By default, only failed tests are re-run to save time:

```bash
# Get list of failed tests
FAILED_TESTS=$(cat test-artifacts/state.json | jq -r '.failures[] | .test')

# Re-run only those tests
for test in $FAILED_TESTS; do
  echo "Re-running $test..."
  run_test "$test"
done
```

**Optimization:** Reduces retry time from ~15 minutes (all tests) to ~1-2 minutes (failed tests only)

## Exponential Backoff (Optional)

For transient network issues, use exponential backoff:

```bash
RETRY_DELAY=5000  # Start with 5 seconds
BACKOFF_MULTIPLIER=2

for retry in {1..3}; do
  echo "Retry $retry after ${RETRY_DELAY}ms delay"
  sleep $(($RETRY_DELAY / 1000))

  # Run tests
  run_tests

  # Check success
  FAILURES=$(cat test-artifacts/state.json | jq '.failures | length')
  if [ $FAILURES -eq 0 ]; then
    echo "All tests passed!"
    break
  fi

  # Exponential backoff for next retry
  RETRY_DELAY=$((RETRY_DELAY * BACKOFF_MULTIPLIER))
done
```

## Circuit Breaker Pattern

Stop retrying if failures are clearly not transient:

```bash
# Detect blocker failures
BLOCKER_ERRORS=(
  "Cannot connect to database"
  "API server not responding"
  "Authentication service down"
)

FAILURE_ERROR=$(cat test-artifacts/state.json | jq -r '.failures[0].error')

for blocker in "${BLOCKER_ERRORS[@]}"; do
  if [[ "$FAILURE_ERROR" == *"$blocker"* ]]; then
    echo "BLOCKER DETECTED: $blocker"
    echo "Aborting retry - manual intervention required"
    exit 1
  fi
done
```

## Retry State Tracking

```json
{
  "testRun": {
    "retryCount": 2,
    "maxRetries": 3,
    "retryHistory": [
      {
        "cycle": 1,
        "timestamp": "2026-02-02T12:35:00Z",
        "failedTests": ["documents/upload", "properties/create"],
        "fixesApplied": 2,
        "result": "1 still failing"
      },
      {
        "cycle": 2,
        "timestamp": "2026-02-02T12:40:00Z",
        "failedTests": ["properties/create"],
        "fixesApplied": 1,
        "result": "all passed"
      }
    ]
  }
}
```

## Retry Metrics

Track retry effectiveness:

```json
{
  "retryMetrics": {
    "totalRetries": 2,
    "successfulRetries": 2,
    "failedRetries": 0,
    "averageFixesPerRetry": 1.5,
    "timeSpentRetrying": 600
  }
}
```

## When NOT to Retry

**Skip retry for:**
1. **Max retries reached** - 3 cycles already used
2. **No failures** - All tests passed on first run
3. **Blocker detected** - Infrastructure issue requiring manual fix
4. **Test data corruption** - Database inconsistency
5. **User aborted** - Manual stop requested

## Retry Decision Tree

```
Test run complete
    ↓
Any failures?
    ├─ NO → Skip retry, proceed to reporter
    └─ YES ↓
          Retry count < max retries?
          ├─ NO → Max retries reached, proceed to reporter
          └─ YES ↓
                Blocker detected?
                ├─ YES → Abort retry, proceed to reporter
                └─ NO ↓
                      Spawn debugger
                      ↓
                      Increment retry count
                      ↓
                      Re-run failed tests
                      ↓
                      Back to start
```

## Best Practices

1. **Limit retries** - Max 3 cycles prevents infinite loops
2. **Retry only failed** - Saves time, faster feedback
3. **Track retry history** - Understand failure patterns
4. **Detect blockers** - Abort early on infrastructure issues
5. **Exponential backoff** - For transient network issues
6. **Document fixes** - Learn from automated debugging
7. **Report all attempts** - Show full history in final report

## Example Retry Log

```
QA Test Run: qa-20260202-123000

Run 1 (12:30:00): 24/25 passed, 1 failed
  - Failed: documents/upload (Upload button not found)
  - Debugger fix: Added data-testid attribute

Retry 1 (12:35:00): Re-running 1 failed test
  - Result: documents/upload ✅ PASS
  - Total: 25/25 passed

Summary:
  - Total retries: 1
  - Fixes applied: 1
  - Final result: ✅ ALL TESTS PASSED
  - Total duration: 15 minutes
```
