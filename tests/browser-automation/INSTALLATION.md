# Installation Guide: agent-browser Testing Setup

## Step 1: Install agent-browser

### Option A: Global Installation (Recommended)

```bash
npm install -g agent-browser
```

Verify:
```bash
agent-browser --version
```

### Option B: Local Installation

```bash
cd /Users/sam.irizarry/Downloads/ReAgentOS_V1
npm install --save-dev agent-browser
```

Then use with npx:
```bash
npx agent-browser --version
```

## Step 2: Configure Test Credentials

1. Edit `tests/browser-automation/config.sh`:

```bash
cd tests/browser-automation
nano config.sh  # or use your preferred editor
```

2. Update these variables:

```bash
TEST_EMAIL="your-test-email@example.com"
TEST_PASSWORD="your-test-password"
```

**IMPORTANT**:
- Use a dedicated test account
- Do NOT use your production account
- Do NOT commit credentials to git

## Step 3: Prepare Test Data

Sample test document is already created at:
```
tests/browser-automation/test-data/sample-document.txt
```

To add a PDF test document:
```bash
# Copy a sample PDF to test-data/
cp /path/to/your/sample.pdf tests/browser-automation/test-data/sample-document.pdf
```

## Step 4: Verify Setup

Run a quick test:

```bash
cd tests/browser-automation
agent-browser --session test-setup open https://smart-agent-platform.vercel.app
agent-browser --session test-setup screenshot ./test-setup-verify.png
```

Check if `test-setup-verify.png` was created.

## Step 5: Run Your First Test

Start with authentication testing:

```bash
bash scripts/01-auth-test.sh
```

Follow the prompts to complete the interactive test.

## Troubleshooting

### "agent-browser: command not found"

**Solution**: Install globally with npm:
```bash
npm install -g agent-browser
```

Or use npx:
```bash
npx agent-browser --version
```

### "Permission denied" when running scripts

**Solution**: Make scripts executable:
```bash
chmod +x run-all-tests.sh scripts/*.sh config.sh
```

### Browser doesn't launch

**Solution**: agent-browser uses headless browser. Check if:
- Chrome/Chromium is installed
- You have necessary dependencies

For macOS:
```bash
# Install Chromium via Homebrew
brew install chromium
```

### Session state not persisting

**Solution**: Ensure you're using the same session name:
```bash
# Always use the same session name
agent-browser --session smart-agent-test open URL
```

## Next Steps

Once setup is complete:

1. **Run all tests**: `bash run-all-tests.sh`
2. **Check results**: `ls -la test-results/`
3. **Review report**: `cat test-results/test-report.md`

## Additional Resources

- [agent-browser GitHub](https://github.com/yourusername/agent-browser)
- [Testing README](./README.md)
- [Production Testing Plan](./TESTING_PLAN.md)
