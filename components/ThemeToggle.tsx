"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("forgeguard-theme") as Theme | null;
    const initial =
      stored ??
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("forgeguard-theme", next);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted ${className}`}
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
