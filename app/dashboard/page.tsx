"use client";

import { useCallback, useState } from "react";
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
            reviewed_by: "operator",
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
      <ConnectionStatus health={health} />
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
        busy={busy}
        loading={loading}
        hasMore={pagination?.has_more ?? false}
        loadingMore={loadingMore}
        onFilterChange={setFilter}
        onReview={review}
        onLoadMore={() => void loadMore()}
      />

      <ToastStack toasts={toasts} />
    </main>
  );
}
