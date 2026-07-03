type EnvSnapshot = Record<string, string | undefined>;

export function snapshotEnv(keys: string[]): EnvSnapshot {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

export function restoreEnv(snapshot: EnvSnapshot): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else setEnv(key, value);
  }
}

export function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else (process.env as Record<string, string | undefined>)[key] = value;
}
