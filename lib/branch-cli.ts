// Optional InsForge CLI branch workflow for local/dev hybrid rollback.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

function isBenignParentSwitchError(message: string): boolean {
  return /already on parent|not on a branch|parent project/i.test(message);
}

function hasInsForgeProjectLink(): boolean {
  return existsSync(join(process.cwd(), ".insforge", "project.json"));
}

function isBranchContextError(message: string): boolean {
  return /switched to a branch|switch --parent/i.test(message);
}

function isParentBackupError(message: string): boolean {
  return /parent backup|re-link the directory/i.test(message);
}

export function isBranchCliFallbackError(message: string): boolean {
  return isBranchContextError(message) || isParentBackupError(message);
}

export { isBranchContextError };

export async function relinkParentProject(): Promise<void> {
  if (process.env.VERCEL) return;
  const projectPath = join(process.cwd(), ".insforge", "project.json");
  if (!existsSync(projectPath)) return;

  let projectId: string | undefined;
  try {
    const config = JSON.parse(readFileSync(projectPath, "utf8")) as {
      project_id?: string;
    };
    projectId = config.project_id;
  } catch {
    return;
  }
  if (!projectId) return;

  await runInsForgeCli(["link", "--project-id", projectId]);
}

export async function switchToParentBranch(): Promise<void> {
  if (process.env.VERCEL) return;
  if (!isBranchCliEnabled() && !hasInsForgeProjectLink()) return;

  async function runSwitch(): Promise<void> {
    await runInsForgeCli(["branch", "switch", "--parent"]);
  }

  try {
    await runSwitch();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isParentBackupError(msg)) {
      await relinkParentProject();
      await runSwitch();
      return;
    }
    if (!isBenignParentSwitchError(msg)) throw err;
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

  const createArgs = ["branch", "create", name, "--mode", mode];

  async function runCreate(): Promise<CliJsonResult> {
    await switchToParentBranch();
    return runInsForgeCli(createArgs);
  }

  let result: CliJsonResult;
  try {
    result = await runCreate();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isBranchContextError(msg)) throw err;
    // Stale branch checkout from a prior failed apply — reset context and retry once.
    result = await runCreate();
  }

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
  try {
    await runInsForgeCli(["branch", "merge", name]);
  } finally {
    await switchToParentBranch().catch(() => {});
  }
}

export async function resetBranch(name: string): Promise<void> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  try {
    await runInsForgeCli(["branch", "reset", name]);
  } finally {
    await switchToParentBranch().catch(() => {});
  }
}

export async function deleteBranch(name: string): Promise<void> {
  if (!isBranchCliEnabled()) {
    throw new Error("Branch CLI mode is not enabled");
  }
  await runInsForgeCli(["branch", "delete", name]);
}
