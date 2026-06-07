import type { Config } from "tailwindcss";

/**
 * Tailwind 3.4 — pinned in package.json (do NOT upgrade to v4).
 * The severity color system is exposed here as design tokens so it can be used
 * as `text-severity-high`, `bg-severity-critical/10`, `border-brand`, etc.
 * Rich component styling (gradients, animations, card chrome) lives in
 * app/globals.css as plain CSS variables for a clean 1:1 port.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#080b11",
        panel: "#0e131c",
        card: "#0f1520",
        inset: "#0a0e15",
        brand: { DEFAULT: "#22d3ee", alt: "#38bdf8", ink: "#061419" },
        severity: {
          safe: "#34d399",
          low: "#7ea8d8",
          medium: "#f5c451",
          high: "#fb923c",
          critical: "#f76d6d",
        },
        ink: {
          1: "#e9eef5",
          2: "#aab6c5",
          3: "#76828f",
          4: "#515c69",
        },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: { DEFAULT: "9px", sm: "6px", md: "12px", lg: "16px" },
    },
  },
  plugins: [],
};

export default config;
