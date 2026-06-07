import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForgeGuard — control plane for agent-built backends",
  description:
    "Audit → Guard → Approve → Roll back. The reliability & observability control plane for agent-built backends on InsForge.",
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
