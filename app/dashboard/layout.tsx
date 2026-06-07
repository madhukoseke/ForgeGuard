import LandingNav from "@/components/landing/LandingNav";
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
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      {children}
    </div>
  );
}
