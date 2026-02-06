"""
PM Agents - Agent execution logic using Claude API with tool use.

This module handles running individual PM agents with their identities,
executing their tasks, and collecting their work output.
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

try:
    import anthropic
except ImportError:
    anthropic = None

from .pm_config import (
    PROJECT_ROOT,
    PM_AGENTS_DIR,
    AGENTS_DIR,
    AGENT as AGENT_CONFIG,
    get_api_key
)
from .pm_tools import TOOL_DEFINITIONS, ToolExecutor


@dataclass
class AgentResult:
    """Result of running an agent."""
    agent_name: str
    success: bool
    work_summary: str
    commits: int
    files_changed: List[str]
    handoffs_created: List[str]
    errors: List[str]
    duration_seconds: float
    work_log: List[Dict[str, Any]]


class PMAgent:
    """A Product Manager Agent that can execute tasks autonomously."""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.agent_dir = AGENTS_DIR / agent_name
        self.agent_definition = None
        self.vision = None
        self.backlog = None
        self.tool_executor = ToolExecutor(agent_name)
        
        # Load agent files
        self._load_agent_files()
    
    def _load_agent_files(self):
        """Load the agent's definition, vision, and backlog."""
        agent_file = self.agent_dir / "AGENT.md"
        vision_file = self.agent_dir / "VISION.md"
        backlog_file = self.agent_dir / "BACKLOG.md"
        
        if agent_file.exists():
            with open(agent_file) as f:
                self.agent_definition = f.read()
        
        if vision_file.exists():
            with open(vision_file) as f:
                self.vision = f.read()
        
        if backlog_file.exists():
            with open(backlog_file) as f:
                self.backlog = f.read()
    
    def _extract_identity_summary(self) -> str:
        """Extract a brief identity summary from AGENT.md."""
        if not self.agent_definition:
            return "You are a PM agent."
        
        # Extract just the key sections (Identity, Capability Ownership, File Ownership)
        lines = self.agent_definition.split('\n')
        summary_parts = []
        in_section = False
        section_count = 0
        
        for line in lines:
            # Capture Identity section and first few key sections
            if line.startswith('## 1. Identity') or line.startswith('## 2. Capability') or line.startswith('## 14. File'):
                in_section = True
                section_count += 1
            elif line.startswith('## ') and in_section:
                in_section = False
                if section_count >= 3:
                    break
            
            if in_section:
                summary_parts.append(line)
        
        return '\n'.join(summary_parts[:50])  # Limit to 50 lines
    
    def _extract_backlog_tasks(self) -> str:
        """Extract just the ready tasks from backlog."""
        if not self.backlog:
            return "No tasks in backlog."
        
        # Find the "Ready" section and extract tasks
        lines = self.backlog.split('\n')
        ready_section = []
        in_ready = False
        
        for line in lines:
            if '## Ready' in line or '### ' in line and 'Ready' in line:
                in_ready = True
                continue
            if in_ready and line.startswith('## ') and 'Ready' not in line:
                break
            if in_ready and line.strip():
                ready_section.append(line)
        
        return '\n'.join(ready_section[:30])  # Limit to 30 lines
    
    def _build_system_prompt(self) -> str:
        """Build a concise system prompt for this agent."""
        identity = self._extract_identity_summary()
        tasks = self._extract_backlog_tasks()
        
        return f"""You are {self.agent_name}, an autonomous PM agent for Smart Agent (real estate AI platform).

{identity}

## Today's Tasks (pick ONE)

{tasks}

## Available Tools

- read_file: Read any project file
- edit_file: Edit files (string replacement)
- write_file: Create new files
- run_command: Run npm/git commands
- git_commit: Commit changes
- run_tests: Run test suite
- run_lint: Run linter
- search_codebase: Find code patterns
- log_work: Log accomplishments
- create_handoff: Hand off to other PMs

## Rules

1. Pick ONE task from your backlog
2. Read relevant files first
3. Make small changes
4. Run lint after edits
5. Commit with clear message
6. Log what you did

Never modify: .env, secrets, node_modules, pm_core/

Today: {datetime.now().strftime('%Y-%m-%d %H:%M')}

Start by picking a task and reading the relevant files.
"""
    
    def _build_user_prompt(self, orchestrator_instructions: str = None) -> str:
        """Build a concise user prompt for today's work."""
        instructions = orchestrator_instructions or "Execute your highest priority task."
        
        return f"""Instructions: {instructions}

Your task:
1. Pick ONE task from the backlog shown above
2. Read the relevant files (use read_file tool)
3. Make the changes (use edit_file or write_file)
4. Run lint (use run_lint tool)
5. Commit (use git_commit tool)
6. Log your work (use log_work tool)

Begin now - start by reading a file related to your chosen task.
"""
    
    def run(self, instructions: str = None) -> AgentResult:
        """Run the agent and return results."""
        start_time = time.time()
        errors = []
        commits = 0
        files_changed = set()
        handoffs = []
        
        # Check if anthropic is available
        if anthropic is None:
            return AgentResult(
                agent_name=self.agent_name,
                success=False,
                work_summary="Anthropic library not installed. Run: pip install anthropic",
                commits=0,
                files_changed=[],
                handoffs_created=[],
                errors=["anthropic library not installed"],
                duration_seconds=0,
                work_log=[]
            )
        
        # Get API key
        api_key = get_api_key()
        if not api_key:
            return AgentResult(
                agent_name=self.agent_name,
                success=False,
                work_summary="ANTHROPIC_API_KEY not set",
                commits=0,
                files_changed=[],
                handoffs_created=[],
                errors=["Missing API key"],
                duration_seconds=0,
                work_log=[]
            )
        
        # Initialize Anthropic client
        client = anthropic.Anthropic(api_key=api_key)
        
        # Build prompts
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(instructions)
        
        messages = [{"role": "user", "content": user_prompt}]
        
        iteration = 0
        work_summary_parts = []
        retry_count = 0
        max_retries = 3
        
        while iteration < AGENT_CONFIG.max_iterations:
            iteration += 1
            
            try:
                # Call Claude API with retry logic for rate limits
                response = None
                for attempt in range(max_retries):
                    try:
                        # Add small delay between API calls
                        if AGENT_CONFIG.api_call_delay > 0:
                            time.sleep(AGENT_CONFIG.api_call_delay)
                        
                        response = client.messages.create(
                            model=AGENT_CONFIG.model,
                            max_tokens=AGENT_CONFIG.max_tokens,
                            system=system_prompt,
                            tools=TOOL_DEFINITIONS,
                            messages=messages
                        )
                        break
                    except anthropic.RateLimitError as e:
                        # Parse retry-after header if available
                        retry_after = 60  # Default
                        error_msg = str(e)
                        
                        # Exponential backoff: 60s, 120s, 180s
                        wait_time = retry_after * (attempt + 1)
                        
                        if attempt < max_retries - 1:
                            print(f"   ⏳ Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait_time}s...")
                            time.sleep(wait_time)
                        else:
                            errors.append(f"Rate limit exceeded after {max_retries} retries")
                            raise
                    except anthropic.APIError as e:
                        errors.append(f"API error: {str(e)}")
                        break
                
                if response is None:
                    if not errors:
                        errors.append("Failed to get response after retries")
                    break
                
                # Process response
                assistant_content = []
                tool_results = []
                should_continue = False
                
                for block in response.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                        work_summary_parts.append(block.text)
                    
                    elif block.type == "tool_use":
                        should_continue = True
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input
                        })
                        
                        # Execute the tool
                        result = self.tool_executor.execute(block.name, block.input)
                        
                        # Track changes
                        if block.name == "git_commit" and result.get("success"):
                            commits += 1
                        if block.name in ["write_file", "edit_file"] and result.get("success"):
                            files_changed.add(block.input.get("path", ""))
                        if block.name == "create_handoff" and result.get("success"):
                            handoffs.append(result.get("handoff_id", ""))
                        if "error" in result:
                            errors.append(f"{block.name}: {result['error']}")
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result)
                        })
                
                # Add assistant response to messages
                messages.append({"role": "assistant", "content": assistant_content})
                
                # Add tool results if any
                if tool_results:
                    messages.append({"role": "user", "content": tool_results})
                
                # Check if we should stop
                if response.stop_reason == "end_turn" and not should_continue:
                    break
                
                if not should_continue:
                    break
                
            except Exception as e:
                errors.append(f"API error: {str(e)}")
                break
        
        duration = time.time() - start_time
        
        # Build work summary
        work_summary = "\n".join(work_summary_parts) if work_summary_parts else "No work summary provided"
        
        return AgentResult(
            agent_name=self.agent_name,
            success=len(errors) == 0,
            work_summary=work_summary[:2000],  # Limit summary length
            commits=commits,
            files_changed=list(files_changed),
            handoffs_created=handoffs,
            errors=errors,
            duration_seconds=duration,
            work_log=self.tool_executor.get_work_log()
        )


class PMOrchestrator:
    """Orchestrates all PM agents."""
    
    def __init__(self):
        self.agent_dir = AGENTS_DIR / "PM-Orchestrator"
        self.definition = None
        self._load_definition()
    
    def _load_definition(self):
        """Load orchestrator definition."""
        def_file = self.agent_dir / "AGENT.md"
        if def_file.exists():
            with open(def_file) as f:
                self.definition = f.read()
    
    def plan_day(self, agent_names: List[str]) -> Dict[str, str]:
        """Plan the day's work for each agent."""
        # This could use Claude to intelligently assign tasks
        # For now, return default instructions
        return {name: None for name in agent_names}  # None means use default
    
    def run_agents(self, agent_names: List[str]) -> List[AgentResult]:
        """Run all specified agents and collect results."""
        results = []
        
        # Plan the day
        instructions = self.plan_day(agent_names)
        
        for i, agent_name in enumerate(agent_names):
            print(f"\n{'='*60}")
            print(f"Running {agent_name}... ({i+1}/{len(agent_names)})")
            print(f"{'='*60}")
            
            agent = PMAgent(agent_name)
            result = agent.run(instructions.get(agent_name))
            results.append(result)
            
            # Print summary
            status = "✅" if result.success else "❌"
            print(f"\n{status} {agent_name} completed")
            print(f"   Commits: {result.commits}")
            print(f"   Files changed: {len(result.files_changed)}")
            print(f"   Duration: {result.duration_seconds:.1f}s")
            if result.errors:
                print(f"   Errors: {result.errors}")
            
            # Add delay between agents to avoid rate limits
            if i < len(agent_names) - 1:
                delay = AGENT_CONFIG.inter_agent_delay
                print(f"   Waiting {delay}s before next agent (rate limit protection)...")
                time.sleep(delay)
        
        return results
    
    def generate_daily_report(self, results: List[AgentResult]) -> str:
        """Generate the daily report from all agent results."""
        report = f"""# PM Daily Report - {datetime.now().strftime('%Y-%m-%d')}

> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

| Metric | Value |
|--------|-------|
| Agents Run | {len(results)} |
| Successful | {sum(1 for r in results if r.success)} |
| Total Commits | {sum(r.commits for r in results)} |
| Files Changed | {sum(len(r.files_changed) for r in results)} |
| Handoffs Created | {sum(len(r.handoffs_created) for r in results)} |

## Agent Reports

"""
        
        for result in results:
            status = "✅ Success" if result.success else "❌ Failed"
            
            report += f"""### {result.agent_name}

**Status:** {status}
**Duration:** {result.duration_seconds:.1f}s
**Commits:** {result.commits}

#### Work Summary

{result.work_summary[:1000]}

"""
            if result.files_changed:
                report += "#### Files Changed\n"
                for f in result.files_changed[:10]:
                    report += f"- `{f}`\n"
                report += "\n"
            
            if result.errors:
                report += "#### Errors\n"
                for e in result.errors[:5]:
                    report += f"- {e}\n"
                report += "\n"
            
            report += "---\n\n"
        
        report += """## Next Steps

Based on today's work, tomorrow the PM-Orchestrator will:
1. Review completed work and verify quality
2. Assign follow-up tasks as needed
3. Address any handoffs or blockers
4. Continue with backlog priorities

---
*This report was generated autonomously by the PM Agent System.*
"""
        
        return report
