---
name: smart-agent-mcp
description: Build Model Context Protocol (MCP) servers to expose Smart Agent's capabilities to AI agents for autonomous development
---

# MCP Builder

**When to Use:** Build Model Context Protocol (MCP) servers to expose Smart Agent's capabilities to AI agents (Claude, Copilot) for autonomous development and operations.

## Purpose

Create custom MCP servers that allow AI agents to interact with Smart Agent's backend, database, and deployment infrastructure.

## Framework

**TypeScript MCP SDK** (recommended for Smart Agent - matches our stack)

```bash
npm install @modelcontextprotocol/sdk
```

## Potential MCP Servers for Smart Agent

### 1. Smart Agent Dev MCP (Recommended)

```typescript
// Tools to expose:
- list_documents(tenant_id) → Get documents for analysis
- query_database(table, filters) → Read Supabase tables
- run_migration(migration_file) → Execute database migrations
- deploy_edge_function(function_name) → Deploy to Supabase
- check_build_status() → Get CI/CD status
- read_logs(function_name, limit) → Get edge function logs
- create_test_data(type) → Seed test data for development
```

### 2. Supabase MCP (If one doesn't already exist)

```typescript
// Tools to expose:
- query(table, select, filters) → Run Supabase queries
- insert(table, data) → Insert records
- update(table, id, data) → Update records
- call_rpc(function_name, params) → Call database functions
- get_schema(table) → Get table structure
- check_rls(table) → Validate RLS policies
```

## Building Your MCP

### Step 1: Create Project

```bash
mkdir smart-agent-mcp
cd smart-agent-mcp
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
```

### Step 2: Create Server

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'smart-agent-dev',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_database',
        description: 'Query Smart Agent database tables',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            select: { type: 'string', description: 'Columns to select' },
            filters: { type: 'object', description: 'Filter conditions' },
          },
          required: ['table'],
        },
      },
      // Add more tools...
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'query_database':
      // Implement Supabase query
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 3: Configure in Claude Code

Add to `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "smart-agent-dev": {
      "command": "node",
      "args": ["/path/to/smart-agent-mcp/dist/index.js"]
    }
  }
}
```

### Step 4: Test

Claude Code will now have access to your custom tools.

## Autonomous Development Capabilities

With a Smart Agent Dev MCP, AI agents could:
- ✅ Read current project structure and database schema
- ✅ Query production data for debugging
- ✅ Run database migrations
- ✅ Deploy edge functions
- ✅ Monitor logs and errors
- ✅ Create test data
- ⚠️ **Cannot**: Directly modify code files (would need file system MCP)
- ⚠️ **Cannot**: Run git commands (would need separate git MCP)

## Recommendation

Build a **read-only Smart Agent MCP first** (query database, read logs, check status) before adding write operations. This minimizes risk while providing valuable development tools.

## Implementation Checklist

### Phase 1: Read-Only Tools
- [ ] query_database - Query any table with filters
- [ ] get_schema - Get table structure
- [ ] read_logs - Get edge function logs
- [ ] check_build - Get CI status
- [ ] list_migrations - Show applied migrations

### Phase 2: Safe Write Tools
- [ ] create_test_data - Seed test/demo data
- [ ] run_migration - Apply pending migrations
- [ ] clear_cache - Clear Redis/React Query cache

### Phase 3: Deployment Tools
- [ ] deploy_function - Deploy edge function
- [ ] rollback_function - Revert deployment
- [ ] trigger_build - Start CI pipeline

## Security Considerations

- Use environment variables for credentials
- Implement rate limiting
- Log all operations for audit
- Restrict to development/staging environments
- Never expose production write access without approval

## Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)

**Note:** This skill provides MCP server building patterns. Use to **extend AI agent capabilities** for Smart Agent development workflows. Start read-only, add write capabilities carefully, and always log operations for security.
