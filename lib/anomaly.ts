// Advisory agent/session write-rate signals (Phase E).
// Surfaces bursty small writes in the verdict rationale; does not block by itself.

export interface AnomalySignal {
  rule: "write_burst";
  detail: string;
  writes: number;
  window_ms: number;
}

export interface AnomalyOptions {
  /** Max writes in the window before signalling. */
  write_burst_limit: number;
  /** Sliding window length in ms. */
  write_burst_window_ms: number;
}

const DEFAULTS: AnomalyOptions = {
  write_burst_limit: 20,
  write_burst_window_ms: 60_000,
};

const buckets = new Map<string, number[]>();

function keyOf(agent?: string | null, sessionId?: string | null): string {
  return `${agent?.trim() || "unknown"}::${sessionId?.trim() || "-"}`;
}

/** Test hook: clear in-memory counters. */
export function resetAnomalyState(): void {
  buckets.clear();
}

/**
 * Record a write attempt and return an advisory signal when the agent/session
 * exceeds the configured burst limit. Never throws.
 */
export function noteWriteAndDetect(
  agent?: string | null,
  sessionId?: string | null,
  opts: Partial<AnomalyOptions> = {},
): AnomalySignal | null {
  const limit = opts.write_burst_limit ?? DEFAULTS.write_burst_limit;
  const windowMs = opts.write_burst_window_ms ?? DEFAULTS.write_burst_window_ms;
  if (limit <= 0 || windowMs <= 0) return null;

  const key = keyOf(agent, sessionId);
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = (buckets.get(key) ?? []).filter((t) => t >= cutoff);
  prev.push(now);
  buckets.set(key, prev);

  if (prev.length < limit) return null;
  return {
    rule: "write_burst",
    detail: `Agent issued ${prev.length} writes in ${Math.round(windowMs / 1000)}s (advisory threshold ${limit}).`,
    writes: prev.length,
    window_ms: windowMs,
  };
}
