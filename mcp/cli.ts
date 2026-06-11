#!/usr/bin/env node
// ForgeGuard MCP server CLI.
//
//   forgeguard-mcp                                  # stdio, in-memory demo backend
//   forgeguard-mcp --database-url postgres://...    # stdio, any Postgres
//   forgeguard-mcp --http 8787                      # Streamable HTTP on :8787
//
// Flags:
//   --database-url <url>   Postgres connection string (backend + audit store)
//   --backend <kind>       memory | postgres | insforge (default: inferred)
//   --store <kind>         memory | postgres | insforge (default: follows backend)
//   --agent <name>         agent label on audit rows (default: mcp-agent)
//   --http [port]          serve Streamable HTTP instead of stdio (default 8787)
//   --config <path>        path to forgeguard.config.json

import { createServer } from "http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildForgeGuardServer } from "./server";

interface CliOptions {
  http: number | null;
  agent?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { http: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--database-url": {
        const url = next();
        if (url) {
          process.env.FORGEGUARD_DATABASE_URL = url;
          if (!process.env.FORGEGUARD_BACKEND) process.env.FORGEGUARD_BACKEND = "postgres";
          if (!process.env.FORGEGUARD_STORE) process.env.FORGEGUARD_STORE = "postgres";
        }
        break;
      }
      case "--backend":
        process.env.FORGEGUARD_BACKEND = next();
        break;
      case "--store":
        process.env.FORGEGUARD_STORE = next();
        break;
      case "--agent":
        options.agent = next();
        break;
      case "--config":
        process.env.FORGEGUARD_CONFIG = next();
        break;
      case "--http": {
        const peek = argv[i + 1];
        options.http = peek && /^\d+$/.test(peek) ? Number(next()) : 8787;
        break;
      }
      case "--help":
      case "-h":
        console.error(
          [
            "ForgeGuard MCP server — guarded middle layer between AI agents and your data.",
            "",
            "Usage: forgeguard-mcp [--database-url <url>] [--backend memory|postgres|insforge]",
            "                      [--store memory|postgres|insforge] [--agent <name>]",
            "                      [--http [port]] [--config <path>]",
          ].join("\n"),
        );
        process.exit(0);
    }
  }
  return options;
}

async function runStdio(options: CliOptions): Promise<void> {
  const server = buildForgeGuardServer({ agent: options.agent });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[ForgeGuard] MCP server on stdio · backend=${process.env.FORGEGUARD_BACKEND || "memory"} store=${process.env.FORGEGUARD_STORE || "memory"}`,
  );
}

async function runHttp(options: CliOptions, port: number): Promise<void> {
  const httpServer = createServer((req, res) => {
    void (async () => {
      if (req.method !== "POST" || !req.url?.startsWith("/mcp")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "POST /mcp only" }));
        return;
      }
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
          : undefined;

        // Stateless mode: one server/transport pair per request.
        const server = buildForgeGuardServer({ agent: options.agent });
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        res.on("close", () => {
          void transport.close();
          void server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
      } catch (err) {
        console.error("[ForgeGuard] HTTP request failed:", err);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "internal error" }));
        }
      }
    })();
  });

  httpServer.listen(port, () => {
    console.error(
      `[ForgeGuard] MCP server on http://localhost:${port}/mcp · backend=${process.env.FORGEGUARD_BACKEND || "memory"} store=${process.env.FORGEGUARD_STORE || "memory"}`,
    );
  });
}

const options = parseArgs(process.argv.slice(2));
const entry = options.http != null ? runHttp(options, options.http) : runStdio(options);
entry.catch((err) => {
  console.error("[ForgeGuard] fatal:", err);
  process.exit(1);
});
