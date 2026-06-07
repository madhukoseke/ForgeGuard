"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const onDashboard = pathname.startsWith("/dashboard");

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="text-[15px] font-medium tracking-tight">
          ForgeGuard
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#product" className="text-sm text-muted transition-colors hover:text-foreground">
            Product
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm transition-colors hover:text-foreground ${onDashboard ? "text-foreground" : "text-muted"}`}
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="text-sm text-muted"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border px-6 py-4 md:hidden">
          <Link
            href="/#product"
            className="block py-2 text-sm text-muted"
            onClick={() => setMobileOpen(false)}
          >
            Product
          </Link>
          <Link
            href="/dashboard"
            className={`block py-2 text-sm ${onDashboard ? "text-foreground" : "text-muted"}`}
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
