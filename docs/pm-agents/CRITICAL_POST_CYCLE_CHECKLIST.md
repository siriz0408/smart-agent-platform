# 🚨 CRITICAL: Post-Cycle Checklist (MANDATORY)

> **⚠️ THESE STEPS MUST HAPPEN AFTER EVERY PM DEVELOPMENT CYCLE**
> **Last Updated:** 2026-02-07
> **Owner:** PM-Orchestrator

---

## ✅ MANDATORY Post-Cycle Steps

After every PM development cycle, PM-Orchestrator **MUST** complete ALL of these steps. This is **NOT OPTIONAL**.

### 1. Update STATE.md ✅ REQUIRED

**File:** `docs/pm-agents/STATE.md`

**What to update:**
- [ ] Change "Last Run" to current cycle number
- [ ] Update "Overall Health" status
- [ ] Update "Development Velocity" commit count
- [ ] Update "Phase 2 Features" completion percentage
- [ ] Update "Critical Issues" count
- [ ] Update "QA Gate Status"
- [ ] Update "PM Performance Metrics" table
- [ ] Add cycle summary to "Cycle History" section
- [ ] Update "Pending Migrations" (clear if deployed)
- [ ] Update "Recently Deployed Migrations"

**Verification:** Ensure "Last Run" shows current cycle number

---

### 2. Update WORK_STATUS.md ✅ REQUIRED

**File:** `docs/pm-agents/WORK_STATUS.md`

**What to update:**
- [ ] Update "Ready to Test 🟢" section with new features
- [ ] Update "In Progress 🟡" section with current work
- [ ] Update "Blocked 🔴" section
- [ ] Update "Progress Toward Goals" with new percentages
- [ ] Update completion percentages for ongoing initiatives

**Verification:** Count matches cycle report (e.g., "8 Ready to Test")

---

### 3. Update PERFORMANCE.md ✅ REQUIRED

**File:** `docs/pm-agents/PERFORMANCE.md`

**What to update:**
- [ ] Update "PM Performance (Last 7 Days)" table with cycle data
- [ ] Update "Trends & Insights" section
- [ ] Update "Cost Insights" with actual vs estimated
- [ ] Add cycle-specific performance notes
- [ ] Update "Performance Goals" for next cycle

**Verification:** Completion rates, quality scores, API costs all updated

---

### 4. Update CROSS_PM_AWARENESS.md ✅ REQUIRED

**File:** `docs/pm-agents/CROSS_PM_AWARENESS.md`

**What to update:**
- [ ] Refresh "Active Work Across All PMs" table
- [ ] Update "Cross-PM Initiatives" with new progress percentages
- [ ] Document successful handoffs
- [ ] Update "Shared Context" with new architecture changes
- [ ] Update "Common Patterns" if new patterns emerged

**Verification:** All PMs show current tasks, not old ones

---

### 5. Update smart-agent-roadmap.html ✅ REQUIRED (CRITICAL!)

**File:** `smart-agent-roadmap.html`

**⚠️ THIS IS THE MOST IMPORTANT FILE - NEVER SKIP THIS**

#### Step 5a: Read Feedback (Before Cycle)

1. **Read file:** `read_file('smart-agent-roadmap.html')`
2. **Search for:** `id="submitted-feedback-section"`
3. **Check display:** If `style="display: block"` → feedback exists
4. **Extract content:**
   - Get `id="submitted-feedback-markdown"` innerHTML
   - Get `id="submitted-feedback-images"` innerHTML (if present)
5. **Write to FEEDBACK.md**
6. **Process feedback** (route to appropriate PMs)
7. **Clear feedback after processing:**
   - Set `#submitted-feedback-section` to `style="display: none"`
   - Clear `#submitted-feedback-markdown` innerHTML
   - Clear `#submitted-feedback-images` innerHTML

#### Step 5b: Add Cycle Recap (After Cycle)

**Location:** Insert at top of `id="tab-cycles"` section (before previous cycles)

**HTML Template:**
```html
<!-- Cycle [N] - [Date] -->
<div class="card" style="border-left: 4px solid var(--accent);">
  <div class="card-header">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="margin: 0; font-size: 20px;">Cycle [N] - YYYY-MM-DD</h2>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
          Development Cycle #[N] • 12 PMs Active • QA Gate: ✅ [STATUS]
        </p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <span class="stat-chip" style="background: var(--green-bg); border-color: var(--green);">
          <span class="dot green"></span>
          <span>[X] Ready to Test</span>
        </span>
        <span class="stat-chip" style="background: var(--yellow-bg); border-color: var(--yellow);">
          <span class="dot yellow"></span>
          <span>[X] In Progress</span>
        </span>
        <span class="stat-chip" style="background: var(--red-bg); border-color: var(--red);">
          <span class="dot red"></span>
          <span>[X] Blocked</span>
        </span>
      </div>
    </div>
  </div>

  <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">

    <!-- Executive Summary -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text);">Executive Summary</h3>
      <p style="color: var(--text-muted); line-height: 1.6;">
        [2-3 sentences summarizing the cycle focus and key outcomes]
      </p>
    </div>

    <!-- Progress Toward Goals -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text);">Progress Toward Goals</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">

        [For each ongoing initiative, add a progress card with:]
        - Goal name
        - Completion percentage (show delta from last cycle)
        - Progress bar
        - Status updates (✅ complete, 🟡 in progress, 🔴 blocked)

      </div>
    </div>

    <!-- Ready to Test -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--green);">
        🟢 Ready to Test ([X] Features)
      </h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">

        [For each ready-to-test feature, add:]
        - Feature ID and name
        - PM owner
        - Test instructions

      </div>
    </div>

    <!-- In Progress -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--yellow);">
        🟡 In Progress ([X] Features)
      </h3>
      <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
        [List features with completion % and what's left]
      </p>
    </div>

    <!-- Bugs & Issues -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--red);">
        🐛 Bugs & Issues
      </h3>
      <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
        [List any bugs found or "None identified"]
      </p>
    </div>

    <!-- Key Metrics -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text);">📊 Key Metrics</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">

        [Metric cards for:]
        - Completion Rate (%)
        - Quality Score (%)
        - Vision Alignment (X/10)
        - API Costs ($)
        - E2E Tests (count + delta)

      </div>
    </div>

    <!-- Considerations -->
    <div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text);">💡 Considerations for Next Cycle</h3>
      <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6;">
        [3-5 bullet points about learnings, process improvements, or things to watch]
      </p>
    </div>

  </div>
</div>
```

**Data Source:** Read from `cycle-[N]-completion-report.md` and `WORK_STATUS.md`

**Insert Location:** At line ~1386, immediately after `<div style="display: flex; flex-direction: column; gap: 24px;">` and before the previous cycle's HTML

#### Step 5c: Update Task Statuses (If Needed)

- Read completed tasks from STATE.md
- Update task cards in "Now / Next / Later" tab
- Move completed items to appropriate sections

#### Step 5d: Update Phase Progress Bars (If Changed)

- Calculate phase completion from STATE.md
- Update progress bar widths
- Update percentage displays

**Verification:** Open `smart-agent-roadmap.html` in browser, check:
- [ ] Cycle Recaps tab shows new cycle at top
- [ ] Feedback section is cleared (or shows new feedback)
- [ ] Task statuses updated (if any tasks completed)

---

### 6. Commit All Changes ✅ REQUIRED

**After updating all 5 files:**

```bash
git add docs/pm-agents/STATE.md \
        docs/pm-agents/WORK_STATUS.md \
        docs/pm-agents/PERFORMANCE.md \
        docs/pm-agents/CROSS_PM_AWARENESS.md \
        smart-agent-roadmap.html

git commit -m "docs: Complete Cycle [N] post-cycle consolidation

- Updated STATE.md: Cycle [N] complete, [X] migrations deployed
- Updated WORK_STATUS.md: [X] ready to test, [X] in progress, [X] blocked
- Updated PERFORMANCE.md: [X]% completion, [X]% quality, [X]/10 vision
- Updated CROSS_PM_AWARENESS.md: [Goals updated], active work refreshed
- Updated smart-agent-roadmap.html: Added Cycle [N] recap to Cycle Recaps tab

System files synchronized for Cycle [N+1] planning.

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"

git push origin main
```

---

## 🚨 Why This Cannot Be Skipped

**If you skip these updates:**

1. ❌ **STATE.md outdated** → Next cycle uses wrong baseline
2. ❌ **WORK_STATUS.md stale** → Humans don't know what to test
3. ❌ **PERFORMANCE.md missing data** → Can't track PM effectiveness
4. ❌ **CROSS_PM_AWARENESS.md outdated** → PMs work in silos, duplicate effort
5. ❌ **Roadmap HTML not updated** → Humans can't see progress, can't submit feedback properly

**Bottom line:** Skipping these updates **breaks the entire PM system.**

---

## Quick Verification Commands

After post-cycle updates, run these to verify:

```bash
# 1. Check STATE.md shows current cycle
grep "Last Run" docs/pm-agents/STATE.md

# 2. Check WORK_STATUS.md has ready-to-test count
grep "Ready to Test" docs/pm-agents/WORK_STATUS.md

# 3. Check PERFORMANCE.md has latest metrics
grep "PM Performance (Last 7 Days)" docs/pm-agents/PERFORMANCE.md -A 15

# 4. Check roadmap HTML has new cycle
grep "Cycle 10" smart-agent-roadmap.html

# 5. Verify all 5 files modified
git status docs/pm-agents/STATE.md \
           docs/pm-agents/WORK_STATUS.md \
           docs/pm-agents/PERFORMANCE.md \
           docs/pm-agents/CROSS_PM_AWARENESS.md \
           smart-agent-roadmap.html
```

---

## 📋 PM-Orchestrator Post-Cycle Workflow

**After all 12 PMs complete their work:**

```
Step 1: Verify backlog/memory sync (100% required)
    ↓
Step 2: Run PM-QA gate check
    ↓
Step 3: Update STATE.md ⚠️ CRITICAL
    ↓
Step 4: Update WORK_STATUS.md ⚠️ CRITICAL
    ↓
Step 5: Update PERFORMANCE.md ⚠️ CRITICAL
    ↓
Step 6: Update CROSS_PM_AWARENESS.md ⚠️ CRITICAL
    ↓
Step 7: Update smart-agent-roadmap.html ⚠️ CRITICAL (MOST IMPORTANT!)
    ↓
Step 8: Commit all 5 files + push to remote
    ↓
Step 9: Generate completion report
    ↓
✅ CYCLE COMPLETE
```

**If any step 3-7 is skipped, the cycle is INCOMPLETE.**

---

## 🔍 What Went Wrong in Cycle 10

**What happened:**
- ✅ PM work completed (12 reports, BACKLOG/MEMORY updates)
- ❌ Post-cycle consolidation skipped (Steps 3-7)
- ❌ Roadmap HTML not updated
- ✅ Manual fix applied

**Why:**
- Agent completed Phase 1-2 but didn't execute Phase 3
- PM-Orchestrator role requirements not followed completely

**Prevention:**
- This checklist serves as a forcing function
- Review this checklist BEFORE marking cycle "complete"
- Verify all 5 files updated BEFORE committing

---

## 📊 File Update Matrix

After EVERY cycle, these files MUST change:

| File | What Changes | Verification |
|------|-------------|--------------|
| `STATE.md` | Last Run, metrics, cycle history | Grep "Last Run" shows current cycle |
| `WORK_STATUS.md` | Ready/In Progress/Blocked counts | Counts match completion report |
| `PERFORMANCE.md` | PM metrics, trends | All 12 PMs have updated stats |
| `CROSS_PM_AWARENESS.md` | Active work, initiatives | Shows current state, not old |
| `smart-agent-roadmap.html` | Cycle recap, feedback cleared | Cycle Recaps tab shows new entry |

**All 5 files should be modified in EVERY post-cycle commit.**

---

## ⚡ Quick Reference

**The 5 Files That MUST Update Every Cycle:**
1. `docs/pm-agents/STATE.md`
2. `docs/pm-agents/WORK_STATUS.md`
3. `docs/pm-agents/PERFORMANCE.md`
4. `docs/pm-agents/CROSS_PM_AWARENESS.md`
5. `smart-agent-roadmap.html` ⚠️ **MOST CRITICAL**

**Roadmap HTML is THE interface for human feedback and cycle visibility.**
**If roadmap HTML isn't updated, the human can't:**
- See what was accomplished
- Know what to test
- Submit informed feedback
- Track progress toward goals

---

## 🎯 Success Criteria

A PM development cycle is only **TRULY COMPLETE** when:

1. ✅ All 12 PMs delivered work
2. ✅ All 12 PMs updated BACKLOG.md
3. ✅ All 12 PMs updated MEMORY.md
4. ✅ PM-QA gate check completed
5. ✅ **STATE.md updated with cycle summary** ⚠️
6. ✅ **WORK_STATUS.md updated with ready/in-progress/blocked** ⚠️
7. ✅ **PERFORMANCE.md updated with cycle metrics** ⚠️
8. ✅ **CROSS_PM_AWARENESS.md updated with current state** ⚠️
9. ✅ **smart-agent-roadmap.html updated with cycle recap** ⚠️ **CRITICAL**
10. ✅ All changes committed to git
11. ✅ Pushed to remote (`git push origin main`)

**Items 5-9 are the post-cycle consolidation steps that were missed in the initial Cycle 10 run.**

---

## 🔄 Template for PM-Orchestrator

When completing a cycle, use this checklist:

```markdown
## Post-Cycle Consolidation Checklist

- [ ] 1. Verified all 12 PMs updated BACKLOG.md
- [ ] 2. Verified all 12 PMs updated MEMORY.md
- [ ] 3. PM-QA gate check completed
- [ ] 4. Updated STATE.md (Last Run, metrics, cycle history)
- [ ] 5. Updated WORK_STATUS.md (ready/in-progress/blocked)
- [ ] 6. Updated PERFORMANCE.md (PM metrics, trends)
- [ ] 7. Updated CROSS_PM_AWARENESS.md (active work, initiatives)
- [ ] 8. Updated smart-agent-roadmap.html (cycle recap added to Cycle Recaps tab)
- [ ] 9. Committed all 5 system files
- [ ] 10. Pushed to remote (git push origin main)
- [ ] 11. Generated completion report

✅ CYCLE FULLY COMPLETE
```

---

**This checklist is MANDATORY. Do not mark a cycle complete without completing all items.**

---

*Created after Cycle 10 to ensure roadmap HTML updates never get skipped again.*
