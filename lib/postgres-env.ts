/** Postgres connection string from env (`FORGEGUARD_DATABASE_URL` wins over `DATABASE_URL`). */
export function postgresConnectionUrl(): string | undefined {
  return (
    process.env.FORGEGUARD_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    undefined
  );
}

export function hasPostgresConnectionUrl(): boolean {
  return Boolean(postgresConnectionUrl());
}
