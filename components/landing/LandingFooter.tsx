import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <span>ForgeGuard</span>
        <Link href="/dashboard" className="transition-colors hover:text-foreground">
          Dashboard
        </Link>
      </div>
    </footer>
  );
}
