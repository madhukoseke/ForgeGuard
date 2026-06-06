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
import {
  parseFunctionDeploy,
  parseStorageConfig,
  isSqlStatement,
} from "./op-payload";
import type { AgentAction } from "./types";

export interface RollbackSnapshot {
  compensating_sql: string;
  applied_sql: string;
  mode:
    | "simulated"
    | "insforge"
    | "migrations"
    | "branch"
    | "function"
    | "storage"
    | "auth";
  branch?: string;
  migration_version?: string;
  migration_name?: string;
  storage_bucket?: string;
  storage_was_public?: boolean;
  storage_created?: boolean;
  function_slug?: string;
  function_existed?: boolean;
  function_previous?: {
    name?: string;
    code?: string;
    description?: string;
    status?: string;
  } | null;
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

async function applyAuthConfigLive(action: AgentAction): Promise<ExecuteResult> {
  if (!isSqlStatement(action.statement)) {
    return {
      applied: false,
      rollback_ref: "",
      error: "auth.config expects SQL (e.g. ALTER TABLE ... RLS)",
    };
  }

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
      error: "No compensating SQL for this auth.config statement",
    };
  }

  try {
    await client.runRawSql(statement);
    return {
      applied: true,
      rollback_ref: serializeRollback(
        snapshotFor(action, compensating, { mode: "auth" }),
      ),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: "", error: msg };
  }
}

async function rollbackAuthConfigLive(action: AgentAction): Promise<ExecuteResult> {
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
    await client.runRawSql(snapshot.compensating_sql);
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: msg };
  }
}

async function applyStorageConfigLive(action: AgentAction): Promise<ExecuteResult> {
  const payload = parseStorageConfig(action.statement);
  if (!payload) {
    return {
      applied: false,
      rollback_ref: "",
      error: "storage.config expects JSON: { \"bucket\": \"name\", \"public\": true }",
    };
  }

  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: "", error: "InsForge not configured" };
  }

  const targetPublic = payload.public ?? payload.isPublic;
  if (typeof targetPublic !== "boolean") {
    return {
      applied: false,
      rollback_ref: "",
      error: "storage.config requires \"public\" or \"isPublic\" boolean",
    };
  }

  try {
    const buckets = await client.listBuckets();
    const existed = buckets.includes(payload.bucket);
    let wasPublic = !targetPublic;

    if (payload.create || !existed) {
      await client.createBucket(payload.bucket, targetPublic);
      wasPublic = false;
    } else {
      await client.updateBucketVisibility(payload.bucket, targetPublic);
    }

    return {
      applied: true,
      rollback_ref: serializeRollback({
        compensating_sql: JSON.stringify({ bucket: payload.bucket, public: wasPublic }),
        applied_sql: action.statement.trim(),
        mode: "storage",
        storage_bucket: payload.bucket,
        storage_was_public: wasPublic,
        storage_created: !existed || payload.create === true,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: "", error: msg };
  }
}

async function rollbackStorageConfigLive(action: AgentAction): Promise<ExecuteResult> {
  const snapshot = parseRollbackRef(action.rollback_ref);
  if (!snapshot?.storage_bucket) {
    return {
      applied: false,
      rollback_ref: action.rollback_ref ?? "",
      error: "No storage rollback snapshot on this action",
    };
  }

  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: "InsForge not configured" };
  }

  try {
    if (snapshot.storage_created) {
      await client.deleteBucket(snapshot.storage_bucket);
    } else if (typeof snapshot.storage_was_public === "boolean") {
      await client.updateBucketVisibility(snapshot.storage_bucket, snapshot.storage_was_public);
    }
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: msg };
  }
}

async function applyFunctionDeployLive(action: AgentAction): Promise<ExecuteResult> {
  const payload = parseFunctionDeploy(action.statement);
  if (!payload) {
    return {
      applied: false,
      rollback_ref: "",
      error: "function.deploy expects JSON: { \"slug\": \"name\", \"code\": \"...\" }",
    };
  }

  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: "", error: "InsForge not configured" };
  }

  try {
    const existing = await client.getFunction(payload.slug);
    if (existing) {
      await client.updateFunction(payload.slug, {
        name: payload.name ?? existing.name,
        code: payload.code,
        description: payload.description ?? existing.description,
        status: payload.status ?? existing.status ?? "active",
      });
    } else {
      await client.createFunction({
        slug: payload.slug,
        name: payload.name ?? payload.slug,
        code: payload.code,
        description: payload.description,
        status: payload.status ?? "active",
      });
    }

    return {
      applied: true,
      rollback_ref: serializeRollback({
        compensating_sql: "",
        applied_sql: action.statement.trim(),
        mode: "function",
        function_slug: payload.slug,
        function_existed: Boolean(existing),
        function_previous: existing
          ? {
              name: existing.name,
              code: existing.code,
              description: existing.description,
              status: existing.status,
            }
          : null,
      }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: "", error: msg };
  }
}

async function rollbackFunctionDeployLive(action: AgentAction): Promise<ExecuteResult> {
  const snapshot = parseRollbackRef(action.rollback_ref);
  if (!snapshot?.function_slug) {
    return {
      applied: false,
      rollback_ref: action.rollback_ref ?? "",
      error: "No function rollback snapshot on this action",
    };
  }

  const client = InsForgeClient.fromEnv();
  if (!client) {
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: "InsForge not configured" };
  }

  try {
    if (snapshot.function_existed && snapshot.function_previous?.code) {
      await client.updateFunction(snapshot.function_slug, {
        name: snapshot.function_previous.name,
        code: snapshot.function_previous.code,
        description: snapshot.function_previous.description,
        status: snapshot.function_previous.status ?? "active",
      });
    } else {
      await client.deleteFunction(snapshot.function_slug);
    }
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { applied: false, rollback_ref: action.rollback_ref ?? "", error: msg };
  }
}

function simulatedResult(action: AgentAction): ExecuteResult {
  return {
    applied: true,
    rollback_ref: serializeRollback({
      compensating_sql: buildCompensatingSql(action.statement) ?? "",
      applied_sql: action.statement,
      mode: "simulated",
    }),
  };
}

export async function applyOp(action: AgentAction): Promise<ExecuteResult> {
  const mode = getExecutorMode();

  if (mode === "simulated") {
    return simulatedResult(action);
  }

  switch (action.action_type) {
    case "db.migration": {
      const compensating = buildCompensatingSql(action.statement);
      if (!compensating) {
        return {
          applied: false,
          rollback_ref: "",
          error: "No compensating SQL for this statement",
        };
      }
      return applyDbMigrationLive(action);
    }
    case "auth.config":
      return applyAuthConfigLive(action);
    case "storage.config":
      return applyStorageConfigLive(action);
    case "function.deploy":
      return applyFunctionDeployLive(action);
    default:
      return {
        applied: false,
        rollback_ref: "",
        error: `${action.action_type} apply is not implemented yet`,
      };
  }
}

export async function rollbackOp(action: AgentAction): Promise<ExecuteResult> {
  const mode = getExecutorMode();

  if (mode === "simulated") {
    return { applied: true, rollback_ref: action.rollback_ref ?? "" };
  }

  switch (action.action_type) {
    case "db.migration":
      return rollbackDbMigrationLive(action);
    case "auth.config":
      return rollbackAuthConfigLive(action);
    case "storage.config":
      return rollbackStorageConfigLive(action);
    case "function.deploy":
      return rollbackFunctionDeployLive(action);
    default:
      return {
        applied: false,
        rollback_ref: action.rollback_ref ?? "",
        error: `${action.action_type} rollback is not implemented yet`,
      };
  }
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
