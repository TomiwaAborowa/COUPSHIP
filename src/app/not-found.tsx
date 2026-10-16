// src/app/not-found.tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-4 text-center sm:p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">That page doesn&apos;t exist.</p>
      <Link href="/" className={buttonVariants()}>
        Go home
      </Link>
    </main>
  );
}
