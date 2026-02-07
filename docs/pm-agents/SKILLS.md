# PM Skills Reference

> **Purpose:** Master reference for all skills available to PM agents
> **Last Updated:** 2026-02-07

---

## Feature Development Workflow

### `/feature-dev` Plugin
**When to Use:** Big features (3+ files, architectural decisions, complex integrations)

**7-Phase Workflow:**
1. Discovery - Understand requirements
2. Codebase Exploration - Use code-explorer agents
3. Clarifying Questions - Ask about ambiguities
4. Architecture Design - Use code-architect agents
5. Implementation - Build the feature
6. Quality Review - Use code-reviewer agents
7. Summary - Document completion

**Location:** `plugins/feature-dev/README.md`

### `smart-agent-brainstorming` Skill
**When to Use:** Small updates (single component, UI tweaks, incremental improvements)

**Process:**
- Ask questions one at a time
- Present design in 200-300 word sections
- Get validation before proceeding
- Save validated design to `docs/plans/`

**Location:** `.claude/skills/smart-agent-brainstorming/SKILL.md`

---

## All PMs (Planning & Execution)

| Skill | When to Use | Location |
|-------|-------------|----------|
| `smart-agent-writing-plans` | Create implementation plans | `.claude/skills/smart-agent-writing-plans/SKILL.md` |
| `smart-agent-executing-plans` | Execute plans with checkpoints | `.claude/skills/smart-agent-executing-plans/SKILL.md` |

---

## PM-Specific Skills

### PM-Intelligence (AI & Intelligence)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-ai-chat` | Reference AI chat implementation patterns |

### PM-Experience (UI/UX)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-ui-ux` | Design systems, color palettes, typography |
| `smart-agent-responsive` | Mobile-first responsive layouts (Tailwind) |
| `smart-agent-mobile-design` | Mobile-first engineering |
| `smart-agent-mobile-ios` | iOS Human Interface Guidelines |
| `smart-agent-mobile-android` | Material Design 3 |
| `smart-agent-copywriting` | UX microcopy, CTAs, error messages |

### PM-QA (Testing & Quality)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-browser-automation` | Browser automation for E2E tests |
| `smart-agent-browser-qa` | Browser-based QA testing |
| `smart-agent-continuous-tester` | Continuous testing strategies |
| `smart-agent-qa-mobile` | Mobile QA strategy |
| `smart-agent-qa-orchestrator` | QA orchestration |
| `smart-agent-debugger` | Debugging strategies |
| `smart-agent-audit` | Website audits (SEO, performance, security, a11y) |

### PM-Infrastructure (DevOps & Performance)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-audit` | Performance audits |
| `smart-agent-debugger` | Debugging performance issues |
| `smart-agent-mobile-debugging` | Mobile-specific debugging |

### PM-Growth (Business & Monetization)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-copywriting` | Marketing copy, pricing pages, CTAs |
| `smart-agent-social` | Social media content |

### PM-Research (R&D)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-brainstorming` | Feature brainstorming (use before planning) |

### PM-Integration (External APIs)
| Skill | When to Use |
|-------|-------------|
| `smart-agent-mcp` | Build MCP servers for AI agent integration |

---

## Decision Framework

**Use `/feature-dev` when:**
- ✅ Feature touches 3+ files
- ✅ Requires architectural decisions
- ✅ Complex integration with existing code
- ✅ Requirements are unclear or need exploration
- ✅ Multi-phase implementation needed

**Use `smart-agent-brainstorming` when:**
- ✅ Single component or small feature
- ✅ UI/UX improvements
- ✅ Incremental enhancements
- ✅ Clear requirements but need design validation
- ✅ Quick iteration needed

**Use direct implementation when:**
- ✅ Single-line bug fixes
- ✅ Trivial changes (typos, formatting)
- ✅ Well-defined, simple tasks (< 1 hour)
- ✅ Urgent hotfixes

---

## How to Use Skills

1. **Read the skill file** - Each skill has detailed instructions
2. **Check if skill applies** - Use decision framework above
3. **Invoke skill** - Use command or follow skill instructions
4. **Report usage** - Note which skills you used in work summary

---

*This document is maintained by PM-Orchestrator. PMs should reference this when choosing development methods.*
