export function ActionListSkeleton() {
  return (
    <div className="mt-8 space-y-8" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-3 py-4">
          <div className="h-5 w-40 rounded bg-surface" />
          <div className="h-4 w-56 rounded bg-surface" />
          <div className="h-20 rounded-lg bg-surface" />
          <div className="h-4 w-full max-w-md rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
