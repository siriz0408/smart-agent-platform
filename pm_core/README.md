# PM Core - Autonomous PM Agent System

This module enables **fully autonomous** PM agents that can make code changes, run tests, and commit to git without human intervention.

## Quick Start

### 1. Install Dependencies

```bash
pip3 install -r pm_core/requirements.txt
```

### 2. Set Your API Key

```bash
# Option A: Environment variable
export ANTHROPIC_API_KEY='your-key-here'

# Option B: Add to .env file
echo "ANTHROPIC_API_KEY=your-key-here" >> .env
```

Get your API key at: https://console.anthropic.com/

### 3. Test Run

```bash
# Dry run (shows what would happen)
python3 -m pm_core.pm_orchestrator --dry-run

# Test mode (runs 2 agents only)
python3 -m pm_core.pm_orchestrator --test

# Single agent
python3 -m pm_core.pm_orchestrator --agents PM-Intelligence
```

### 4. Full Run

```bash
python3 -m pm_core.pm_orchestrator
```

### 5. Schedule Daily Execution

```bash
./scripts/install-pm-orchestrator.sh
```

This schedules the orchestrator to run daily at 8:00 AM.

## Architecture

```
pm_core/
├── __init__.py           # Package init
├── pm_config.py          # Configuration & safety guardrails
├── pm_tools.py           # Tool definitions for Claude API
├── pm_agents.py          # Agent execution logic
├── pm_orchestrator.py    # Main orchestrator script
└── requirements.txt      # Python dependencies
```

## How It Works

1. **Orchestrator** runs daily at 8am (or on-demand)
2. **Creates a branch** for today's work: `pm-agents/YYYY-MM-DD`
3. **Runs each PM agent** with their identity and backlog
4. **Agents use tools** to read/write files, run commands, git commit
5. **Results collected** into a daily report
6. **Report saved** to desktop and `docs/pm-agents/reports/`

## Agent Capabilities

Each PM agent has access to these tools:

| Tool | Description |
|------|-------------|
| `read_file` | Read any file in the project |
| `write_file` | Create new files |
| `edit_file` | Edit files with string replacement |
| `run_command` | Run shell commands (npm, git, etc.) |
| `search_codebase` | Search for code patterns |
| `git_status` | View git status |
| `git_commit` | Stage and commit changes |
| `git_diff` | View changes |
| `run_tests` | Run test suite |
| `run_lint` | Run linter |
| `log_work` | Log work for daily report |
| `create_handoff` | Create handoff to another PM |

## Safety Guardrails

| Guardrail | Limit |
|-----------|-------|
| Max commits per agent/day | 10 |
| Max total commits/day | 50 |
| Forbidden paths | `.env`, secrets, `node_modules/`, `pm_core/` |
| Branch isolation | All work on dated branch |
| Test requirement | Configurable (default: on) |

## Configuration

Edit `pm_core/pm_config.py` to customize:

```python
# Change which agents run
ORCHESTRATOR.active_agents = ["PM-Intelligence", "PM-Experience"]

# Change run time (hour)
ORCHESTRATOR.run_hour = 9  # 9am instead of 8am

# Disable test requirement
SAFETY.require_tests_pass = False

# Change branch prefix
SAFETY.branch_prefix = "auto-dev"
```

## Commands

| Command | Description |
|---------|-------------|
| `python3 -m pm_core.pm_orchestrator` | Full run |
| `python3 -m pm_core.pm_orchestrator --test` | Test mode (2 agents) |
| `python3 -m pm_core.pm_orchestrator --agents PM-X,PM-Y` | Specific agents |
| `python3 -m pm_core.pm_orchestrator --dry-run` | Show what would run |

## Outputs

| Output | Location |
|--------|----------|
| Daily report | `~/Desktop/PM-Report-YYYY-MM-DD.md` |
| Project report | `docs/pm-agents/reports/YYYY-MM-DD/daily-report.md` |
| System state | `docs/pm-agents/STATE.md` |
| Logs | `logs/orchestrator-YYYY-MM-DD.log` |
| Tool logs | `logs/pm-tools-YYYY-MM-DD.jsonl` |

## Troubleshooting

### API Key Not Set

```
ERROR: ANTHROPIC_API_KEY not set!
```

**Solution:** Set your API key:
```bash
export ANTHROPIC_API_KEY='your-key-here'
```

### Agent Fails to Run

Check the logs:
```bash
tail -f logs/orchestrator-$(date +%Y-%m-%d).log
```

### Commits Not Appearing

1. Check which branch you're on: `git branch`
2. Agent commits go to `pm-agents/YYYY-MM-DD` branch
3. Review and merge when ready: `git merge pm-agents/2026-02-05`

### Launchd Schedule Not Working

```bash
# Check if loaded
launchctl list | grep smartagent

# View logs
tail -f logs/pm-orchestrator-stdout.log
tail -f logs/pm-orchestrator-stderr.log

# Reload schedule
launchctl unload ~/Library/LaunchAgents/com.smartagent.pm-orchestrator.plist
launchctl load ~/Library/LaunchAgents/com.smartagent.pm-orchestrator.plist
```

## Extending

### Add a New Tool

Edit `pm_core/pm_tools.py`:

```python
# Add to TOOL_DEFINITIONS list
{
    "name": "my_new_tool",
    "description": "What this tool does",
    "input_schema": {
        "type": "object",
        "properties": {
            "param1": {"type": "string", "description": "..."}
        },
        "required": ["param1"]
    }
}

# Add implementation to ToolExecutor class
def _tool_my_new_tool(self, param1: str) -> Dict[str, Any]:
    # Implementation
    return {"success": True, "result": "..."}
```

### Add a New PM Agent

1. Create directory: `docs/pm-agents/agents/PM-NewDomain/`
2. Create `AGENT.md` (copy from existing)
3. Create `VISION.md`
4. Create `BACKLOG.md` with tasks
5. Add to `ORCHESTRATOR.active_agents` in config
