# Browser QA Test Suite - Index

**Quick Navigation Guide for All Test Artifacts**

---

## 🚀 START HERE

**Want to run tests right now?**
→ Open [`QUICK_START.md`](./QUICK_START.md)

**Want to understand what's being tested?**
→ Open [`TEST_PLAN.md`](./TEST_PLAN.md)

**Want comprehensive documentation?**
→ Open [`README.md`](./README.md)

**Want to test manually?**
→ Open [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md)

---

## 📁 All Files

### 🎯 Execution Files

| File | Size | Purpose |
|------|------|---------|
| [`run-priority-tests.sh`](./run-priority-tests.sh) | 14 KB | **Automated test script** - Run this to execute all 9 tests |
| [`state.json`](./state.json) | 3.2 KB | **Test results tracker** - Updated during test execution |

### 📖 Documentation Files

| File | Size | Purpose | Best For |
|------|------|---------|----------|
| [`QUICK_START.md`](./QUICK_START.md) | 4.3 KB | **3-step execution guide** | Quick test execution |
| [`README.md`](./README.md) | 9.0 KB | **Comprehensive docs** | Full understanding |
| [`TEST_PLAN.md`](./TEST_PLAN.md) | 8.5 KB | **Detailed test descriptions** | Understanding each test |
| [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) | 5.6 KB | **Manual testing guide** | Non-automated testing |
| [`EXECUTION_SUMMARY.md`](./EXECUTION_SUMMARY.md) | 11 KB | **Executive summary** | Management overview |
| [`STATUS.md`](./STATUS.md) | 5.5 KB | **Current status tracker** | Real-time status |
| [`BROWSER_QA_REPORT.md`](./BROWSER_QA_REPORT.md) | 17 KB | **Preparation report** | Complete overview |
| [`INDEX.md`](./INDEX.md) | This file | **Navigation guide** | Finding the right doc |

### 📊 Historical Files

| File | Size | Purpose |
|------|------|---------|
| [`bug-report-search.md`](./bug-report-search.md) | 6.2 KB | Previous bug documentation (search issue) |
| [`manual-test-instructions.md`](./manual-test-instructions.md) | 3.6 KB | Legacy manual test instructions |

### 📁 Directories

| Directory | Purpose | Contents |
|-----------|---------|----------|
| [`screenshots/`](./screenshots/) | Test screenshots | Created during test execution (13+ images expected) |
| [`reports/`](./reports/) | Bug reports | Created if tests fail |

---

## 🎯 Common Tasks

### "I need to run the tests"
**Automated:**
```bash
./test-artifacts/run-priority-tests.sh
```
**Manual:**
Follow [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md)

### "I need to see the results"
```bash
jq '.summary' test-artifacts/state.json
```
Or open [`state.json`](./state.json) and look at the `summary` section.

### "I need to understand what failed"
```bash
jq '.failures' test-artifacts/state.json
```
Then check screenshots in [`screenshots/`](./screenshots/) directory.

### "I need to file a bug report"
Use the template in [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) (at the bottom).
Save your report to [`reports/`](./reports/) directory.

### "I need help troubleshooting"
Read the "Troubleshooting" section in [`README.md`](./README.md).

### "I need to understand the test plan"
Read [`TEST_PLAN.md`](./TEST_PLAN.md) for detailed test descriptions.

### "I need to see the current status"
Open [`STATUS.md`](./STATUS.md).

### "I need the big picture"
Read [`BROWSER_QA_REPORT.md`](./BROWSER_QA_REPORT.md).

---

## 📊 File Sizes

**Total Artifacts:** 12 files + 2 directories
**Total Documentation:** ~73 KB
**Expected Screenshots:** ~13 files (after execution)
**Expected Size After Execution:** ~150-200 KB

---

## 🔄 Workflow

```
START
  ↓
Read QUICK_START.md
  ↓
Run ./run-priority-tests.sh
  ↓
Check state.json → summary
  ↓
[PASS] → Update STATUS.md → Done ✅
  ↓
[FAIL] → Check failures → Review screenshots → File bug report → Investigate
```

---

## 🎓 Learning Path

**Beginner (Just want to run tests):**
1. [`QUICK_START.md`](./QUICK_START.md) - Start here!

**Intermediate (Want to understand tests):**
1. [`QUICK_START.md`](./QUICK_START.md)
2. [`TEST_PLAN.md`](./TEST_PLAN.md)
3. [`README.md`](./README.md)

**Advanced (Need full context):**
1. [`BROWSER_QA_REPORT.md`](./BROWSER_QA_REPORT.md)
2. [`EXECUTION_SUMMARY.md`](./EXECUTION_SUMMARY.md)
3. [`TEST_PLAN.md`](./TEST_PLAN.md)
4. [`README.md`](./README.md)

**Manual Testing:**
1. [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md) - Complete guide

---

## 🔍 Search This Index

**Looking for...**

- **How to run tests?** → [`QUICK_START.md`](./QUICK_START.md)
- **What tests exist?** → [`TEST_PLAN.md`](./TEST_PLAN.md)
- **Test results?** → [`state.json`](./state.json)
- **Screenshots?** → [`screenshots/`](./screenshots/)
- **Bug reports?** → [`reports/`](./reports/)
- **Troubleshooting?** → [`README.md`](./README.md) (Troubleshooting section)
- **Current status?** → [`STATUS.md`](./STATUS.md)
- **Full overview?** → [`BROWSER_QA_REPORT.md`](./BROWSER_QA_REPORT.md)
- **Manual testing?** → [`MANUAL_TEST_CHECKLIST.md`](./MANUAL_TEST_CHECKLIST.md)
- **Executive summary?** → [`EXECUTION_SUMMARY.md`](./EXECUTION_SUMMARY.md)

---

## ⚡ Quick Commands

```bash
# Execute tests
./test-artifacts/run-priority-tests.sh

# View results
jq '.summary' test-artifacts/state.json

# View failures
jq '.failures' test-artifacts/state.json

# View specific test
jq '.tests["search-incremental-sarah"]' test-artifacts/state.json

# List screenshots
ls -lht test-artifacts/screenshots/

# Check status
jq '.testRun.status' test-artifacts/state.json
```

---

## 📞 Help

**Can't find what you need?**
1. Check this INDEX.md
2. Read README.md (comprehensive docs)
3. Check QUICK_START.md (common tasks)

**Tests not working?**
1. Read README.md → Troubleshooting section
2. Try MANUAL_TEST_CHECKLIST.md as fallback

**Want to contribute?**
1. Read README.md → Test Maintenance section
2. Follow existing patterns

---

**Created:** 2026-02-03 01:10:16 UTC
**Last Updated:** 2026-02-03 01:16:00 UTC
**Status:** Ready for Use
