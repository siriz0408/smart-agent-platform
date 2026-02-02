# State Management for QA Orchestrator

## Overview

The QA orchestrator uses `test-artifacts/state.json` as the single source of truth for test execution state. All agents (Browser QA, Debugger, Reporter) read from and write to this file.

## State File Schema

```typescript
interface QAState {
  testRun: {
    id: string;              // Unique test run ID
    startTime: string;       // ISO 8601 timestamp
    endTime?: string;        // ISO 8601 timestamp
    status: 'running' | 'completed' | 'aborted';
    retryCount: number;      // Current retry cycle (0-3)
    maxRetries: number;      // Max allowed retries (default: 3)
  };
  tests: {
    [testName: string]: {
      status: 'passed' | 'failed' | 'skipped' | 'running';
      duration: number;      // Seconds
      error?: string;
      screenshot?: string;
      console?: string[];
      retried?: boolean;
      fixApplied?: string;
    };
  };
  failures: Array<{
    test: string;
    error: string;
    screenshot: string;
    console: string[];
    fixed: boolean;
  }>;
  fixes?: Array<{
    test: string;
    rootCause: string;
    fix: string;
    filesChanged: string[];
    lintPassed: boolean;
    testsPassed: boolean;
    retestStatus: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;        // Total seconds
  };
}
```

## State Lifecycle

### 1. Initialize (Orchestrator Start)

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
  "failures": [],
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "duration": 0
  }
}
EOF
```

### 2. Update (Browser QA Running)

Browser QA agent adds test results:

```json
{
  "tests": {
    "login/valid": {
      "status": "passed",
      "duration": 3.2,
      "screenshot": "test-artifacts/screenshots/login-success.png"
    },
    "documents/upload": {
      "status": "failed",
      "duration": 5.3,
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
      "console": ["ReferenceError: uploadButton is not defined at line 45"]
    }
  }
}
```

### 3. Add Failure Context (Browser QA Complete)

```json
{
  "failures": [
    {
      "test": "documents/upload",
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
      "console": ["ReferenceError: uploadButton is not defined at line 45"],
      "fixed": false
    }
  ]
}
```

### 4. Apply Fix (Debugger Running)

Debugger adds fix details:

```json
{
  "fixes": [
    {
      "test": "documents/upload",
      "rootCause": "Upload button missing data-testid attribute",
      "fix": "Added data-testid='upload-button' to Button component",
      "filesChanged": ["src/pages/Documents.tsx"],
      "lintPassed": true,
      "testsPassed": true,
      "retestStatus": "passed"
    }
  ],
  "failures": [
    {
      "test": "documents/upload",
      "error": "Upload button not found",
      "screenshot": "test-artifacts/screenshots/document-upload-fail.png",
      "console": ["ReferenceError: uploadButton is not defined at line 45"],
      "fixed": true
    }
  ]
}
```

### 5. Update Test Status (After Retry)

```json
{
  "tests": {
    "documents/upload": {
      "status": "passed",
      "duration": 5.1,
      "screenshot": "test-artifacts/screenshots/document-upload-fixed.png",
      "retried": true,
      "fixApplied": "Added data-testid='upload-button' to Button component"
    }
  },
  "testRun": {
    "retryCount": 1
  }
}
```

### 6. Finalize (Orchestrator Complete)

```json
{
  "testRun": {
    "id": "qa-20260202-123000",
    "startTime": "2026-02-02T12:30:00Z",
    "endTime": "2026-02-02T12:45:23Z",
    "status": "completed",
    "retryCount": 1,
    "maxRetries": 3
  },
  "summary": {
    "total": 25,
    "passed": 25,
    "failed": 0,
    "skipped": 0,
    "duration": 923.4
  }
}
```

## Atomic Updates

To avoid race conditions with concurrent agents, use atomic file operations:

```bash
# Read current state
STATE=$(cat test-artifacts/state.json)

# Update with jq
echo "$STATE" | jq '.tests["login/valid"] = {
  "status": "passed",
  "duration": 3.2
}' > test-artifacts/state.json.tmp

# Atomic move
mv test-artifacts/state.json.tmp test-artifacts/state.json
```

## Reading State

```bash
# Get overall status
cat test-artifacts/state.json | jq -r '.testRun.status'

# Get failure count
cat test-artifacts/state.json | jq '.failures | length'

# Get retry count
cat test-artifacts/state.json | jq -r '.testRun.retryCount'

# List failed tests
cat test-artifacts/state.json | jq -r '.failures[] | .test'

# Check if test needs retry
RETRY_COUNT=$(cat test-artifacts/state.json | jq -r '.testRun.retryCount')
MAX_RETRIES=$(cat test-artifacts/state.json | jq -r '.testRun.maxRetries')
if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
  echo "Can retry"
fi
```

## State Validation

```bash
# Validate JSON structure
jq empty test-artifacts/state.json 2>&1

# Check required fields
jq -e '.testRun.id' test-artifacts/state.json > /dev/null || echo "Missing test run ID"
jq -e '.testRun.status' test-artifacts/state.json > /dev/null || echo "Missing status"

# Validate status values
STATUS=$(jq -r '.testRun.status' test-artifacts/state.json)
if [[ ! "$STATUS" =~ ^(running|completed|aborted)$ ]]; then
  echo "Invalid status: $STATUS"
fi
```

## Backup and Recovery

```bash
# Backup state before risky operations
cp test-artifacts/state.json test-artifacts/state.json.backup

# Restore from backup
cp test-artifacts/state.json.backup test-artifacts/state.json

# Auto-backup on updates
STATE_BACKUP="test-artifacts/state-$(date +%Y%m%d-%H%M%S).json"
cp test-artifacts/state.json "$STATE_BACKUP"
```

## State File Locations

```
test-artifacts/
├── state.json              # Current active state
├── state-20260202-123000.json  # Archived state (completed run)
├── state-20260202-140000.json
└── state.json.backup       # Emergency backup
```

## Example State Queries

```bash
# Get test duration
cat test-artifacts/state.json | jq '.summary.duration'

# Get passed test count
cat test-artifacts/state.json | jq '.summary.passed'

# Get list of all test names
cat test-artifacts/state.json | jq -r '.tests | keys[]'

# Get failed test details
cat test-artifacts/state.json | jq '.tests[] | select(.status == "failed")'

# Check if any tests failed
cat test-artifacts/state.json | jq -e '.summary.failed > 0'

# Get fixes applied
cat test-artifacts/state.json | jq '.fixes'
```

## Best Practices

1. **Always validate JSON** before writing
2. **Use atomic operations** for concurrent access
3. **Backup before major changes**
4. **Archive completed runs** for historical tracking
5. **Validate required fields** exist
6. **Use jq for safe manipulation**
7. **Handle missing fields gracefully**
8. **Document state schema changes**
