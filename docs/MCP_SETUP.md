# MCP client setup

ForgeGuard exposes an MCP server as `forgeguard-mcp` (stdio by default) or Streamable HTTP.

## Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "forgeguard": {
      "command": "npx",
      "args": [
        "forgeguard-mcp",
        "--database-url", "postgres://user:pass@localhost:5432/mydb",
        "--agent", "claude-desktop"
      ]
    }
  }
}
```

For local development without publishing:

```json
{
  "mcpServers": {
    "forgeguard": {
      "command": "npm",
      "args": ["run", "mcp", "--prefix", "/path/to/ForgeGuard"]
    }
  }
}
```

## Cursor

Add to Cursor MCP settings (`.cursor/mcp.json` or Settings → MCP):

```json
{
  "mcpServers": {
    "forgeguard": {
      "command": "npx",
      "args": [
        "forgeguard-mcp",
        "--database-url", "postgres://user:pass@localhost:5432/mydb",
        "--agent", "cursor"
      ]
    }
  }
}
```

## Streamable HTTP

Run the server on a port:

```bash
npx forgeguard-mcp --http 8787 --database-url postgres://...
```

Connect MCP clients that support Streamable HTTP to `http://localhost:8787/mcp`.

## Demo mode (no database)

```bash
npx forgeguard-mcp
# or: npm run mcp
```

Uses in-memory backend with seeded `users` table.

## Policy file

Optional read-side policy:

```bash
npx forgeguard-mcp --config /path/to/forgeguard.config.json --database-url postgres://...
```

Copy from [`forgeguard.config.example.json`](../forgeguard.config.example.json).

## Tools available

| Tool | Purpose |
|------|---------|
| `query` | Read-only SQL with policy + injection scan |
| `execute` | Writes/DDL with guard + approval flow |
| `list_tables` / `describe_table` | Schema introspection |
| `get_action_status` | Poll pending op outcome |

Backend-change ops (`db.migration`, `function.deploy`, `storage.config`, `auth.config`) are not MCP tools — call `POST /api/guard/op` (or the dashboard). The audit trail is `GET /api/actions`.

See [STABLE_0.3.0.md](./STABLE_0.3.0.md) for stability notes.

## Postgres backend

Point `--database-url` at any Postgres instance. Local Docker setup: [POSTGRES_QUICKSTART.md](./POSTGRES_QUICKSTART.md).

## Troubleshooting

Dev server workspace detection, stale caches, and operator token issues: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
