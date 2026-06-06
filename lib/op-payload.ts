// Parse JSON statements for non-SQL operation types.

export interface StorageConfigPayload {
  bucket: string;
  public?: boolean;
  isPublic?: boolean;
  create?: boolean;
}

export interface FunctionDeployPayload {
  slug: string;
  name?: string;
  code: string;
  description?: string;
  status?: "draft" | "active" | "error";
}

export function looksLikeJson(statement: string): boolean {
  const trimmed = statement.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

export function parseStorageConfig(statement: string): StorageConfigPayload | null {
  if (!looksLikeJson(statement)) return null;
  try {
    const parsed = JSON.parse(statement) as Record<string, unknown>;
    const bucket = typeof parsed.bucket === "string" ? parsed.bucket.trim() : "";
    if (!bucket) return null;
    const isPublic =
      typeof parsed.public === "boolean"
        ? parsed.public
        : typeof parsed.isPublic === "boolean"
          ? parsed.isPublic
          : undefined;
    return {
      bucket,
      public: isPublic,
      isPublic,
      create: parsed.create === true,
    };
  } catch {
    return null;
  }
}

export function parseFunctionDeploy(statement: string): FunctionDeployPayload | null {
  if (!looksLikeJson(statement)) return null;
  try {
    const parsed = JSON.parse(statement) as Record<string, unknown>;
    const slug = typeof parsed.slug === "string" ? parsed.slug.trim() : "";
    const code = typeof parsed.code === "string" ? parsed.code : "";
    if (!slug || !code) return null;
    return {
      slug,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      code,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      status:
        parsed.status === "draft" || parsed.status === "active" || parsed.status === "error"
          ? parsed.status
          : undefined,
    };
  } catch {
    return null;
  }
}

export function isSqlStatement(statement: string): boolean {
  return !looksLikeJson(statement);
}
