import Image from "next/image";
import Link from "next/link";

const MCP_SETUP_URL =
  "https://github.com/madhukoseke/ForgeGuard#quick-start-mcp-server";

export default function HeroSection() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-16 pb-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="animate-fade-up text-[2.75rem] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[4.5rem]">
          ForgeGuard
        </h1>

        <p className="animate-fade-up animate-fade-up-delay-1 mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
          An AI agent can ship a full-stack app in minutes — and drop your
          production table in seconds. ForgeGuard is the seatbelt: agents
          connect via MCP or HTTP, and every read and write is audited,
          scanned, and held when it&apos;s risky.
        </p>

        <div className="animate-fade-up animate-fade-up-delay-2 mt-10 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-full bg-foreground px-7 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Try the demo
          </Link>
          <a
            href={MCP_SETUP_URL}
            className="text-[15px] text-muted transition-colors hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wire MCP
          </a>
        </div>
      </div>

      <div className="animate-fade-up animate-fade-up-delay-3 relative mx-auto mt-16 w-full max-w-3xl overflow-hidden border border-border">
        <Image
          src="/screenshot-pending.png"
          alt="ForgeGuard dashboard showing a pending high-risk agent operation held for approval"
          width={1200}
          height={720}
          className="h-auto w-full"
          priority
        />
      </div>
    </section>
  );
}
