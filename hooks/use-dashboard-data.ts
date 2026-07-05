"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActionSummary } from "@/lib/action-summary";
import { DEFAULT_ACTIONS_LIMIT } from "@/lib/list-params";
import type { AgentAction } from "@/lib/types";
import { fetchHealthStatus } from "@/components/dashboard/fetch-health";
import { fetchWithOperatorToken } from "@/components/dashboard/fetch";
import type {
  ActionsPagination,
  ActionsResponse,
  DemoOpMeta,
  HealthStatus,
} from "@/components/dashboard/types";
import { healthFetchIntervalMs, healthPollIntervalMs } from "@/components/dashboard/health-poll";

const EMPTY_SUMMARY: ActionSummary = {
  total: 0,
  blocked: 0,
  pending: 0,
  critical: 0,
  rolled_back: 0,
  filter_counts: {},
};

export function useDashboardData() {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [summary, setSummary] = useState<ActionSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<ActionsPagination | null>(null);
  const [ops, setOps] = useState<DemoOpMeta[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollNote, setPollNote] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const applyResponse = useCallback((data: ActionsResponse, append: boolean) => {
    const rows = data.actions ?? [];
    setActions((prev) => (append ? [...prev, ...rows] : rows));
    if (data.summary) setSummary(data.summary);
    if (data.pagination) setPagination(data.pagination);
    if (data.degraded && data.error) {
      setError(data.error);
    } else if (!data.degraded) {
      setError(null);
    }
  }, []);

  const fetchActions = useCallback(
    async (opts?: { offset?: number; append?: boolean }) => {
      const offset = opts?.offset ?? 0;
      const append = opts?.append ?? false;
      const url = `/api/actions?limit=${DEFAULT_ACTIONS_LIMIT}&offset=${offset}`;

      try {
        const res = await fetchWithOperatorToken(url, { cache: "no-store" });
        if (!res.ok) {
          setPollNote("poll dropped — showing last good state");
          setTimeout(() => setPollNote(null), 1600);
          return null;
        }
        const data = (await res.json()) as ActionsResponse;
        applyResponse(data, append);
        setPollNote(null);
        return data.actions as AgentAction[];
      } catch {
        setPollNote("poll dropped — showing last good state");
        setTimeout(() => setPollNote(null), 1600);
        return null;
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [applyResponse],
  );

  const refresh = useCallback(async () => {
    return fetchActions({ offset: 0, append: false });
  }, [fetchActions]);

  const loadMore = useCallback(async () => {
    if (!pagination?.has_more || loadingMore) return;
    setLoadingMore(true);
    await fetchActions({
      offset: pagination.offset + pagination.limit,
      append: true,
    });
  }, [fetchActions, loadingMore, pagination]);

  const refreshHealth = useCallback(async () => {
    const status = await fetchHealthStatus();
    if (status) setHealth(status);
  }, []);

  useEffect(() => {
    void refresh();
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => setOps(d.ops ?? []))
      .catch(() => {});

    void refreshHealth();
  }, [refresh, refreshHealth]);

  useEffect(() => {
    const intervalMs = healthFetchIntervalMs(health);
    const healthTimer = setInterval(() => void refreshHealth(), intervalMs);
    return () => clearInterval(healthTimer);
  }, [health, refreshHealth]);

  useEffect(() => {
    const pollMs = healthPollIntervalMs(health);
    const actionsTimer = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(actionsTimer);
  }, [refresh, health]);

  const runOp = useCallback(
    async (index: number): Promise<string | null> => {
      setBusy(`op-${index}`);
      setError(null);
      try {
        const res = await fetchWithOperatorToken("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ index }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return null;
        }
        await refresh();
        return typeof data.id === "string" ? data.id : null;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const tool = useCallback(
    async (action: "seed_all" | "seed_baseline" | "reset"): Promise<string | null> => {
      setBusy(action);
      setError(null);
      try {
        const res = await fetchWithOperatorToken("/api/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return null;
        }
        await refresh();
        return typeof data.id === "string" ? data.id : null;
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  return {
    actions,
    summary,
    pagination,
    ops,
    busy,
    setBusy,
    error,
    setError,
    pollNote,
    health,
    loading,
    loadingMore,
    refresh,
    loadMore,
    runOp,
    tool,
  };
}
