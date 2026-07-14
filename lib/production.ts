/** True when running on Vercel or NODE_ENV=production. */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  );
}

/**
 * When true, `/api/readiness` returns 503 if production config is unsafe.
 *
 * Defaults **on** in production. Set `FORGEGUARD_STRICT_CONFIG=0` (or `false` /
 * `no`) to opt out temporarily. Explicit `=1` / `true` / `yes` forces on in any
 * environment.
 */
export function isStrictConfig(): boolean {
  const v = process.env.FORGEGUARD_STRICT_CONFIG?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  if (v === "1" || v === "true" || v === "yes") return true;
  return isProduction();
}

/** Thrown when an explicitly requested durable store/backend lacks credentials. */
export class ForgeGuardConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeGuardConfigError";
  }
}
