# Smart Agent QA Orchestrator

**When to Use:** Coordinate end-to-end QA testing for Smart Agent platform. Dispatches browser QA tests, monitors failures, triggers debugger for fixes, and generates comprehensive test reports.

## Overview

This skill orchestrates automated QA testing using a multi-agent approach:
1. **Browser QA Agent** - Runs automated browser tests
2. **Debugger Agent** - Fixes failures and validates fixes
3. **Reporter Agent** - Generates test reports with screenshots

## Workflow

```
User Request
    ↓
Orchestrator starts
    ↓
Spawn Browser QA Agent → Run tests → Save state
    ↓
Check failures
    ↓
If failures → Spawn Debugger Agent → Fix → Re-test (max 3 cycles)
    ↓
Spawn Reporter Agent → Generate report
    ↓
Done
```

## State Management

Track test execution in `test-artifacts/state.json`:

```json
{
  "testRun": {
    "id": "qa-2026-02-02-12-30",
    "startTime": "2026-02-02T12:30:00Z",
    "status": "running",
    "retryCount": 0,
    "maxRetries": 3
  },
  "tests": {
    "login": { "status": "passed", "duration": 2.3 },
    "documents": { "status": "failed", "error": "Upload button not found" },
    "properties": { "status": "passed", "duration": 5.1 }
  },
  "failures": [
    {
      "test": "documents",
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/documents-upload-fail.png"
    }
  ]
}
```

## Usage

**Trigger full QA cycle:**
```
Run full QA test cycle on Smart Agent
```

**What happens:**
1. Orchestrator reads state file (or creates new run)
2. Spawns Browser QA agent in background
3. Monitors state.json for completion
4. If failures and retryCount < maxRetries:
   - Spawns Debugger agent
   - Waits for fixes
   - Re-spawns Browser QA agent
5. When all tests pass or max retries reached:
   - Spawns Reporter agent
   - Returns summary

## Orchestration Pattern

```typescript
// Pseudo-code for orchestrator logic
async function orchestrateQA() {
  const state = loadState();

  // Phase 1: Run tests
  const qaAgent = spawnAgent('smart-agent-browser-qa', {
    runInBackground: true,
    stateFile: 'test-artifacts/state.json'
  });

  await waitForCompletion(qaAgent);

  // Phase 2: Check for failures
  const updatedState = loadState();
  const failures = updatedState.failures || [];

  if (failures.length > 0 && state.retryCount < state.maxRetries) {
    // Phase 3: Debug and fix
    const debuggerAgent = spawnAgent('smart-agent-debugger', {
      failures: failures,
      stateFile: 'test-artifacts/state.json'
    });

    await waitForCompletion(debuggerAgent);

    // Phase 4: Re-test
    state.retryCount++;
    saveState(state);
    return orchestrateQA(); // Recursive retry
  }

  // Phase 5: Generate report
  const reporterAgent = spawnAgent('smart-agent-reporter', {
    stateFile: 'test-artifacts/state.json',
    outputPath: 'test-artifacts/reports/qa-report.md'
  });

  await waitForCompletion(reporterAgent);

  return summarizeResults(state);
}
```

## Parallel Execution

Use parallel agent dispatch for independent tests:

```
Orchestrator
    ├─ Browser QA Agent 1 (Login tests)
    ├─ Browser QA Agent 2 (Documents tests)
    ├─ Browser QA Agent 3 (Properties tests)
    └─ Browser QA Agent 4 (Contacts tests)
```

All agents write to shared `state.json` with atomic updates.

## Exit Criteria

**Success:** All tests pass
**Failure:** Max retries reached with failures
**Partial Success:** Some tests pass, others skipped due to blockers

## Implementation Steps

When user triggers QA cycle:

1. **Initialize state:**
   ```bash
   cat > test-artifacts/state.json <<EOF
   {
     "testRun": {
       "id": "qa-$(date +%Y%m%d-%H%M%S)",
       "startTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
       "status": "running",
       "retryCount": 0,
       "maxRetries": 3
     },
     "tests": {},
     "failures": []
   }
   EOF
   ```

2. **Spawn Browser QA agent:**
   Use Task tool with:
   - subagent_type: "general-purpose"
   - name: "browser-qa"
   - prompt: "Run smart-agent-browser-qa skill tests and save results to test-artifacts/state.json"
   - run_in_background: true

3. **Monitor completion:**
   Read state.json periodically until status changes to "completed"

4. **Handle failures:**
   If failures exist and retryCount < maxRetries:
   - Spawn debugger agent with failure context
   - Wait for fixes
   - Increment retryCount
   - Go to step 2

5. **Generate report:**
   Spawn reporter agent to create markdown report

6. **Return summary:**
   Read final state.json and report key metrics

## Error Handling

- **Agent spawn failure:** Log error, mark test run as "aborted"
- **Timeout:** Kill hung agents after 10 minutes, mark tests as "timeout"
- **State file corruption:** Backup state, create new run
- **Resource exhaustion:** Pause testing, wait for resources, resume

## Monitoring

Check agent progress:
```bash
# View running agents
/tasks

# Check latest test state
cat test-artifacts/state.json | jq '.tests'

# View latest screenshot
ls -lt test-artifacts/screenshots/ | head -1
```

## References

- `references/orchestration-patterns.md` - Parallel agent dispatch patterns
- `references/state-management.md` - State file format and locking
- `references/retry-strategies.md` - Exponential backoff, circuit breakers
