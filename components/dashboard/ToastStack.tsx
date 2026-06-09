import type { Toast } from "./types";

interface ToastStackProps {
  toasts: Toast[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm text-foreground shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
