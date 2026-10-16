// src/app/couple/unpair-form.tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unpair } from "./actions";

export function UnpairForm() {
  const [state, action, pending] = useActionState(unpair, {});

  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>
          Type <strong>unpair</strong> to confirm.
        </span>
        <Input name="confirm" autoComplete="off" required />
      </label>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Unpairing…" : "Unpair and delete our history"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
