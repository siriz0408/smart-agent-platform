# TRX-008: Deal Activity Timeline Investigation

**Date**: 2026-02-07
**Status**: Investigation Complete
**Priority**: P2
**Estimated Complexity**: Medium (4-6 hours)

---

## Problem Statement

Currently, deal activities are scattered across multiple sections in the DealDetailSheet:
- **Notes**: Displayed as concatenated string in "Notes & Activity" section (line 426-456)
- **Milestone events**: Shown in separate MilestoneList component (line 466)
- **Document uploads**: Not visible in deal view at all (TRX-009)
- **Stage changes**: Not tracked in UI (only `deals.updated_at` in DB)

Users have no unified chronological view of all deal activity, making it hard to understand deal progression at a glance.

---

## Current State Analysis

### Existing Activity Tracking (DB Level)

The `get_stalled_deals` function (migration `20260206200200_stalled_deal_detection.sql`) already identifies three activity types:

1. **Deal updates**: `deals.updated_at`
2. **Milestone completions**: `deal_milestones.completed_at`
3. **Document uploads**: `documents.created_at` (where `documents.deal_id` matches)

However, these are only used for stalled detection, not for UI timeline display.

### Missing Activity Tracking

**Not currently tracked:**
- Stage changes (no audit log when `deals.stage` changes)
- Note additions (notes are concatenated string, no timestamps per note)
- Milestone creation events (only completion tracked)
- Milestone overdue events (logical, not stored)

### UI Components Identified

- **DealDetailSheet.tsx** (`/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/DealDetailSheet.tsx`): Main deal view container
- **MilestoneList.tsx**: Separate milestone section
- **AddNoteDialog.tsx**: Note creation dialog (appends to `deals.notes` string)

---

## Proposed Solution

### Option A: Lightweight Timeline (RECOMMENDED)

**Approach**: Build timeline from existing data without schema changes.

**Activity Types to Display:**
1. **Deal Created**: `deals.created_at`
2. **Milestone Completed**: `deal_milestones.completed_at` (with title)
3. **Document Uploaded**: `documents.created_at` (with filename, type)
4. **Deal Updated**: `deals.updated_at` (generic "Deal updated" event)

**Implementation:**
- Create `useDealTimeline` hook that:
  - Fetches deal record
  - Fetches all milestones for deal
  - Fetches all documents for deal
  - Merges into single array sorted by timestamp
- Create `DealActivityTimeline` component:
  - Visual timeline with icons (calendar, check, file, edit)
  - Chronological ordering (newest first)
  - Compact card design
  - Color-coded by activity type
- Replace "Notes & Activity" section with:
  - "Activity Timeline" (unified view)
  - Keep "Add Note" button (continues to append to `deals.notes`)

**Pros:**
- No schema changes required
- Works with existing data
- Quick to implement (4-6 hours)
- Immediately valuable to users

**Cons:**
- No granular note timestamps (notes still concatenated)
- No stage change history
- Generic "Deal updated" events (can't tell what changed)

### Option B: Full Activity Log (Future Enhancement)

**Approach**: Create dedicated `deal_activities` table with proper event logging.

**Schema:**
```sql
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'stage_changed', 'note_added', 'milestone_created',
    'milestone_completed', 'document_uploaded', 'field_updated'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- { old_stage, new_stage, field_name, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(user_id)
);
```

**Pros:**
- Rich activity history with full context
- Queryable activity log
- Support for future features (audit trail, undo, AI insights)

**Cons:**
- Requires migration
- Requires updating all deal mutation hooks
- More complex (8-12 hours)
- Needs backfill strategy for existing deals

---

## Recommendation

**Implement Option A (Lightweight Timeline) now** as TRX-008 with acceptance criteria:
- ✅ New `DealActivityTimeline` component integrated into DealDetailSheet
- ✅ Shows deal creation, milestone completions, document uploads
- ✅ Chronological ordering (newest first)
- ✅ Visual timeline with icons and color coding
- ✅ Responsive mobile layout

**Defer Option B to future backlog** (TRX-011: Enhanced Activity Logging - P3):
- Full `deal_activities` table
- Stage change tracking
- Individual note timestamps
- Comprehensive audit trail

---

## Implementation Plan (Option A)

### Step 1: Create `useDealTimeline` Hook
**File**: `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/hooks/useDealTimeline.ts`

**Logic:**
```typescript
export interface TimelineEvent {
  id: string;
  type: 'created' | 'milestone_completed' | 'document_uploaded' | 'updated';
  title: string;
  description?: string;
  timestamp: string;
  icon: LucideIcon;
  color: string;
}

export function useDealTimeline(dealId: string) {
  return useQuery({
    queryKey: ['deal-timeline', dealId],
    queryFn: async () => {
      // 1. Fetch deal
      // 2. Fetch milestones (all, not just incomplete)
      // 3. Fetch documents
      // 4. Merge into TimelineEvent[]
      // 5. Sort by timestamp DESC
    }
  });
}
```

### Step 2: Create `DealActivityTimeline` Component
**File**: `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/DealActivityTimeline.tsx`

**UI Structure:**
```
[Header with icon count badge]
  Activity Timeline (12)

[Timeline Container]
  [Event 1] - Document uploaded (2 hours ago)
    └ Settlement Statement uploaded
  [Event 2] - Milestone completed (1 day ago)
    └ Home Inspection completed
  [Event 3] - Milestone completed (2 days ago)
    └ Earnest Money Deposit completed
  ...
```

**Design:**
- Use shadcn `Card` for container
- Use `format` from `date-fns` for relative times
- Use `Clock`, `CheckCircle`, `FileText`, `Edit` icons from lucide-react
- Color scheme:
  - Created: `text-blue-500`
  - Milestone: `text-green-500`
  - Document: `text-purple-500`
  - Updated: `text-gray-500`

### Step 3: Integrate into DealDetailSheet
**File**: `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/DealDetailSheet.tsx`

**Changes:**
- Line 426-456: Replace "Notes & Activity" section with `<DealActivityTimeline dealId={deal.id} />`
- Keep `AddNoteDialog` integration (button can move to timeline header)
- Add `ScrollArea` for long timelines (max height 400px)

### Step 4: Update Milestone Query
**File**: `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/MilestoneList.tsx`

**Changes:**
- Currently only fetches incomplete milestones
- Timeline needs ALL milestones (including completed)
- Add separate query in `useDealTimeline` or add `includeCompleted` param to existing query

---

## Acceptance Criteria

- [ ] `useDealTimeline` hook created with proper types
- [ ] `DealActivityTimeline` component displays all event types
- [ ] Timeline shows in DealDetailSheet below "Deal Details" section
- [ ] Timeline sorted chronologically (newest first)
- [ ] Events have appropriate icons and colors
- [ ] Relative timestamps (e.g., "2 hours ago")
- [ ] Loading state while fetching
- [ ] Empty state if no activities
- [ ] Mobile responsive (single column on small screens)
- [ ] TypeScript strict mode compliant
- [ ] ESLint clean

---

## Testing Strategy

### Manual Testing
1. Open deal with milestones completed → See milestone events
2. Open deal with documents → See document upload events
3. Open newly created deal → See only "Deal created" event
4. Open deal with mix of activities → Verify chronological order
5. Test on mobile → Verify responsive layout

### E2E Test (Optional)
Add to `/Users/sam.irizarry/Downloads/ReAgentOS_V1/tests/e2e/pipeline.spec.ts`:
```typescript
test('deal detail sheet shows activity timeline', async ({ page }) => {
  // Create deal, add milestone, complete it
  // Open deal detail sheet
  // Verify timeline shows "Deal created" and "Milestone completed"
});
```

---

## Dependencies

**None** - Uses existing DB schema and components

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Performance with many activities | Limit timeline to last 50 events, add "Load more" |
| Notes not timestamped | Document in UI that notes are legacy format |
| No stage change history | Add disclaimer in UI, plan TRX-011 for future |

---

## Next Steps (Post TRX-008)

1. **TRX-009**: Add document association view (easy, already identified in timeline)
2. **TRX-010**: Align pipeline stages with PRD (medium, requires migration)
3. **TRX-011**: Enhanced activity logging with `deal_activities` table (large, Phase 2 feature)

---

## Files to Modify

### New Files
- `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/hooks/useDealTimeline.ts`
- `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/DealActivityTimeline.tsx`

### Modified Files
- `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/DealDetailSheet.tsx` (replace notes section)

### Potentially Modified Files
- `/Users/sam.irizarry/Downloads/ReAgentOS_V1/src/components/deals/MilestoneList.tsx` (if query needs adjustment)

---

## Estimated Effort

**Total**: 4-6 hours

| Task | Time |
|------|------|
| Create `useDealTimeline` hook | 1.5 hours |
| Create `DealActivityTimeline` component | 2 hours |
| Integrate into DealDetailSheet | 1 hour |
| Testing & refinement | 1.5 hours |

---

## Approval Status

**Ready for Implementation**: Yes (Option A approved by PM-Transactions)
**Blocked**: No
**Questions**: None
