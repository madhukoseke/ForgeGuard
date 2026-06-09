"use client";

import { useEffect } from "react";
import type { AgentAction } from "@/lib/types";

interface UseDashboardKeyboardOptions {
  actions: AgentAction[];
  opsCount: number;
  runOp: (index: number) => void;
  runCinematicDemo: () => void;
  tool: (action: "seed_all" | "reset") => void;
  review: (id: string, decision: string, applySafer?: boolean) => void;
}

export function useDashboardKeyboard({
  actions,
  opsCount,
  runOp,
  runCinematicDemo,
  tool,
  review,
}: UseDashboardKeyboardOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const k = e.key.toLowerCase();

      if (k >= "1" && k <= String(opsCount)) {
        void runOp(parseInt(k, 10) - 1);
        return;
      }
      if (k === "d") void runCinematicDemo();
      else if (k === "s") void tool("seed_all");
      else if (k === "x") void tool("reset");
      else if (k === "a") {
        const p = actions.find((a) => a.status === "pending");
        if (p) void review(p.id, "approve", !!p.safer_alternative);
      } else if (k === "r") {
        const ap = actions.find(
          (a) => a.status === "applied" || a.status === "auto_allowed",
        );
        if (ap) void review(ap.id, "rollback");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, opsCount, review, runCinematicDemo, runOp, tool]);
}
