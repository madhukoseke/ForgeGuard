import type { DemoOpMeta } from "./types";
import { DEMO_STEP_COUNT, demoStepLabel } from "./utils";

interface SimulatorSectionProps {
  ops: DemoOpMeta[];
  busy: string | null;
  demoRunning: boolean;
  demoStep: number;
  error: string | null;
  pollNote: string | null;
  onRunDemo: () => void;
  onSeedAll: () => void;
  onReset: () => void;
  onRunOp: (index: number) => void;
}

export function SimulatorSection({
  ops,
  busy,
  demoRunning,
  demoStep,
  error,
  pollNote,
  onRunDemo,
  onSeedAll,
  onReset,
  onRunOp,
}: SimulatorSectionProps) {
  const stepLabel = demoStepLabel(demoStep);
  const stepProgress =
    demoStep === 0
      ? stepLabel
      : `${stepLabel} · ${Math.min(demoStep, DEMO_STEP_COUNT)}/${DEMO_STEP_COUNT}`;

  return (
    <section className="border-t border-border py-16">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-sm font-medium text-muted">Simulate</h2>
        {demoRunning && (
          <span className="text-xs text-subtle" aria-live="polite">
            {stepProgress}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-4">
          <button
            type="button"
            className="text-sm font-medium text-foreground transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-35"
            disabled={busy !== null || demoRunning}
            onClick={onRunDemo}
          >
            Run demo
          </button>
          <button
            type="button"
            className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
            disabled={busy !== null}
            onClick={onSeedAll}
          >
            Seed all
          </button>
          <button
            type="button"
            className="text-sm text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
            disabled={busy !== null}
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </div>
      {demoRunning && (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {stepLabel}
        </p>
      )}
      {(error || pollNote) && (
        <p className="mt-4 rounded-lg bg-danger-muted px-4 py-3 text-sm leading-relaxed text-danger">
          {error ?? pollNote}
        </p>
      )}
      <div className="mt-6 space-y-1">
        {ops.map((op) => (
          <button
            key={op.index}
            type="button"
            className="block w-full py-2 text-left text-[15px] text-muted transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-35"
            disabled={busy !== null || demoRunning}
            onClick={() => onRunOp(op.index)}
            title={op.statement}
          >
            <span className="mr-2 font-mono text-xs text-subtle">{op.index + 1}</span>
            {op.label}
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-subtle">
        Shortcuts: <kbd className="font-mono">D</kbd> demo · <kbd className="font-mono">1</kbd>–
        <kbd className="font-mono">{ops.length || 8}</kbd> ops · <kbd className="font-mono">A</kbd>{" "}
        approve · <kbd className="font-mono">R</kbd> rollback · <kbd className="font-mono">S</kbd>{" "}
        seed · <kbd className="font-mono">X</kbd> reset
      </p>
    </section>
  );
}
