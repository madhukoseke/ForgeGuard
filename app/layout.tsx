import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const siteDescription =
  "Open-source guardrail layer between AI agents and your data: MCP server, audit trail, prompt-injection scanning, and destructive-query detection.";

export const metadata: Metadata = {
  title: "ForgeGuard — guardrail layer for AI agents and Postgres",
  description: siteDescription,
  metadataBase: new URL(
    process.env.FORGEGUARD_BASE_URL?.trim() || "https://github.com/madhukoseke/ForgeGuard",
  ),
  openGraph: {
    title: "ForgeGuard",
    description: siteDescription,
    type: "website",
    siteName: "ForgeGuard",
    images: [{ url: "/og-dashboard.png", width: 1440, height: 900, alt: "ForgeGuard dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ForgeGuard",
    description: siteDescription,
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("forgeguard-theme");if(t){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
