# Quick Start: Browser Automation Testing

Get up and running with production testing in 5 minutes.

## 1. Install agent-browser

```bash
npm install -g agent-browser
```

## 2. Configure Credentials

Edit `config.sh`:

```bash
cd tests/browser-automation
nano config.sh
```

Update:
```bash
TEST_EMAIL="your-test-email@example.com"
TEST_PASSWORD="your-test-password"
```

## 3. Run All Tests

```bash
bash run-all-tests.sh
```

Follow prompts for manual interaction.

## 4. Check Results

```bash
ls test-results/
cat test-results/test-report.md
```

## What's Being Tested?

- ✅ Authentication (login, signup, session)
- ✅ Document upload and indexing
- ✅ AI chat with Claude
- ✅ RAG (document-based queries)
- ✅ CRM features (contacts, properties, deals)
- ✅ Mobile responsiveness
- ✅ Page load performance

## Expected Results

If everything works:
- All tests show ✅ in `test-report.md`
- Screenshots show functional UI
- Page loads are <3 seconds
- No console errors

## If Tests Fail

1. Check screenshots in `test-results/`
2. Review error messages in terminal
3. Document issues
4. Fix critical bugs before proceeding

## Need Help?

- [Full Testing Guide](./TESTING_GUIDE.md)
- [Installation Guide](./INSTALLATION.md)
- [README](./README.md)

## Production URL

https://smart-agent-platform.vercel.app

## Time Required

- Setup: 5 minutes
- Full test suite: 20-30 minutes (with manual steps)
- Results review: 10 minutes

**Total: ~45 minutes**
