# ForgeGuard 0.3.0 — first open-source release

**ForgeGuard is the open-source guardrail layer between AI agents and your data.**

Agents connect via MCP. Every query and write flows through policy checks, prompt-injection scanning, destructive-statement detection, and a full audit trail with human approval.

## Highlights

- MCP tools: `query`, `execute`, backend ops with approval flow
- Works with any Postgres, InsForge, or zero-credential demo mode
- Next.js operator dashboard with cinematic demo
- Apache-2.0

## Quick start

```bash
git clone https://github.com/madhukoseke/ForgeGuard.git
cd ForgeGuard && npm install
npm run dev   # → /dashboard
npx forgeguard-mcp   # after npm publish
```

## Links

- [README](../README.md)
- [STABLE_0.3.0.md](./STABLE_0.3.0.md)
- [SECURITY.md](../SECURITY.md)

Questions: [SUPPORT.md](../SUPPORT.md)
