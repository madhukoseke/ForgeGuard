import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeGuard — reliability control plane for agent-built backends",
  description:
    "Audit → Guard → Approve → Roll back. ForgeGuard intercepts every backend change an AI agent proposes on InsForge, classifies its risk, and pauses the dangerous ones for human approval.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
