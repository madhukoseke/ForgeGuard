import { getDataBackend } from "./backends";
import { getStore } from "./store";

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
