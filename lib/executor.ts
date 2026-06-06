// Apply approved ops and roll back applied ops against InsForge (or simulate).

import {
  branchNameForAction,
  createBranch,
  mergeBranch,
  resetBranch,
} from "./branch-cli";
import {
  InsForgeClient,
  getExecutorMode,
  isBranchCliEnabled,
  migrationVersion,
} from "./insforge-client";
import { inverseSql, migrationNameFromStatement } from "./inverse-sql";
import type { AgentAction } from "./types";

export interface RollbackSnapshot {
  compensating_sql: string;
  applied_sql: string;
  mode: "simulated" | "insforge" | "migrations" | "branch";
  branch?: string;
  migration_version?: string;
  migration_name?: string;
}

export interface ExecuteResult {
  applied: boolean;
  rollback_ref: string;
  branch?: string;
  error?: string;
}

export function buildCompensatingSql(statement: string): string | null {
  return inverseSql(statement);
}

export function serializeRollback(snapshot: RollbackSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseRollbackRef(ref: string | null): RollbackSnapshot | null {
  if (!ref?.trim()) return null;
  if (ref.startsWith("{")) {
    try {
      return JSON.parse(ref) as RollbackSnapshot;
    } catch {
      return null;
    }
  }
  // Legacy plain-SQL rollback_ref
  return {
    compensating_sql: ref,
    applied_sql: "",
    mode: "insforge",
  };
}

function snapshotFor(
  action: AgentAction,
  compensating: string,
  extra: Partial<RollbackSnapshot> = {},
): RollbackSnapshot {
  return {
    compensating_sql: compensating,
    applied_sql: action.statement.trim(),
    mode: extra.mode ?? (getExecutorMode() as RollbackSnapshot["mode"]),
    branch: extra.branch ?? action.branch ?? undefined,
    migration_version: extra.migration_version,
    migration_name: extra.migration_name,
  };
}

async function applyDbMigrationLive(action: AgentAction): Promise<ExecuteResult> {
  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: "", error: "InsForge not configured" };
  }

  const statement = action.statement.trim();
  const compensating = buildCompensatingSql(statement);
  if (!compensating) {
    return {
      applied: false,
      rollback_ref: "",
      error: "No compensating SQL for this statement",
    };
  }

  const mode = getExecutorMode();

  // Option B — InsForge CLI branches (local dev only).
  if (isBranchCliEnabled()) {
    const branch = branchNameForAction(action.id);
    try {
      const created = await createBranch(branch, "schema-only");
      const branchClient =
        created.url && created.apiKey
          ? new InsForgeClient({ url: created.url, key: created.apiKey })
          : client;

      if (mode === "migrations") {
        const version = migrationVersion();
        const name = `${migrationNameFromStatement(statement)}-${action.id.slice(0, 8)}`;
        await branchClient.createMigration({ version, name, sql: statement });
        await mergeBranch(branch);
        return {
          applied: true,
          branch,
          rollback_ref: serializeRollback(
            snapshotFor(action, compensating, {
              mode: "branch",
              branch,
              migration_version: version,
              migration_name: name,
            }),
          ),
        };
      }

      await branchClient.runRawSql(statement);
      await mergeBranch(branch);
      return {
        applied: true,
        branch,
        rollback_ref: serializeRollback(
          snapshotFor(action, compensating, { mode: "branch", branch }),
        ),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { applied: false, rollback_ref: "", error: msg };
    }
  }

  // Option A — direct apply on parent project.
  try {
    if (mode === "migrations") {
      const version = migrationVersion();
      const name = `${migrationNameFromStatement(statement)}-${action.id.slice(0, 8)}`;
      await client.createMigration({ version, name, sql: statement });
      return {
        applied: true,
        rollback_ref: serializeRollback(
          snapshotFor(action, compensating, {
            mode: "migrations",
            migration_version: version,
            migration_name: name,
          }),
        ),
      };
    }

    await client.runRawSql(statement);
    return {
      applied: true,
      rollback_ref: serializeRollback(
        snapshotFor(action, compensating, { mode: "insforge" }),
      ),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: "", error: msg };
  }
}

async function rollbackDbMigrationLive(action: AgentAction): Promise<ExecuteResult> {
  const snapshot = parseRollbackRef(action.rollback_ref);
  if (!snapshot?.compensating_sql) {
    return {
      applied: false,
      rollback_ref: action.rollback_ref ?? "",
      error: "No rollback snapshot on this action",
    };
  }

  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: "InsForge not configured" };
  }

  try {
    if (snapshot.mode === "branch" && snapshot.branch && isBranchCliEnabled()) {
      await resetBranch(snapshot.branch);
      return { applied: true, rollback_ref: action.rollback_ref ?? "" };
    }

    const mode = getExecutorMode();
    if (mode === "migrations") {
      const version = migrationVersion();
      const name = `rollback-${migrationNameFromStatement(snapshot.compensating_sql)}-${action.id.slice(0, 8)}`;
      await client.createMigration({
        version,
        name,
        sql: snapshot.compensating_sql,
      });
      return { applied: true, rollback_ref: action.rollback_ref ?? "" };
    }

    await client.runRawSql(snapshot.compensating_sql);
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: msg };
  }
}

export async function applyOp(action: AgentAction): Promise<ExecuteResult> {
  const mode = getExecutorMode();

  if (action.action_type !== "db.migration") {
    if (mode === "simulated") {
      return {
        applied: true,
        rollback_ref: serializeRollback({
          compensating_sql: "",
          applied_sql: action.statement,
          mode: "simulated",
        }),
      };
    }
    return {
      applied: false,
      rollback_ref: "",
      error: `${action.action_type} apply is not implemented yet`,
    };
  }

  const compensating = buildCompensatingSql(action.statement);
  if (mode === "simulated") {
    return {
      applied: true,
      rollback_ref: compensating ?? `pre-${action.branch ?? "branch"}`,
      branch: action.branch ?? undefined,
    };
  }

  if (!compensating) {
    return {
      applied: false,
      rollback_ref: "",
      error: "No compensating SQL for this statement",
    };
  }

  return applyDbMigrationLive(action);
}

export async function rollbackOp(action: AgentAction): Promise<ExecuteResult> {
  const mode = getExecutorMode();

  if (mode === "simulated") {
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  }

  if (action.action_type !== "db.migration") {
    return {
      applied: false,
      rollback_ref: action.rollback_ref ?? "",
      error: `${action.action_type} rollback is not implemented yet`,
    };
  }

  return rollbackDbMigrationLive(action);
}

/** CLI hints for operators when branch mode is manual. */
export function branchCliHint(branchName: string): string {
  return [
    `Branch "${branchName}":`,
    `  npx @insforge/cli branch create ${branchName} --mode full`,
    `  npx @insforge/cli branch merge ${branchName}`,
    `  npx @insforge/cli branch reset ${branchName}`,
  ].join("\n");
}
