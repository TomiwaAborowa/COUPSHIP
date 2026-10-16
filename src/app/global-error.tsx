// src/app/global-error.tsx
// Replaces the root layout when it fails (e.g. Clerk can't load), so it brings
// its own <html>/<body> and minimal inline styles.
"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Something went wrong</h1>
        <p>Coupship couldn&apos;t load. Please try again in a moment.</p>
        {error.digest && <p style={{ fontSize: 12, color: "#666" }}>Error reference: {error.digest}</p>}
        <button onClick={() => retry()} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
