// src/app/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-8" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}
