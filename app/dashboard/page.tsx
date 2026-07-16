"use client";

import { useCallback, useState } from "react";
import type { ActionQuery } from "@/lib/action-query";
import type { AgentAction } from "@/lib/types";
import { ActionsSection } from "@/components/dashboard/ActionsSection";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { SimulatorSection } from "@/components/dashboard/SimulatorSection";
import { ToastStack } from "@/components/dashboard/ToastStack";
import { fetchWithOperatorToken } from "@/components/dashboard/fetch";
import { useCinematicDemo } from "@/hooks/use-cinematic-demo";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useDashboardKeyboard } from "@/hooks/use-dashboard-keyboard";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState<ActionQuery>({});
  const { toasts, toast } = useToast();

  const {
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
    refreshHealth,
    loadMore,
    runOp,
    tool,
  } = useDashboardData();

  const review = useCallback(
    async (
      id: string,
      decision: string,
      applySafer = false,
    ): Promise<boolean> => {
      setBusy(id);
      setError(null);
      try {
        const res = await fetchWithOperatorToken(`/api/actions/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision,
            ...(decision === "approve" && applySafer ? { apply_safer: true } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Request failed with ${res.status}`);
          return false;
        }
        await refresh();
        const action = data.action as AgentAction | undefined;
        if (decision === "approve") {
          toast(
            action?.applied_safer
              ? "Approved · safer SQL applied"
              : "Approved & applied",
          );
        } else if (decision === "reject") {
          toast("Change rejected");
        } else {
          toast("Rolled back");
        }
        return true;
      } finally {
        setBusy(null);
      }
    },
    [refresh, setBusy, setError, toast],
  );

  const bulkReview = useCallback(
    async (ids: string[], decision: "approve" | "reject") => {
      if (ids.length === 0) return;
      setBusy(`bulk-${decision}`);
      setError(null);
      let ok = 0;
      try {
        for (const id of ids) {
          const res = await fetchWithOperatorToken(`/api/actions/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              decision,
              ...(decision === "approve" ? { apply_safer: true } : {}),
            }),
          });
          if (res.ok) ok += 1;
        }
        await refresh();
        toast(
          decision === "approve"
            ? `Approved ${ok}/${ids.length}`
            : `Rejected ${ok}/${ids.length}`,
        );
      } finally {
        setBusy(null);
      }
    },
    [refresh, setBusy, setError, toast],
  );

  const { demo, runCinematicDemo, cancelDemo } = useCinematicDemo({
    actions,
    refresh,
    runOp,
    tool,
    review,
    toast,
  });

  useDashboardKeyboard({
    actions,
    opsCount: ops.length,
    runOp: (index) => void runOp(index),
    runCinematicDemo: () => void runCinematicDemo(),
    tool: (action) => void tool(action),
    review: (id, decision, applySafer) => void review(id, decision, applySafer),
  });

  return (
    <main className="mx-auto max-w-2xl px-6 pb-32 pt-24">
      <ConnectionStatus
        health={health}
        onRefresh={() => {
          void refreshHealth();
          void refresh();
        }}
      />
      <header className="mb-10">
        <h1 className="text-lg font-medium tracking-tight">Operator dashboard</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Simulated agent ops through the same guard pipeline. Press{" "}
          <kbd className="font-mono text-xs">D</kbd> or Run demo — no credentials
          needed.
        </p>
      </header>
      <DashboardStats summary={summary} />

      <SimulatorSection
        ops={ops}
        busy={busy}
        demoRunning={demo.running}
        demoStep={demo.step}
        error={error}
        pollNote={pollNote}
        onRunDemo={() => void runCinematicDemo()}
        onSeedAll={() => void tool("seed_all")}
        onReset={() => {
          cancelDemo();
          void tool("reset");
        }}
        onRunOp={(index) => void runOp(index)}
      />

      <ActionsSection
        actions={actions}
        summary={summary}
        filter={filter}
        query={query}
        busy={busy}
        loading={loading}
        hasMore={pagination?.has_more ?? false}
        loadingMore={loadingMore}
        onFilterChange={setFilter}
        onQueryChange={(patch) => setQuery((prev) => ({ ...prev, ...patch }))}
        onReview={review}
        onBulkReview={(ids, decision) => void bulkReview(ids, decision)}
        onLoadMore={() => void loadMore()}
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
