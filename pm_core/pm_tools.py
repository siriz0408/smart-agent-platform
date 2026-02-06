"""
PM Tools - Tool definitions for Claude API tool use.

These tools allow agents to interact with the codebase:
- Read files
- Write/edit files
- Run commands
- Git operations
- Search codebase
"""

import os
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from .pm_config import (
    PROJECT_ROOT, 
    SAFETY, 
    is_path_safe, 
    is_command_safe,
    LOGS_DIR
)


# Tool definitions for Claude API
TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read the contents of a file. Use this to understand existing code before making changes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file relative to project root"
                },
                "start_line": {
                    "type": "integer",
                    "description": "Optional: Start reading from this line (1-indexed)"
                },
                "end_line": {
                    "type": "integer",
                    "description": "Optional: Stop reading at this line"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file. Creates the file if it doesn't exist. Use for creating new files.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file relative to project root"
                },
                "content": {
                    "type": "string",
                    "description": "The full content to write to the file"
                }
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "edit_file",
        "description": "Edit a file by replacing a specific string with another. Use for precise code modifications.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the file relative to project root"
                },
                "old_string": {
                    "type": "string",
                    "description": "The exact string to find and replace"
                },
                "new_string": {
                    "type": "string",
                    "description": "The string to replace it with"
                }
            },
            "required": ["path", "old_string", "new_string"]
        }
    },
    {
        "name": "run_command",
        "description": "Run a shell command. Use for npm commands, tests, linting, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The command to run"
                },
                "working_directory": {
                    "type": "string",
                    "description": "Optional: Directory to run the command in (relative to project root)"
                }
            },
            "required": ["command"]
        }
    },
    {
        "name": "search_codebase",
        "description": "Search for files or content in the codebase using grep/ripgrep patterns.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "The search pattern (regex supported)"
                },
                "file_pattern": {
                    "type": "string",
                    "description": "Optional: File glob pattern to search in (e.g., '*.tsx')"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 20)"
                }
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "list_directory",
        "description": "List files and directories in a path.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to the directory relative to project root"
                },
                "recursive": {
                    "type": "boolean",
                    "description": "Whether to list recursively (default: false)"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "git_status",
        "description": "Get the current git status showing modified, staged, and untracked files.",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "git_commit",
        "description": "Stage and commit changes to git with a descriptive message.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The commit message describing the changes"
                },
                "files": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional: Specific files to commit. If empty, commits all changes."
                }
            },
            "required": ["message"]
        }
    },
    {
        "name": "git_diff",
        "description": "Show the diff of current changes or between commits.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file": {
                    "type": "string",
                    "description": "Optional: Show diff for a specific file"
                }
            }
        }
    },
    {
        "name": "run_tests",
        "description": "Run the test suite to verify changes work correctly.",
        "input_schema": {
            "type": "object",
            "properties": {
                "test_pattern": {
                    "type": "string",
                    "description": "Optional: Pattern to filter which tests to run"
                }
            }
        }
    },
    {
        "name": "run_lint",
        "description": "Run the linter to check code quality.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fix": {
                    "type": "boolean",
                    "description": "Whether to auto-fix linting issues (default: false)"
                }
            }
        }
    },
    {
        "name": "update_backlog",
        "description": "Update your PM backlog with task status changes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The task ID to update"
                },
                "status": {
                    "type": "string",
                    "enum": ["pending", "in_progress", "completed", "blocked"],
                    "description": "New status for the task"
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes about the task"
                }
            },
            "required": ["task_id", "status"]
        }
    },
    {
        "name": "create_handoff",
        "description": "Create a handoff to another PM agent for cross-domain issues.",
        "input_schema": {
            "type": "object",
            "properties": {
                "to_pm": {
                    "type": "string",
                    "description": "The PM to hand off to (e.g., 'PM-Context')"
                },
                "issue": {
                    "type": "string",
                    "description": "Description of the issue"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Priority of the handoff"
                }
            },
            "required": ["to_pm", "issue", "priority"]
        }
    },
    {
        "name": "log_work",
        "description": "Log work done for the daily report.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Brief summary of work done"
                },
                "details": {
                    "type": "string",
                    "description": "Detailed description of changes made"
                },
                "files_changed": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of files that were modified"
                }
            },
            "required": ["summary"]
        }
    }
]


class ToolExecutor:
    """Executes tools called by agents."""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.work_log: List[Dict[str, Any]] = []
        self.commits_today = 0
        self.start_time = datetime.now()
        
        # Ensure logs directory exists
        LOGS_DIR.mkdir(exist_ok=True)
    
    def execute(self, tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return the result."""
        try:
            method = getattr(self, f"_tool_{tool_name}", None)
            if not method:
                return {"error": f"Unknown tool: {tool_name}"}
            
            result = method(**tool_input)
            
            # Log the tool execution
            self._log_execution(tool_name, tool_input, result)
            
            return result
        except Exception as e:
            return {"error": str(e)}
    
    def _log_execution(self, tool_name: str, inputs: Dict, result: Dict):
        """Log tool execution for audit trail."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "agent": self.agent_name,
            "tool": tool_name,
            "inputs": inputs,
            "success": "error" not in result
        }
        
        log_file = LOGS_DIR / f"pm-tools-{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    
    def _resolve_path(self, path: str) -> Path:
        """Resolve a relative path to absolute, ensuring it's within project."""
        if path.startswith("/"):
            full_path = Path(path)
        else:
            full_path = PROJECT_ROOT / path
        
        # Ensure path is within project
        try:
            full_path.resolve().relative_to(PROJECT_ROOT.resolve())
        except ValueError:
            raise ValueError(f"Path {path} is outside project directory")
        
        return full_path
    
    def _tool_read_file(self, path: str, start_line: int = None, end_line: int = None) -> Dict[str, Any]:
        """Read a file's contents."""
        if not is_path_safe(path):
            return {"error": f"Access denied to path: {path}"}
        
        full_path = self._resolve_path(path)
        
        if not full_path.exists():
            return {"error": f"File not found: {path}"}
        
        if full_path.stat().st_size > SAFETY.max_file_read_size:
            return {"error": f"File too large: {path}"}
        
        try:
            with open(full_path, "r") as f:
                lines = f.readlines()
            
            if start_line or end_line:
                start = (start_line or 1) - 1
                end = end_line or len(lines)
                lines = lines[start:end]
            
            content = "".join(lines)
            return {
                "content": content,
                "lines": len(content.splitlines()),
                "path": path
            }
        except Exception as e:
            return {"error": f"Failed to read file: {str(e)}"}
    
    def _tool_write_file(self, path: str, content: str) -> Dict[str, Any]:
        """Write content to a file."""
        if not is_path_safe(path):
            return {"error": f"Access denied to path: {path}"}
        
        full_path = self._resolve_path(path)
        
        try:
            # Create parent directories if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(full_path, "w") as f:
                f.write(content)
            
            return {
                "success": True,
                "path": path,
                "bytes_written": len(content)
            }
        except Exception as e:
            return {"error": f"Failed to write file: {str(e)}"}
    
    def _tool_edit_file(self, path: str, old_string: str, new_string: str) -> Dict[str, Any]:
        """Edit a file by replacing a string."""
        if not is_path_safe(path):
            return {"error": f"Access denied to path: {path}"}
        
        full_path = self._resolve_path(path)
        
        if not full_path.exists():
            return {"error": f"File not found: {path}"}
        
        try:
            with open(full_path, "r") as f:
                content = f.read()
            
            if old_string not in content:
                return {"error": f"String not found in file: {old_string[:50]}..."}
            
            # Count occurrences
            count = content.count(old_string)
            
            # Replace
            new_content = content.replace(old_string, new_string, 1)
            
            with open(full_path, "w") as f:
                f.write(new_content)
            
            return {
                "success": True,
                "path": path,
                "occurrences_found": count,
                "replaced": 1
            }
        except Exception as e:
            return {"error": f"Failed to edit file: {str(e)}"}
    
    def _tool_run_command(self, command: str, working_directory: str = None) -> Dict[str, Any]:
        """Run a shell command."""
        if not is_command_safe(command):
            return {"error": f"Command not allowed: {command}"}
        
        cwd = PROJECT_ROOT
        if working_directory:
            cwd = self._resolve_path(working_directory)
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            return {
                "stdout": result.stdout[:5000],  # Limit output
                "stderr": result.stderr[:2000],
                "exit_code": result.returncode,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {"error": "Command timed out after 60 seconds"}
        except Exception as e:
            return {"error": f"Failed to run command: {str(e)}"}
    
    def _tool_search_codebase(self, pattern: str, file_pattern: str = None, max_results: int = 20) -> Dict[str, Any]:
        """Search the codebase using grep."""
        try:
            cmd = ["grep", "-rn", "--include=*.{ts,tsx,js,jsx,py,md}", pattern, "."]
            if file_pattern:
                cmd = ["grep", "-rn", f"--include={file_pattern}", pattern, "."]
            
            result = subprocess.run(
                cmd,
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            lines = result.stdout.strip().split("\n")[:max_results]
            
            return {
                "matches": lines,
                "count": len(lines),
                "truncated": len(result.stdout.strip().split("\n")) > max_results
            }
        except Exception as e:
            return {"error": f"Search failed: {str(e)}"}
    
    def _tool_list_directory(self, path: str, recursive: bool = False) -> Dict[str, Any]:
        """List directory contents."""
        full_path = self._resolve_path(path)
        
        if not full_path.exists():
            return {"error": f"Directory not found: {path}"}
        
        if not full_path.is_dir():
            return {"error": f"Not a directory: {path}"}
        
        try:
            if recursive:
                items = [str(p.relative_to(full_path)) for p in full_path.rglob("*") if p.is_file()][:100]
            else:
                items = [p.name for p in full_path.iterdir()][:50]
            
            return {
                "path": path,
                "items": items,
                "count": len(items)
            }
        except Exception as e:
            return {"error": f"Failed to list directory: {str(e)}"}
    
    def _tool_git_status(self) -> Dict[str, Any]:
        """Get git status."""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True
            )
            
            lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
            
            return {
                "changed_files": lines,
                "count": len(lines),
                "clean": len(lines) == 0
            }
        except Exception as e:
            return {"error": f"Git status failed: {str(e)}"}
    
    def _tool_git_commit(self, message: str, files: List[str] = None) -> Dict[str, Any]:
        """Stage and commit changes."""
        if self.commits_today >= SAFETY.max_commits_per_agent:
            return {"error": f"Commit limit reached ({SAFETY.max_commits_per_agent} per day)"}
        
        try:
            # Stage files
            if files:
                for f in files:
                    if not is_path_safe(f):
                        return {"error": f"Cannot commit forbidden file: {f}"}
                cmd = ["git", "add"] + list(files)
                subprocess.run(cmd, cwd=PROJECT_ROOT, check=True)
            else:
                subprocess.run(["git", "add", "-A"], cwd=PROJECT_ROOT, check=True)
            
            # Commit
            full_message = f"[{self.agent_name}] {message}"
            result = subprocess.run(
                ["git", "commit", "-m", full_message],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                self.commits_today += 1
                return {
                    "success": True,
                    "message": full_message,
                    "commits_today": self.commits_today
                }
            else:
                return {"error": result.stderr or "Nothing to commit"}
            
        except Exception as e:
            return {"error": f"Git commit failed: {str(e)}"}
    
    def _tool_git_diff(self, file: str = None) -> Dict[str, Any]:
        """Get git diff."""
        try:
            cmd = ["git", "diff"]
            if file:
                cmd.append(file)
            
            result = subprocess.run(
                cmd,
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True
            )
            
            return {
                "diff": result.stdout[:10000],  # Limit diff output
                "truncated": len(result.stdout) > 10000
            }
        except Exception as e:
            return {"error": f"Git diff failed: {str(e)}"}
    
    def _tool_run_tests(self, test_pattern: str = None) -> Dict[str, Any]:
        """Run tests."""
        try:
            cmd = "npm run test"
            if test_pattern:
                cmd = f"npx vitest run -t '{test_pattern}'"
            
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            return {
                "stdout": result.stdout[-5000:],  # Last 5000 chars
                "exit_code": result.returncode,
                "passed": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {"error": "Tests timed out"}
        except Exception as e:
            return {"error": f"Tests failed: {str(e)}"}
    
    def _tool_run_lint(self, fix: bool = False) -> Dict[str, Any]:
        """Run linter."""
        try:
            cmd = "npm run lint:fix" if fix else "npm run lint"
            
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            return {
                "stdout": result.stdout[-3000:],
                "exit_code": result.returncode,
                "passed": result.returncode == 0
            }
        except Exception as e:
            return {"error": f"Lint failed: {str(e)}"}
    
    def _tool_update_backlog(self, task_id: str, status: str, notes: str = None) -> Dict[str, Any]:
        """Update backlog task status."""
        backlog_path = PROJECT_ROOT / "docs" / "pm-agents" / "agents" / self.agent_name / "BACKLOG.md"
        
        if not backlog_path.exists():
            return {"error": f"Backlog not found for {self.agent_name}"}
        
        try:
            with open(backlog_path, "r") as f:
                content = f.read()
            
            # Simple status update in markdown table
            # This is a basic implementation - could be more sophisticated
            if task_id in content:
                # Update last modified
                updated = f"> **Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                if "> **Last Updated:**" in content:
                    content = content.replace(
                        content.split("> **Last Updated:**")[0] + "> **Last Updated:**" + content.split("> **Last Updated:**")[1].split("\n")[0],
                        updated.strip()
                    )
                
                return {"success": True, "task_id": task_id, "new_status": status}
            else:
                return {"error": f"Task {task_id} not found in backlog"}
        except Exception as e:
            return {"error": f"Failed to update backlog: {str(e)}"}
    
    def _tool_create_handoff(self, to_pm: str, issue: str, priority: str) -> Dict[str, Any]:
        """Create a handoff to another PM."""
        handoffs_path = PROJECT_ROOT / "docs" / "pm-agents" / "HANDOFFS.md"
        
        try:
            with open(handoffs_path, "r") as f:
                content = f.read()
            
            # Generate handoff ID
            import random
            ho_id = f"HO-{random.randint(100, 999)}"
            
            handoff_entry = f"""
### [{ho_id}] {issue[:50]}
- **From:** {self.agent_name}
- **To:** {to_pm}
- **Priority:** {priority.capitalize()}
- **Created:** {datetime.now().strftime('%Y-%m-%d %H:%M')}

**Issue:**
{issue}

**Status:** PENDING

---
"""
            
            # Insert after "## Active Handoffs"
            if "## Active Handoffs" in content:
                parts = content.split("## Active Handoffs")
                new_content = parts[0] + "## Active Handoffs\n" + handoff_entry + parts[1].split("\n", 1)[1]
                
                with open(handoffs_path, "w") as f:
                    f.write(new_content)
                
                return {"success": True, "handoff_id": ho_id, "to": to_pm}
            else:
                return {"error": "Could not find Active Handoffs section"}
        except Exception as e:
            return {"error": f"Failed to create handoff: {str(e)}"}
    
    def _tool_log_work(self, summary: str, details: str = None, files_changed: List[str] = None) -> Dict[str, Any]:
        """Log work for daily report."""
        self.work_log.append({
            "timestamp": datetime.now().isoformat(),
            "summary": summary,
            "details": details,
            "files_changed": files_changed or []
        })
        
        return {"success": True, "logged": summary}
    
    def get_work_log(self) -> List[Dict[str, Any]]:
        """Get all logged work."""
        return self.work_log
