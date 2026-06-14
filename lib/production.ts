/** True when running on Vercel or NODE_ENV=production. */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1"
  );
}

/** When set, /api/readiness returns 503 if production config is unsafe. */
export function isStrictConfig(): boolean {
  const v = process.env.FORGEGUARD_STRICT_CONFIG?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
