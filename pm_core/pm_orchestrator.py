#!/usr/bin/env python3
"""
PM Orchestrator - Main entry point for autonomous PM agent execution.

This script is run daily by launchd to:
1. Create a working branch for today's work
2. Run each PM agent to execute their tasks
3. Collect results and generate a daily report
4. Save report to desktop and project
5. Update system state

Usage:
    python -m pm_core.pm_orchestrator [--test] [--agents PM-X,PM-Y]

Options:
    --test      Run in test mode (limited execution)
    --agents    Comma-separated list of specific agents to run
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from pm_core.pm_config import (
    PROJECT_ROOT,
    PM_AGENTS_DIR,
    REPORTS_DIR,
    LOGS_DIR,
    ORCHESTRATOR as ORCH_CONFIG,
    AGENT as AGENT_CONFIG,
    SAFETY,
    get_api_key
)
from pm_core.pm_agents import PMAgent, PMOrchestrator, AgentResult


def setup_logging():
    """Setup logging for the orchestrator."""
    LOGS_DIR.mkdir(exist_ok=True)
    log_file = LOGS_DIR / f"orchestrator-{datetime.now().strftime('%Y-%m-%d')}.log"
    
    # Simple logging to file and stdout
    class Logger:
        def __init__(self, log_path):
            self.log_path = log_path
            self.log_file = open(log_path, 'a')
        
        def log(self, message: str):
            timestamp = datetime.now().strftime('%H:%M:%S')
            line = f"[{timestamp}] {message}"
            print(line)
            self.log_file.write(line + "\n")
            self.log_file.flush()
        
        def close(self):
            self.log_file.close()
    
    return Logger(log_file)


def create_work_branch() -> str:
    """Create a git branch for today's work."""
    date_str = datetime.now().strftime('%Y-%m-%d')
    branch_name = f"{SAFETY.branch_prefix}/{date_str}"
    
    try:
        # Check if branch exists
        result = subprocess.run(
            ["git", "branch", "--list", branch_name],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True
        )
        
        if branch_name not in result.stdout:
            # Create new branch from current HEAD
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=PROJECT_ROOT,
                check=True,
                capture_output=True
            )
        else:
            # Switch to existing branch
            subprocess.run(
                ["git", "checkout", branch_name],
                cwd=PROJECT_ROOT,
                check=True,
                capture_output=True
            )
        
        return branch_name
    except subprocess.CalledProcessError as e:
        # If branch operations fail, continue on current branch
        return "current"


def update_system_state(results: List[AgentResult]):
    """Update the STATE.md file with run results."""
    state_file = PM_AGENTS_DIR / "STATE.md"
    
    total_commits = sum(r.commits for r in results)
    total_files = sum(len(r.files_changed) for r in results)
    success_count = sum(1 for r in results if r.success)
    
    health = "🟢 Healthy" if success_count == len(results) else "🟡 Degraded" if success_count > 0 else "🔴 Failed"
    
    state_content = f"""# PM System State

> **Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
> **Last Run:** {datetime.now().strftime('%Y-%m-%d %H:%M')}

## System Status

| Indicator | Status |
|-----------|--------|
| **Overall Health** | {health} |
| **Agents Active** | {len(results)} |
| **Agents Successful** | {success_count} |
| **Total Commits Today** | {total_commits} |
| **Files Changed Today** | {total_files} |

## Agent Status

| Agent | Status | Commits | Files | Duration |
|-------|--------|---------|-------|----------|
"""
    
    for r in results:
        status = "✅" if r.success else "❌"
        state_content += f"| {r.agent_name} | {status} | {r.commits} | {len(r.files_changed)} | {r.duration_seconds:.1f}s |\n"
    
    state_content += """
## Current Priorities

Based on today's execution, the following are top priorities:

1. Review and merge today's commits
2. Address any failed agent runs
3. Follow up on created handoffs

## Notes

This state is automatically updated after each orchestrator run.
"""
    
    with open(state_file, 'w') as f:
        f.write(state_content)


def save_report(report: str, logger):
    """Save the daily report to desktop and project."""
    date_str = datetime.now().strftime('%Y-%m-%d')
    
    # Save to project reports directory
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_dir = REPORTS_DIR / date_str
    report_dir.mkdir(exist_ok=True)
    
    project_report = report_dir / "daily-report.md"
    with open(project_report, 'w') as f:
        f.write(report)
    logger.log(f"Report saved to: {project_report}")
    
    # Save to desktop if configured
    if ORCH_CONFIG.report_to_desktop:
        desktop_report = ORCH_CONFIG.desktop_path / f"PM-Report-{date_str}.md"
        with open(desktop_report, 'w') as f:
            f.write(report)
        logger.log(f"Report saved to desktop: {desktop_report}")


def run_orchestration(
    test_mode: bool = False,
    specific_agents: List[str] = None,
    logger = None
):
    """Run the full orchestration cycle."""
    if logger is None:
        logger = setup_logging()
    
    logger.log("=" * 60)
    logger.log("PM ORCHESTRATOR - Daily Run Starting")
    logger.log("=" * 60)
    
    # Check API key
    if not get_api_key():
        logger.log("ERROR: ANTHROPIC_API_KEY not set!")
        logger.log("Please set the environment variable or add to .env file")
        return False
    
    # Determine which agents to run
    if specific_agents:
        agents_to_run = specific_agents
    elif test_mode:
        # In test mode, only run first 2 agents
        agents_to_run = ORCH_CONFIG.active_agents[:2]
        logger.log("TEST MODE: Running limited agents")
    else:
        agents_to_run = ORCH_CONFIG.active_agents
    
    logger.log(f"Agents to run: {', '.join(agents_to_run)}")
    
    # Create working branch
    branch = create_work_branch()
    logger.log(f"Working on branch: {branch}")
    
    # Run the orchestrator
    orchestrator = PMOrchestrator()
    
    start_time = datetime.now()
    results = orchestrator.run_agents(agents_to_run)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    logger.log(f"\nTotal execution time: {duration:.1f}s")
    
    # Generate report
    logger.log("\nGenerating daily report...")
    report = orchestrator.generate_daily_report(results)
    
    # Save report
    save_report(report, logger)
    
    # Update system state
    logger.log("Updating system state...")
    update_system_state(results)
    
    # Summary
    success_count = sum(1 for r in results if r.success)
    total_commits = sum(r.commits for r in results)
    
    logger.log("\n" + "=" * 60)
    logger.log("ORCHESTRATION COMPLETE")
    logger.log("=" * 60)
    logger.log(f"Agents: {success_count}/{len(results)} successful")
    logger.log(f"Total commits: {total_commits}")
    logger.log(f"Duration: {duration:.1f}s")
    
    return success_count == len(results)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="PM Orchestrator - Run autonomous PM agents"
    )
    parser.add_argument(
        '--test', 
        action='store_true',
        help='Run in test mode (1 agent only)'
    )
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Quick run (top 3 priority agents)'
    )
    parser.add_argument(
        '--agents',
        type=str,
        help='Comma-separated list of specific agents to run'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would run without executing'
    )
    
    args = parser.parse_args()
    
    # Parse agent list if provided
    specific_agents = None
    if args.agents:
        specific_agents = [a.strip() for a in args.agents.split(',')]
    elif args.quick:
        specific_agents = ORCH_CONFIG.quick_agents
    
    if args.dry_run:
        agents_to_show = specific_agents or (ORCH_CONFIG.active_agents[:1] if args.test else ORCH_CONFIG.active_agents)
        print("DRY RUN MODE")
        print(f"Model: {AGENT_CONFIG.model}")
        print(f"Would run agents: {agents_to_show}")
        print(f"API key set: {'Yes' if get_api_key() else 'No'}")
        return
    
    # Run orchestration
    success = run_orchestration(
        test_mode=args.test,
        specific_agents=specific_agents
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
