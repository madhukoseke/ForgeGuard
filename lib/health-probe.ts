import { getDataBackend } from "./backends";
import type { BackendKind } from "./backends/types";
import { getInsForgeConfig, InsForgeClient } from "./insforge-client";
import { getStore, type StoreKind } from "./store";

export async function probeRuntimeHealth(): Promise<{
  store_reachable: boolean;
  backend_reachable: boolean;
}> {
  let store_reachable = true;
  try {
    await getStore().list();
  } catch {
    store_reachable = false;
  }

  let backend_reachable = true;
  try {
    backend_reachable = await getDataBackend().health();
  } catch {
    backend_reachable = false;
  }

  return { store_reachable, backend_reachable };
}

/** Reuse runtime probes when InsForge is the active store or backend. */
export function resolveInsforgeReachable(
  configured: boolean,
  snapshot: {
    store: StoreKind;
    backend: BackendKind;
    store_reachable: boolean;
    backend_reachable: boolean;
  },
  remoteReachable: boolean,
): boolean {
  if (!configured) return false;
  if (snapshot.store === "insforge") return snapshot.store_reachable;
  if (snapshot.backend === "insforge") return snapshot.backend_reachable;
  return remoteReachable;
}

/** Ping InsForge when only the executor (not store/backend) depends on it. */
export async function probeRemoteInsforgeReachable(snapshot: {
  store: StoreKind;
  backend: BackendKind;
}): Promise<boolean> {
  if (!getInsForgeConfig()) return false;
  if (snapshot.store === "insforge" || snapshot.backend === "insforge") {
    return false;
  }
  const client = InsForgeClient.fromEnv();
  if (!client) return false;
  try {
    return await client.healthCheck();
  } catch {
    return false;
  }
}
