import { getAppVersion } from "./version";

export function forgeguardVersionHeaders(): HeadersInit {
  return { "X-ForgeGuard-Version": getAppVersion() };
}
