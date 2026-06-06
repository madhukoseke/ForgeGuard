// Optional InsForge CLI branch workflow for local/dev hybrid rollback.

import { spawn } from "node:child_process";
import { join } from "node:path";
import { isBranchCliEnabled } from "./insforge-client";

export interface BranchCreateResult {
  name: string;
  apiKey?: string;
  url?: string;
}

interface CliJsonResult {
  ok?: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

function parseCliOutput(stdout: string): CliJsonResult {
  const trimmed = stdout.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as CliJsonResult;
  } catch {
    return { ok: true, data: { raw: trimmed } };
  }
}

export async function runInsForgeCli(args: string[]): Promise<CliJsonResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["@insforge/cli", ...args, "--json", "--yes"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Avoid EACCES when ~/.npm/_cacache contains root-owned files.
          NPM_CONFIG_CACHE: join(process.cwd(), ".npm-cache"),
        },
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `CLI exited ${code}`));
        return;
      }
      resolve(parseCliOutput(stdout));
    });
  });
}

export function branchNameForAction(actionId: string): string {
  const short = actionId.replace(/-/g, "").slice(0, 12);
  return `forgeguard-${short}`;
}

export async function createBranch(
  name: string,
  mode: "full" | "schema-only" = "schema-only",
): Promise<BranchCreateResult> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  const result = await runInsForgeCli([
    "branch",
    "create",
    name,
    "--mode",
    mode,
  ]);
  const data = result.data ?? {};
  return {
    name,
    apiKey:
      typeof data.apiKey === "string"
        ? data.apiKey
        : typeof data.api_key === "string"
          ? data.api_key
          : undefined,
    url:
      typeof data.url === "string"
        ? data.url
        : typeof data.oss_host === "string"
          ? data.oss_host
          : undefined,
  };
}

export async function mergeBranch(name: string): Promise<void> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  await runInsForgeCli(["branch", "merge", name]);
}

export async function resetBranch(name: string): Promise<void> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  await runInsForgeCli(["branch", "reset", name]);
}

export async function deleteBranch(name: string): Promise<void> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  await runInsForgeCli(["branch", "delete", name]);
}
