// Public apply/rollback surface for API routes.

import { getExecutorMode, isInsForgeConfigured } from "./insforge-client";

export {
  applyOp,
  rollbackOp,
  buildCompensatingSql,
  parseRollbackRef,
  serializeRollback,
  branchCliHint,
} from "./executor";
export type { ExecuteResult, RollbackSnapshot } from "./executor";
export {
  getExecutorMode,
  isInsForgeConfigured,
  isBranchCliEnabled,
  InsForgeClient,
  getInsForgeConfig,
} from "./insforge-client";

export function executorIsLive(): boolean {
  return getExecutorMode() !== "simulated" && isInsForgeConfigured();
}
