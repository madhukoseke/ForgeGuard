"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface ToastItem {
  id: number;
  title: string;
  msg?: string;
  accent: string;
  icon: LucideIcon;
}

export function Toasts({ items, onDone }: { items: ToastItem[]; onDone: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <Toast key={t.id} t={t} onDone={onDone} />
      ))}
    </div>
  );
}

function Toast({ t, onDone }: { t: ToastItem; onDone: (id: number) => void }) {
  const [out, setOut] = useState(false);
  const Icon = t.icon;
  useEffect(() => {
    const a = setTimeout(() => setOut(true), 3200);
    const b = setTimeout(() => onDone(t.id), 3520);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [t.id, onDone]);
  return (
    <div className={"toast" + (out ? " out" : "")} style={{ ["--t-accent" as string]: t.accent }}>
      <span className="ti"><Icon size={16} /></span>
      <div className="toast-body">
        <div className="toast-title">{t.title}</div>
        {t.msg && <div className="toast-msg">{t.msg}</div>}
      </div>
    </div>
  );
}
