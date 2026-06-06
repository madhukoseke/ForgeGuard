import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeGuard — control plane for agent-built backends",
  description:
    "Audit → Guard → Approve → Roll back. The reliability & observability control plane for agent-built backends on InsForge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
