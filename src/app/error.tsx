// src/app/error.tsx
"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 text-center sm:p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        We couldn&apos;t load this page. It may be a temporary problem.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
