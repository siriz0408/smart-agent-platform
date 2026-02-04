# Autonomous Agent System - Executable Test Script

## Pre-Test Setup

```bash
# Ensure dev server is running
npm run dev

# Ensure Supabase is running locally (if using local)
npx supabase start

# Apply migrations
npx supabase db push
```

---

## Test Script 001: Database Schema Verification

### Objective
Verify all required tables and functions exist after migration.

### Steps

1. **Check Tables Exist**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('agent_actions', 'action_queue', 'agent_triggers', 'agent_events');
   ```
   **Expected:** 4 rows returned

2. **Check Trigger Functions**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('log_agent_event', 'approve_action', 'reject_action', 'batch_approve_actions', 'get_pending_actions_count');
   ```
   **Expected:** 5 rows returned

3. **Check Database Triggers**
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name LIKE 'log_%';
   ```
   **Expected:** Should see triggers on contacts, deals, documents, properties

### Pass/Fail Criteria
- [ ] All 4 tables exist
- [ ] All 5 functions exist
- [ ] Database triggers are active

---

## Test Script 002: Event Logging Verification

### Objective
Verify that creating/updating records logs events to agent_events table.

### Steps

1. **Clear existing events (optional)**
   ```sql
   DELETE FROM agent_events WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

2. **Create a contact via UI**
   - Navigate to /contacts
   - Click "Add Contact"
   - Fill in: First Name: "Test", Last Name: "Event", Email: "test@event.com"
   - Click Save

3. **Verify event logged**
   ```sql
   SELECT * FROM agent_events 
   WHERE event_type = 'contact_created' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected:** One row with event_data containing contact info

4. **Update the contact**
   - Change contact's status or notes
   - Save

5. **Verify update event**
   ```sql
   SELECT * FROM agent_events 
   WHERE event_type = 'contact_updated' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   **Expected:** One row with event_data containing old and new values

### Pass/Fail Criteria
- [ ] contact_created event logged
- [ ] contact_updated event logged
- [ ] Event data contains correct information

---

## Test Script 003: Action Queue UI

### Objective
Verify the Action Queue page loads and displays correctly.

### Steps

1. **Navigate to Action Queue**
   - Login as agent/admin user
   - Click "Actions" in sidebar (or navigate to /action-queue)

2. **Verify page loads**
   - [ ] Page title shows "Action Queue"
   - [ ] Stats cards display (Pending, Ready to Execute, Completed, Failed)
   - [ ] Tabs display (Pending, Approved, Completed, Failed)

3. **Check empty state**
   - If no actions exist, should show "No actions found" message

4. **Create a test action manually**
   ```sql
   INSERT INTO action_queue (
     tenant_id, user_id, action_type, action_params, 
     requires_approval, status
   ) VALUES (
     (SELECT tenant_id FROM profiles LIMIT 1),
     (SELECT user_id FROM profiles LIMIT 1),
     'create_contact',
     '{"first_name": "Test", "last_name": "Action", "email": "test@action.com"}'::jsonb,
     true,
     'pending'
   );
   ```

5. **Refresh Action Queue page**
   - [ ] Pending count incremented
   - [ ] Action card visible in Pending tab

### Pass/Fail Criteria
- [ ] Page loads without errors
- [ ] Stats display correctly
- [ ] Action cards render properly

---

## Test Script 004: Approve/Reject Actions

### Objective
Test the approval workflow for queued actions.

### Pre-requisite
- At least one action in 'pending' status (from Test Script 003)

### Steps

1. **View pending action**
   - Navigate to /action-queue
   - Click Pending tab
   - Verify action card shows parameters

2. **Approve action**
   - Click "Approve" button
   - [ ] Toast notification appears
   - [ ] Action moves to "Approved" tab
   - [ ] Pending count decreases

3. **Create another test action**
   ```sql
   INSERT INTO action_queue (
     tenant_id, user_id, action_type, action_params, 
     action_reason, requires_approval, status
   ) VALUES (
     (SELECT tenant_id FROM profiles LIMIT 1),
     (SELECT user_id FROM profiles LIMIT 1),
     'notify_user',
     '{"title": "Test Notification", "message": "This is a test"}'::jsonb,
     'Testing rejection flow',
     true,
     'pending'
   );
   ```

4. **Reject action**
   - Refresh page
   - Click "Reject" on the new action
   - Enter rejection reason: "Testing"
   - Click "Reject Action"
   - [ ] Action moves to "Failed" tab
   - [ ] Rejection reason displayed

### Pass/Fail Criteria
- [ ] Approve changes status to 'approved'
- [ ] Reject changes status to 'rejected'
- [ ] Rejection reason saved

---

## Test Script 005: Execute Actions

### Objective
Test that approved actions execute correctly.

### Pre-requisite
- At least one action in 'approved' status

### Steps

1. **Execute single action**
   - Go to Approved tab
   - Click "Execute Now" on an action
   - [ ] Action status changes to 'executing' briefly
   - [ ] Action moves to Completed tab (if successful)
   - [ ] Result JSON displayed

2. **Verify action result**
   - If action was `create_contact`:
     ```sql
     SELECT * FROM contacts WHERE email = 'test@action.com';
     ```
     **Expected:** Contact exists

3. **Execute all approved**
   - Create multiple approved actions
   - Click "Execute All Approved" button
   - [ ] All approved actions execute

### Pass/Fail Criteria
- [ ] Actions execute successfully
- [ ] Database changes applied
- [ ] Status updates to 'completed'

---

## Test Script 006: Trigger Configuration

### Objective
Test creating and editing triggers for agents.

### Steps

1. **Navigate to Agent Edit**
   - Go to /agents
   - Click on an agent you own
   - Click "Edit" (or navigate to /agents/:id/edit)

2. **Verify Trigger Config section**
   - [ ] "Triggers" card visible
   - [ ] Shows "No triggers configured" if empty
   - [ ] "Add Trigger" button visible

3. **Create a trigger**
   - Click "Add Trigger"
   - Select Type: "Contact Created"
   - Click on "contact_type" in field suggestions
   - Set operator: "equals"
   - Set value: "lead"
   - Set Name: "New Lead Handler"
   - Toggle "Require Approval" ON
   - Click "Create Trigger"
   - [ ] Trigger appears in list

4. **Edit trigger**
   - Click "Edit" on the trigger
   - Change priority to 8
   - Click "Update Trigger"
   - [ ] Changes saved

5. **Toggle trigger active**
   - Click pause icon
   - [ ] Trigger becomes inactive (dimmed)
   - Click play icon
   - [ ] Trigger becomes active again

### Pass/Fail Criteria
- [ ] Can create trigger with conditions
- [ ] Can edit trigger
- [ ] Can toggle active state
- [ ] Can delete trigger

---

## Test Script 007: End-to-End Event Processing

### Objective
Test complete flow: Event → Trigger → Agent → Action

### Pre-requisite
- Trigger created (from Test Script 006) on contact_created for contact_type=lead
- Agent has a system prompt that requests actions

### Steps

1. **Update agent to enable actions**
   - Edit the agent's system prompt to include action instructions
   - Or use the UI to enable "autonomous mode" if available

2. **Create a new lead contact**
   - Go to /contacts
   - Add Contact: First Name: "Lead", Last Name: "Test", Type: "Lead"
   - Save

3. **Check agent_events**
   ```sql
   SELECT * FROM agent_events 
   WHERE event_type = 'contact_created' 
   AND processed = false 
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Manually process event**
   ```bash
   curl -X POST "YOUR_SUPABASE_URL/functions/v1/process-agent-event" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"process_all": true}'
   ```

5. **Check results**
   - Event should be marked processed
   - If agent produced actions with requires_approval=true:
     - [ ] Actions appear in Action Queue
   - If auto_execute was enabled:
     - [ ] Actions executed and completed

### Pass/Fail Criteria
- [ ] Event triggers correct agent
- [ ] Agent executes with context
- [ ] Actions queued or executed

---

## Test Script 008: Batch Operations

### Objective
Test batch approve and select all functionality.

### Steps

1. **Create multiple pending actions**
   ```sql
   INSERT INTO action_queue (tenant_id, user_id, action_type, action_params, requires_approval, status)
   SELECT 
     (SELECT tenant_id FROM profiles LIMIT 1),
     (SELECT user_id FROM profiles LIMIT 1),
     'notify_user',
     jsonb_build_object('title', 'Batch Test ' || n, 'message', 'Test message ' || n),
     true,
     'pending'
   FROM generate_series(1, 5) n;
   ```

2. **Test select all**
   - Go to Pending tab
   - Click "Select All" checkbox
   - [ ] All actions selected

3. **Test batch approve**
   - Click "Approve Selected (5)"
   - [ ] All 5 actions approved
   - [ ] All move to Approved tab

### Pass/Fail Criteria
- [ ] Select all works
- [ ] Batch approve processes all selected

---

## Test Script 009: Scheduled Triggers

### Objective
Test scheduled trigger configuration and execution.

### Steps

1. **Create scheduled trigger**
   - Edit an agent
   - Add Trigger → Type: "Scheduled"
   - Select preset: "Every day at 9am"
   - Save

2. **Verify trigger saved**
   ```sql
   SELECT id, schedule_cron, is_active FROM agent_triggers 
   WHERE trigger_type = 'scheduled';
   ```
   **Expected:** schedule_cron = "0 9 * * *"

3. **Test process-scheduled-agents function**
   ```bash
   curl -X POST "YOUR_SUPABASE_URL/functions/v1/process-scheduled-agents" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   **Expected:** Response indicates how many triggers checked

### Pass/Fail Criteria
- [ ] Scheduled trigger saved correctly
- [ ] Process function returns valid response

---

## Bug Report Template

When bugs are found, document them here:

### Bug #___

**Summary:** 

**Severity:** Critical / High / Medium / Low

**Test Script:** 

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Screenshots/Logs:**

**Status:** Open / In Progress / Fixed / Won't Fix

---

## Test Results Summary

| Test Script | Date | Tester | Pass | Fail | Blocked | Notes |
|-------------|------|--------|------|------|---------|-------|
| 001 - Schema | | | | | | |
| 002 - Events | | | | | | |
| 003 - Queue UI | | | | | | |
| 004 - Approve/Reject | | | | | | |
| 005 - Execute | | | | | | |
| 006 - Triggers | | | | | | |
| 007 - E2E | | | | | | |
| 008 - Batch | | | | | | |
| 009 - Scheduled | | | | | | |

**Overall Result:** ___/9 Passed

**Blockers:** 

**Recommendations:**
