// Limrun mobile preview links for pending operator review.
// https://docs.limrun.com/docs

const LIMRUN_API = "https://api.limrun.com";

export interface LimrunPreview {
  instanceId: string;
  previewUrl: string;
}

interface IosInstanceResponse {
  id?: string;
  metadata?: {
    id: string;
    organizationId?: string;
  };
  status?: {
    streamUrl?: string;
    signedStreamUrl?: string;
    endpointWebSocketUrl?: string;
    token?: string;
    state?: string;
  };
}

function instanceId(data: IosInstanceResponse): string {
  return data.metadata?.id ?? data.id ?? "";
}

function streamUrl(data: IosInstanceResponse): string | null {
  return data.status?.signedStreamUrl ?? data.status?.streamUrl ?? null;
}

function getLimApiKey(): string | null {
  return process.env.LIM_API_KEY?.trim() || null;
}

export function isLimrunConfigured(): boolean {
  return Boolean(getLimApiKey() || process.env.LIMRUN_INSTANCE_ID?.trim());
}

/** Only provision previews for ops that benefit from mobile review. */
export function shouldAttachPreview(action: {
  status: string;
  requires_approval: boolean;
  severity: string;
}): boolean {
  if (action.status !== "pending" || !action.requires_approval) return false;
  if (!isLimrunConfigured()) return false;
  const minSeverity = (process.env.LIMRUN_MIN_SEVERITY || "medium").toLowerCase();
  const order = ["safe", "low", "medium", "high", "critical"];
  const idx = order.indexOf(action.severity);
  const minIdx = order.indexOf(minSeverity);
  return idx >= 0 && minIdx >= 0 && idx >= minIdx;
}

async function limrunFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const key = getLimApiKey();
  if (!key) throw new Error("LIM_API_KEY not configured");

  const resp = await fetch(`${LIMRUN_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(text || `Limrun API error (${resp.status})`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function getExistingInstance(id: string): Promise<LimrunPreview | null> {
  try {
    const data = await limrunFetch<IosInstanceResponse>(`/v1/ios_instances/${encodeURIComponent(id)}`);
    const url = streamUrl(data);
    const resolvedId = instanceId(data);
    if (!url || !resolvedId) return null;
    return { instanceId: resolvedId, previewUrl: url };
  } catch {
    return null;
  }
}

async function createIosInstance(): Promise<LimrunPreview> {
  const data = await limrunFetch<IosInstanceResponse>("/v1/ios_instances", {
    method: "POST",
    body: JSON.stringify({ wait: true }),
  });
  const url = streamUrl(data);
  const resolvedId = instanceId(data);
  if (!url || !resolvedId) {
    throw new Error("Limrun instance created but no stream URL returned");
  }
  return { instanceId: resolvedId, previewUrl: url };
}

/** Resolve a signed stream URL — reuse LIMRUN_INSTANCE_ID or create a new instance. */
export async function resolvePreviewUrl(): Promise<LimrunPreview | null> {
  const reuseId = process.env.LIMRUN_INSTANCE_ID?.trim();
  if (reuseId) {
    const existing = await getExistingInstance(reuseId);
    if (existing) return existing;
  }

  if (!getLimApiKey()) return null;
  return createIosInstance();
}
