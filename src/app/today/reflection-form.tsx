// src/app/today/reflection-form.tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReflection } from "./actions";
import { REFLECTION_MAX_LENGTH } from "./constants";

export function ReflectionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(submitReflection, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Textarea
        name="body"
        rows={6}
        maxLength={REFLECTION_MAX_LENGTH}
        placeholder="What is God saying to you through today's reading?"
        aria-label="Your reflection"
        required
      />
      <p className="text-xs text-muted-foreground">
        Once submitted, your reflection can&apos;t be edited.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit reflection"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
