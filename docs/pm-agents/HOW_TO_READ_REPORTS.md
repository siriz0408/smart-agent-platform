# How to Read PM Reports

> **Purpose:** Guide for interpreting enhanced PM development cycle reports
> **Last Updated:** 2026-02-07

---

## Report Structure

PM reports now clearly distinguish between:
- **🟢 Ready to Test** - Features/components ready for human UI testing
- **🟡 In Progress** - Work that's not ready for testing yet
- **🔴 Blocked** - Work that cannot proceed

---

## Understanding Status Indicators

### ✅ Complete
- Fully functional
- Tested
- Ready for production
- **Action:** No action needed

### 🟢 Ready to Test
- Code complete
- Tests passing
- Can be tested in UI
- No known blockers
- **Action:** Test in UI, provide feedback

### 🟡 In Progress
- Work started but not complete
- Not ready for UI testing yet
- May have partial functionality
- **Action:** Wait for completion, don't test yet

### 🔴 Blocked
- Cannot proceed
- Waiting on dependency
- Needs decision or unblocking
- **Action:** Review blocker, provide decision/unblock

---

## Reading Work Reports

### Pre-Work Validation
- **Vision Alignment Score:** How well task aligns with VISION.md (1-10, must be ≥7)
- **API Cost Estimate:** Estimated Claude API costs (awareness, not blocking)
- **Big Picture Context:** How work fits larger goals
- **Cross-PM Impacts:** Any impacts on other PMs

### Development Method
- **`/feature-dev`:** Big features (3+ files, architectural)
- **`smart-agent-brainstorming`:** Small updates (single component)
- **Direct implementation:** Bug fixes

### Feature Completion
- **0-25%:** Just started
- **26-50%:** In progress
- **51-75%:** Mostly done
- **76-99%:** Nearly complete
- **100%:** Complete

### Status
- **Complete:** Fully done
- **Ready to Test:** Can test in UI
- **In Progress:** Still working
- **Blocked:** Cannot proceed

### What's Ready to Test
- UI component renders
- Can interact with feature
- Backend API works
- None - still in progress

### What Still Needs Work
- List of remaining tasks

### Progress Toward Goal
- Larger feature/goal this task contributes to
- How this work fits into bigger picture

---

## Reading Orchestrator Reports

### Executive Summary
- Strategic overview (not just operational)
- Trends and patterns identified
- Risks and opportunities

### Ready to Test 🟢
- Features/components ready for human UI testing
- Test instructions included
- Completion: 100%

### In Progress 🟡
- Work that's not ready for testing yet
- Completion percentage
- What's done vs what's left
- ETA provided

### Blocked 🔴
- Work that cannot proceed
- Blocker identified
- Needs listed

### Progress Toward Goals
- Larger initiatives tracked
- Completed sub-tasks
- In-progress sub-tasks
- Next steps

---

## Example: Reading a Report

```
### PM-Intelligence 🟡
**Task:** INT-014 - Fix AI chat buttons
**Feature Completion:** 20%
**Status:** In Progress
**What's Ready to Test:** None - still in progress
**What Still Needs Work:** Full audit, fixes
**Progress Toward Goal:** MCP-style connector experience (40% complete)
```

**Interpretation:**
- Work started but not complete (20%)
- Don't test yet (nothing ready)
- Part of larger goal (MCP connector)
- Still needs work (audit + fixes)

---

## What to Do Based on Status

### If Status is 🟢 Ready to Test
1. Read test instructions
2. Test in UI
3. Provide feedback
4. Report any bugs

### If Status is 🟡 In Progress
1. Don't test yet
2. Check ETA
3. Review progress toward goal
4. Wait for completion

### If Status is 🔴 Blocked
1. Review blocker
2. Provide decision (if needed)
3. Unblock (if possible)
4. Coordinate with other PMs (if needed)

---

## Key Questions to Ask

1. **Is this ready for me to test?** → Check "Ready to Test" section
2. **What's the bigger picture?** → Check "Progress Toward Goal"
3. **Why isn't this done?** → Check "What Still Needs Work" or "Blocked"
4. **How does this fit the vision?** → Check Vision Alignment Score
5. **What should I prioritize?** → Check "Ready to Test" first, then "Blocked"

---

*This guide helps you interpret PM reports effectively. Updated based on enhanced reporting format.*
