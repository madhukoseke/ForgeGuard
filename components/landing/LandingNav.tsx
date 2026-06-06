"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="text-[15px] font-medium tracking-tight">
          ForgeGuard
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#product" className="text-sm text-muted transition-colors hover:text-foreground">
            Product
          </a>
          <Link
            href="/dashboard"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>

        <button
          type="button"
          className="text-sm text-muted md:hidden"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <a
            href="#product"
            className="block py-2 text-sm text-muted"
            onClick={() => setMobileOpen(false)}
          >
            Product
          </a>
          <Link
            href="/dashboard"
            className="block py-2 text-sm text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
