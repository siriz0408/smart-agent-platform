"""
PM Configuration - Settings and safety guardrails for autonomous agents.
"""

import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Set

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
PM_AGENTS_DIR = PROJECT_ROOT / "docs" / "pm-agents"
AGENTS_DIR = PM_AGENTS_DIR / "agents"
REPORTS_DIR = PM_AGENTS_DIR / "reports"
LOGS_DIR = PROJECT_ROOT / "logs"

@dataclass
class SafetyConfig:
    """Safety guardrails for autonomous agents."""
    
    # Files/directories agents CANNOT modify
    forbidden_paths: Set[str] = field(default_factory=lambda: {
        ".env",
        ".env.local",
        ".env.production",
        "node_modules/",
        ".git/",
        "pm_core/",  # Don't let agents modify their own code
        "credentials",
        "secrets",
        ".ssh/",
    })
    
    # File patterns agents CANNOT modify
    forbidden_patterns: List[str] = field(default_factory=lambda: [
        "*.key",
        "*.pem",
        "*.cert",
        "*secret*",
        "*credential*",
        "*.env*",
    ])
    
    # Maximum file size agents can read (5MB)
    max_file_read_size: int = 5 * 1024 * 1024
    
    # Maximum commits per day per agent
    max_commits_per_agent: int = 10
    
    # Maximum total commits per day
    max_commits_per_day: int = 50
    
    # Require tests to pass before committing
    require_tests_pass: bool = True
    
    # Branch prefix for agent work
    branch_prefix: str = "pm-agents"
    
    # Commands agents are allowed to run
    allowed_commands: List[str] = field(default_factory=lambda: [
        "npm",
        "npx",
        "node",
        "git",
        "ls",
        "cat",
        "grep",
        "find",
        "echo",
        "pwd",
        "which",
    ])
    
    # Commands agents are NOT allowed to run
    forbidden_commands: List[str] = field(default_factory=lambda: [
        "rm -rf",
        "sudo",
        "chmod",
        "chown",
        "kill",
        "pkill",
        "shutdown",
        "reboot",
        "curl",  # Prevent network calls
        "wget",
        "ssh",
        "scp",
    ])


@dataclass
class AgentConfig:
    """Configuration for agent execution."""
    
    # Claude model to use
    # Options: "claude-sonnet-4-20250514" (best), "claude-3-haiku-20240307" (fast/cheap)
    model: str = "claude-3-haiku-20240307"  # Use Haiku for better rate limits
    
    # Maximum tokens for agent responses
    max_tokens: int = 2048  # Reduced to stay under limits
    
    # Temperature for agent responses
    temperature: float = 0.7
    
    # Maximum iterations per agent task
    max_iterations: int = 5  # Reduced for efficiency
    
    # Timeout for each agent run (seconds)
    timeout: int = 300
    
    # Whether to run agents in parallel
    parallel_execution: bool = False  # Sequential for rate limit safety
    
    # Delay between API calls (seconds) for rate limit protection
    api_call_delay: int = 2
    
    # Delay between agents (seconds)
    inter_agent_delay: int = 30


@dataclass
class OrchestratorConfig:
    """Configuration for the PM Orchestrator."""
    
    # Time to run daily (hour in local time)
    run_hour: int = 8
    
    # PM agents to run (in order of priority)
    active_agents: List[str] = field(default_factory=lambda: [
        "PM-Intelligence",
        "PM-Context",
        "PM-Transactions",
        "PM-Experience",
        "PM-Growth",
        "PM-Integration",
        "PM-Discovery",
        "PM-Communication",
        "PM-Infrastructure",
        "PM-Security",
        "PM-Research",
        "PM-QA",
    ])
    
    # "Quick run" agents - just the most important 3
    quick_agents: List[str] = field(default_factory=lambda: [
        "PM-Intelligence",
        "PM-Experience", 
        "PM-Context",
        "PM-Research",
        "PM-QA",
    ])
    
    # Maximum runtime for entire orchestration (seconds)
    max_runtime: int = 3600  # 1 hour
    
    # Where to save daily reports
    report_to_desktop: bool = True
    desktop_path: Path = Path.home() / "Desktop"
    
    # Rate limit protection: max agents per run
    max_agents_per_run: int = 3  # Run 3 at a time to stay under limits


# Global configuration instances
SAFETY = SafetyConfig()
AGENT = AgentConfig()
ORCHESTRATOR = OrchestratorConfig()


def is_path_safe(path: str) -> bool:
    """Check if a path is safe for agents to access."""
    path_lower = path.lower()
    
    # Check forbidden paths
    for forbidden in SAFETY.forbidden_paths:
        if forbidden.lower() in path_lower:
            return False
    
    # Check forbidden patterns
    import fnmatch
    for pattern in SAFETY.forbidden_patterns:
        if fnmatch.fnmatch(path_lower, pattern.lower()):
            return False
    
    return True


def is_command_safe(command: str) -> bool:
    """Check if a command is safe for agents to run."""
    command_lower = command.lower()
    
    # Check for forbidden commands
    for forbidden in SAFETY.forbidden_commands:
        if forbidden.lower() in command_lower:
            return False
    
    # Check if command starts with an allowed command
    cmd_parts = command.split()
    if cmd_parts:
        base_cmd = cmd_parts[0]
        if base_cmd not in SAFETY.allowed_commands:
            # Allow full paths to allowed commands
            if not any(base_cmd.endswith(f"/{allowed}") for allowed in SAFETY.allowed_commands):
                return False
    
    return True


def get_api_key() -> str:
    """Get the Anthropic API key from environment."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        # Try loading from .env
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.startswith("ANTHROPIC_API_KEY="):
                        key = line.split("=", 1)[1].strip().strip('"\'')
                        break
    return key or ""
