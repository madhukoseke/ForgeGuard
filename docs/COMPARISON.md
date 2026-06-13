# Direct DB access vs ForgeGuard-mediated access

| Aspect | Direct agent → Postgres | ForgeGuard MCP/HTTP |
|--------|-------------------------|---------------------|
| Audit trail | None by default | Every read/write logged |
| Destructive SQL | Executes immediately | Held for approval when risky |
| Prompt injection in results | Returned to agent | Scanned and redacted |
| Read policy | DB grants only | Config + DB grants |
| Rollback | Manual | Compensating SQL + dashboard |
| Latency | Lower | Extra hop + classification |
| Ops complexity | Lower | Operator token, store, dashboard |

ForgeGuard complements — does not replace — least-privilege database roles and RLS.
