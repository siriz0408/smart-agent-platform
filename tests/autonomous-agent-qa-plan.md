# Autonomous Agent System QA Test Plan

## Overview
This test plan covers the newly implemented Autonomous Agent System, including:
- Action Framework (Phase 1)
- Approval Workflow UI (Phase 2)
- Event Trigger System (Phase 3)
- Trigger Configuration UI (Phase 4)
- Scheduled Execution (Phase 5)

---

## Test Environment Prerequisites

### Database Setup
- [ ] Apply migration `20260204110000_autonomous_agent_system.sql`
- [ ] Apply migration `20260204120000_scheduled_agent_execution.sql`
- [ ] Verify tables exist: `agent_actions`, `action_queue`, `agent_triggers`, `agent_events`

### Edge Functions
- [ ] Deploy `execute-actions` function
- [ ] Deploy `process-agent-event` function
- [ ] Deploy `process-scheduled-agents` function
- [ ] Verify functions in `config.toml`

### Test Data Requirements
- At least 1 tenant
- At least 1 user with agent/admin role
- At least 1 AI agent created
- At least 1 contact
- At least 1 deal
- At least 1 property

---

## Phase 1: Action Framework Tests

### 1.1 Action Registry Validation

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AF-001 | Validate `create_contact` with valid params | Returns valid: true | |
| AF-002 | Validate `create_contact` without first_name | Returns valid: false with error | |
| AF-003 | Validate `create_contact` with invalid email | Returns valid: false with error | |
| AF-004 | Validate `create_deal` without deal_type | Returns valid: false with error | |
| AF-005 | Validate `send_email` without recipient | Returns valid: false with error | |
| AF-006 | Validate `schedule_task` with due_in_days | Calculates due_date correctly | |
| AF-007 | Validate `assign_tags` with empty tags array | Returns valid: false with error | |

### 1.2 Action Execution Tests

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AE-001 | Execute `create_contact` action | Contact created in database | |
| AE-002 | Execute `update_contact` action | Contact updated in database | |
| AE-003 | Execute `create_deal` action | Deal created in database | |
| AE-004 | Execute `move_deal_stage` action | Deal stage updated | |
| AE-005 | Execute `add_note` to contact | Note appended to contact.notes | |
| AE-006 | Execute `add_note` to deal | Note appended to deal.notes | |
| AE-007 | Execute `schedule_task` for deal | Milestone created | |
| AE-008 | Execute `assign_tags` | Tags merged with existing | |
| AE-009 | Execute `notify_user` | Notification created | |
| AE-010 | Execute action with invalid params | Returns success: false with error | |

### 1.3 Agent Action Parsing Tests

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AP-001 | Agent response with JSON actions block | Actions parsed correctly | |
| AP-002 | Agent response with markdown JSON | Actions extracted from ```json block | |
| AP-003 | Agent response without actions | No actions queued | |
| AP-004 | Agent response with malformed JSON | Gracefully handles error, logs warning | |
| AP-005 | Agent with enable_actions=false | Actions not processed | |
| AP-006 | Agent with auto_execute_actions=true | Actions executed immediately | |
| AP-007 | Agent with auto_execute_actions=false | Actions queued for approval | |

---

## Phase 2: Approval Workflow UI Tests

### 2.1 Action Queue Page

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AQ-001 | Navigate to /action-queue | Page loads without errors | |
| AQ-002 | View pending actions tab | Shows actions with status=pending | |
| AQ-003 | View approved actions tab | Shows actions with status=approved | |
| AQ-004 | View completed actions tab | Shows actions with status=completed | |
| AQ-005 | View failed actions tab | Shows actions with status=failed/rejected | |
| AQ-006 | Filter by action type | Filters work correctly | |
| AQ-007 | Stats cards show correct counts | Counts match database | |

### 2.2 Approval Actions

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AA-001 | Approve single action | Status changes to approved | |
| AA-002 | Reject single action without reason | Status changes to rejected | |
| AA-003 | Reject single action with reason | Rejection reason saved | |
| AA-004 | Select multiple actions | Checkbox selection works | |
| AA-005 | Batch approve selected actions | All selected become approved | |
| AA-006 | Clear selection | Selection cleared | |
| AA-007 | Execute approved action | Action executed, status=completed | |
| AA-008 | Execute all approved actions | All approved executed | |

### 2.3 Action Display

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| AD-001 | Action card shows type icon | Correct icon displayed | |
| AD-002 | Action card shows agent name | Agent name from join displayed | |
| AD-003 | Action card shows params preview | JSON preview readable | |
| AD-004 | Action card shows reason | Action reason displayed | |
| AD-005 | Failed action shows error | Error message displayed | |
| AD-006 | Completed action shows result | Result JSON displayed | |

---

## Phase 3: Event Trigger System Tests

### 3.1 Event Logging

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| EL-001 | Create new contact | Event logged to agent_events | |
| EL-002 | Update contact | Event logged with old/new data | |
| EL-003 | Create new deal | Event logged | |
| EL-004 | Change deal stage | Event logged as deal_stage_changed | |
| EL-005 | Upload document | Event logged as document_uploaded | |
| EL-006 | Document indexed | Event logged as document_indexed | |
| EL-007 | Create property | Event logged | |
| EL-008 | Update property | Event logged | |

### 3.2 Trigger Matching

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TM-001 | Event matches trigger with no conditions | Trigger fires | |
| TM-002 | Event matches trigger with simple condition | Trigger fires | |
| TM-003 | Event doesn't match trigger condition | Trigger doesn't fire | |
| TM-004 | Event with $in condition matching | Trigger fires | |
| TM-005 | Event with $ne condition matching | Trigger fires | |
| TM-006 | Event with nested field condition | Trigger fires | |
| TM-007 | Multiple triggers for same event | All matching triggers fire | |
| TM-008 | Inactive trigger | Trigger doesn't fire | |

### 3.3 Process Agent Event Function

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| PE-001 | Call with event_id | Single event processed | |
| PE-002 | Call with process_all=true | All unprocessed events handled | |
| PE-003 | Call with dry_run=true | Matches found, no execution | |
| PE-004 | Event marked as processed | processed=true, processed_at set | |
| PE-005 | Matched triggers recorded | matched_triggers array populated | |
| PE-006 | Agent executed for match | execute-agent called | |

---

## Phase 4: Trigger Configuration UI Tests

### 4.1 Trigger Config Component

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| TC-001 | View triggers for agent | Existing triggers displayed | |
| TC-002 | No triggers message | Shows "No triggers configured" | |
| TC-003 | Add trigger button | Opens dialog | |
| TC-004 | Edit trigger button | Opens dialog with values | |
| TC-005 | Delete trigger | Trigger removed | |
| TC-006 | Toggle trigger active | is_active toggled | |

### 4.2 Trigger Creation

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| CR-001 | Select trigger type | Type options available | |
| CR-002 | Add condition | Condition row added | |
| CR-003 | Remove condition | Condition row removed | |
| CR-004 | Field autocomplete | Suggestions shown for trigger type | |
| CR-005 | Select operator | Operator dropdown works | |
| CR-006 | Set requires_approval | Toggle works | |
| CR-007 | Set priority | Number input works | |
| CR-008 | Save trigger | Trigger created in database | |

### 4.3 Scheduled Triggers

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| ST-001 | Select scheduled trigger type | Schedule options appear | |
| ST-002 | Select cron preset | Cron value set | |
| ST-003 | Select custom cron | Input field appears | |
| ST-004 | Enter custom cron expression | Value saved | |
| ST-005 | Save scheduled trigger | schedule_cron saved | |

### 4.4 Condition Builder

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| CB-001 | Click field suggestion | Field added to condition | |
| CB-002 | Multiple conditions | AND logic displayed | |
| CB-003 | Operator: equals | Simple value comparison | |
| CB-004 | Operator: is one of | Comma-separated values parsed | |
| CB-005 | Operator: exists | Boolean value parsed | |
| CB-006 | Operator: greater than | Number comparison | |

---

## Phase 5: Scheduled Execution Tests

### 5.1 Scheduled Agent Processing

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SA-001 | Call process-scheduled-agents | Function executes | |
| SA-002 | No scheduled triggers | Returns "No scheduled triggers" | |
| SA-003 | Trigger matches current time | Agent executed | |
| SA-004 | Trigger doesn't match time | Agent not executed | |
| SA-005 | Already ran this minute | Not re-executed | |
| SA-006 | last_run_at updated | Timestamp updated | |
| SA-007 | next_run_at calculated | Future timestamp set | |

### 5.2 Cron Expression Parsing

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| CP-001 | "* * * * *" (every minute) | Matches every minute | |
| CP-002 | "0 9 * * *" (9am daily) | Matches only at 9:00 | |
| CP-003 | "0 9 * * 1" (Monday 9am) | Matches Monday at 9:00 | |
| CP-004 | "*/15 * * * *" (every 15 min) | Matches 0, 15, 30, 45 | |
| CP-005 | "0 9-17 * * 1-5" (business hours) | Matches correctly | |
| CP-006 | Invalid cron | Returns false, logs warning | |

---

## Integration Tests

### End-to-End Scenarios

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| E2E-001 | New lead creates deal automatically | Contact → Event → Trigger → Agent → Deal created | |
| E2E-002 | Deal stage change sends notification | Stage change → Event → Trigger → Agent → Notification | |
| E2E-003 | Action requires approval flow | Action queued → User approves → Action executes | |
| E2E-004 | Scheduled agent runs tasks | Time matches → Agent runs → Actions created | |
| E2E-005 | Multiple triggers on one event | All matching triggers execute | |

---

## Performance Tests

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| PF-001 | Process 100 events | Completes in <30 seconds | |
| PF-002 | Action queue with 500 items | Page loads in <3 seconds | |
| PF-003 | 50 triggers matching one event | All processed without timeout | |

---

## Security Tests

| Test ID | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| SEC-001 | Access action_queue as different tenant | Only own tenant's actions visible | |
| SEC-002 | Approve action from different tenant | Rejected | |
| SEC-003 | Access triggers as non-owner | Only own/global triggers visible | |
| SEC-004 | RLS on agent_events | Only own tenant's events visible | |

---

## Test Execution Script

```bash
#!/bin/bash
# Run this to execute automated tests

# 1. Database tests
echo "Testing database migrations..."
npx supabase db reset --debug

# 2. TypeScript compilation
echo "Checking TypeScript..."
npm run typecheck

# 3. Lint check
echo "Running linter..."
npm run lint

# 4. Unit tests (if any)
echo "Running unit tests..."
npm run test

# 5. Manual test checklist
echo ""
echo "==================================="
echo "Manual Testing Checklist"
echo "==================================="
echo "1. [ ] Login as agent user"
echo "2. [ ] Navigate to /action-queue"
echo "3. [ ] Navigate to /agents and edit an agent"
echo "4. [ ] Add a trigger to the agent"
echo "5. [ ] Create a contact (should trigger event)"
echo "6. [ ] Check /action-queue for pending actions"
echo "7. [ ] Approve and execute an action"
```

---

## Bug Tracking Template

| Bug ID | Summary | Severity | Steps to Reproduce | Expected | Actual | Status |
|--------|---------|----------|-------------------|----------|--------|--------|
| BUG-001 | | | | | | |

---

## Sign-off

| Phase | Tested By | Date | Result |
|-------|-----------|------|--------|
| Phase 1: Action Framework | | | |
| Phase 2: Approval UI | | | |
| Phase 3: Event Triggers | | | |
| Phase 4: Trigger Config UI | | | |
| Phase 5: Scheduled Execution | | | |
| Integration Tests | | | |

---

## Notes

- All tests assume local development environment with Supabase running
- Edge functions should be deployed before testing
- Some tests require manual execution due to timing (scheduled triggers)
- Security tests require multiple test users in different tenants
