import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — ForgeGuard",
  description: "Operator dashboard for reviewing agent operations, approvals, and rollbacks.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 glow-top" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-40" aria-hidden="true" />
      <div className="relative">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-end px-6">
          <Link
            href="/"
            className="text-xs text-muted transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
