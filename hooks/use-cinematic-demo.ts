"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentAction } from "@/lib/types";
import { sleep } from "@/components/dashboard/utils";

interface UseCinematicDemoOptions {
  actions: AgentAction[];
  refresh: () => Promise<AgentAction[] | null>;
  runOp: (index: number) => Promise<string | null>;
  tool: (action: "seed_all" | "seed_baseline" | "reset") => Promise<string | null>;
  review: (
    id: string,
    decision: string,
    applySafer?: boolean,
  ) => Promise<boolean>;
  toast: (message: string) => void;
}

export function useCinematicDemo({
  actions,
  refresh,
  runOp,
  tool,
  review,
  toast,
}: UseCinematicDemoOptions) {
  const [demo, setDemo] = useState({ running: false, step: 0 });
  const demoCancel = useRef(false);

  const runCinematicDemo = useCallback(async () => {
    if (demo.running) return;
    demoCancel.current = false;
    const stopDemo = () => setDemo({ running: false, step: 0 });
    const pause = async (ms: number) => {
      await sleep(ms);
      return demoCancel.current;
    };

    setDemo({ running: true, step: 0 });

    await tool("reset");
    if (await pause(400)) {
      stopDemo();
      return;
    }

    const baselineId = await tool("seed_baseline");
    if (await pause(900)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 1 });
    const dropId = await runOp(0);
    const afterDrop = await refresh();
    const dropAction = dropId ? afterDrop?.find((a) => a.id === dropId) : null;
    toast(`${(dropAction?.severity ?? "high").toUpperCase()} · data_loss intercepted`);
    if (await pause(2600)) {
      stopDemo();
      return;
    }

    await runOp(5);
    if (await pause(2400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 2 });
    const pendingDrop =
      dropId ??
      actions.find((a) => a.status === "pending" && a.statement.includes("DROP COLUMN"))
        ?.id;
    if (pendingDrop) await review(pendingDrop, "approve", true);
    if (await pause(2400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 3 });
    const latest = await refresh();
    const baseline =
      baselineId &&
      latest?.find(
        (a) =>
          a.id === baselineId &&
          (a.status === "applied" || a.status === "auto_allowed"),
      );
    if (baseline) await review(baseline.id, "rollback");
    if (await pause(1400)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 4 });
    const autoAllowId = await runOp(7);
    const afterAuto = await refresh();
    const autoAction = autoAllowId
      ? afterAuto?.find((a) => a.id === autoAllowId)
      : null;
    toast(
      autoAction?.status === "applied" || autoAction?.status === "auto_allowed"
        ? "Safe op auto-allowed"
        : "Auto-allow pending review",
    );
    if (await pause(2200)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 5 });
    const dropTableId = await runOp(2);
    if (await pause(2200)) {
      stopDemo();
      return;
    }

    setDemo({ running: true, step: 6 });
    const pendingDropTable =
      dropTableId ??
      (await refresh())?.find(
        (a) => a.status === "pending" && a.statement.includes("DROP TABLE"),
      )?.id;
    if (pendingDropTable) await review(pendingDropTable, "reject");
    if (await pause(1400)) {
      stopDemo();
      return;
    }

    await pause(400);
    setDemo({ running: false, step: 6 });
    toast("Demo complete");
  }, [actions, demo.running, refresh, review, runOp, toast, tool]);

  const cancelDemo = useCallback(() => {
    demoCancel.current = true;
  }, []);

  return { demo, runCinematicDemo, cancelDemo };
}
