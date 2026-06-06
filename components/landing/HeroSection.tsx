import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="animate-fade-up text-[2.75rem] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[4.5rem]">
          Guard agent ops
          <br />
          <span className="text-muted">before production.</span>
        </h1>

        <p className="animate-fade-up animate-fade-up-delay-1 mx-auto mt-6 max-w-md text-[17px] leading-relaxed text-muted">
          Audit, approve, and roll back every change your agents make.
        </p>

        <div className="animate-fade-up animate-fade-up-delay-2 mt-10">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-full bg-foreground px-7 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
