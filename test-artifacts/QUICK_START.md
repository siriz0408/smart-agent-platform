# Quick Start - Browser QA Tests

## 🚀 Run Tests in 3 Steps

### Step 1: Install Dependencies
```bash
# Install agent-browser (if not already installed)
npm install -g agent-browser

# Install jq for JSON processing (macOS)
brew install jq

# OR Linux
sudo apt-get install jq
```

### Step 2: Run Tests
```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
./test-artifacts/run-priority-tests.sh
```

### Step 3: View Results
```bash
# View summary
jq '.summary' test-artifacts/state.json

# Output example:
# {
#   "total": 9,
#   "passed": 9,
#   "failed": 0,
#   "skipped": 0
# }
```

---

## 🎯 What Gets Tested

1. **Login Flow** - User authentication
2. **Search for "sarah"** - Returns Sarah Johnson contacts
3. **Search accuracy** - Does NOT return 922 Sharondale for "sarah"
4. **See All Results** - Button navigation works
5. **Filter tabs** - All, Documents, Contacts, Properties, Deals
6. **Search for "922"** - Returns 922 Sharondale property
7. **Documents page** - Loads successfully
8. **Properties page** - Loads successfully
9. **Contacts page** - Loads successfully

---

## 📊 Understanding Results

### ✅ All Tests Pass
```bash
$ jq '.summary' test-artifacts/state.json
{
  "total": 9,
  "passed": 9,
  "failed": 0,
  "skipped": 0
}
```
**Action:** Search fix verified! All systems operational.

---

### ❌ Tests Fail
```bash
$ jq '.summary' test-artifacts/state.json
{
  "total": 9,
  "passed": 7,
  "failed": 2,
  "skipped": 0
}

# View failures
$ jq '.failures' test-artifacts/state.json
[
  {
    "test": "search-incremental-sarah",
    "error": "Sarah Johnson not found in search results",
    "screenshot": "test-artifacts/screenshots/07-search-sarah.png"
  }
]
```
**Action:** Check screenshots, file bug report, investigate root cause.

---

## 🐛 If Tests Fail

1. **Check Screenshots**
   ```bash
   ls -lht test-artifacts/screenshots/
   open test-artifacts/screenshots/07-search-sarah.png
   ```

2. **Review Failure Details**
   ```bash
   jq '.failures' test-artifacts/state.json
   ```

3. **File Bug Report**
   ```bash
   # Copy template
   cp test-artifacts/MANUAL_TEST_CHECKLIST.md test-artifacts/reports/bug-$(date +%Y%m%d).md
   # Edit and document issue
   ```

4. **Rerun Failed Tests**
   ```bash
   # Just rerun the script
   ./test-artifacts/run-priority-tests.sh
   ```

---

## 🔧 Troubleshooting

### Permission Denied
```bash
chmod +x test-artifacts/run-priority-tests.sh
```

### agent-browser Not Found
```bash
npx -y agent-browser --version
# Uses npx to auto-install
```

### jq Not Found
```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

### Browser Opens But Tests Don't Run
This is normal! The script uses `npx -y agent-browser` which may need interactive browser permissions the first time.

**Manual Alternative:**
1. Open `test-artifacts/MANUAL_TEST_CHECKLIST.md`
2. Follow step-by-step instructions
3. Take screenshots manually
4. Update `state.json` manually

---

## 📝 Manual Testing (Alternative)

If automated tests don't work on your system:

```bash
# 1. Open the manual checklist
open test-artifacts/MANUAL_TEST_CHECKLIST.md

# 2. Open the test site
open https://smart-agent-platform-sigma.vercel.app/login

# 3. Follow checklist step-by-step
# 4. Take screenshots as you go
# 5. Mark pass/fail in checklist
```

---

## ⏱️ Expected Duration

**Automated:** ~30-60 seconds (if all tests pass)
**Manual:** ~5-10 minutes (careful verification)

---

## 🎯 Success Criteria

**✅ Search Fix Verified If:**
- "sarah" returns Sarah Johnson ✓
- "sarah" does NOT return 922 Sharondale ✓
- "See All Results" button works ✓
- Filter tabs visible ✓
- "922" returns 922 Sharondale property ✓

**Search fix is BROKEN if any of these fail!**

---

## 📚 More Info

- **Detailed Test Plan:** `test-artifacts/TEST_PLAN.md`
- **Full README:** `test-artifacts/README.md`
- **Browser QA Skill:** `.claude/skills/smart-agent-browser-qa/SKILL.md`

---

## 🆘 Need Help?

1. Read `test-artifacts/README.md` for detailed troubleshooting
2. Check `test-artifacts/TEST_PLAN.md` for test descriptions
3. Review `.claude/skills/smart-agent-browser-qa/SKILL.md` for agent-browser patterns
4. Use manual testing as fallback: `test-artifacts/MANUAL_TEST_CHECKLIST.md`

---

**Ready to run? Just execute:**
```bash
./test-artifacts/run-priority-tests.sh
```
