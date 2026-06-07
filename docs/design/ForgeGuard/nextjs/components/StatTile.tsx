"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

function useCountUp(value: number, ms = 480) {
  const [n, setN] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setN(Math.round(from + (to - from) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // rAF pauses when backgrounded — guarantee the final value still lands.
    const safety = setTimeout(() => setN(to), ms + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [value, ms]);
  return n;
}

export function StatTile({
  label,
  value,
  accent,
  num,
  foot,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: string;
  num: string;
  foot: string;
  icon: LucideIcon;
}) {
  const n = useCountUp(value);
  const [flash, setFlash] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="stat" style={{ ["--accent" as string]: accent, ["--num" as string]: num }}>
      <div className="stat-label">
        <Icon size={13} style={{ color: accent }} />
        {label}
      </div>
      <div className={"stat-val" + (flash ? " flash" : "")}>{n.toLocaleString()}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}
