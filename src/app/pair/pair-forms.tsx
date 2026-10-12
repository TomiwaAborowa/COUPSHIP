// src/app/pair/pair-forms.tsx
"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvite, joinWithCode, type PairState } from "./actions";
import { CODE_LENGTH } from "./constants";

export function CreateInviteForm({ hasCode }: { hasCode: boolean }) {
  const [state, action, pending] = useActionState(
    (prev: PairState, formData: FormData) => {
      formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      return createInvite(prev, formData);
    },
    {}
  );

  return (
    <form action={action} className="space-y-2">
      <Button type="submit" variant={hasCode ? "outline" : "default"} disabled={pending}>
        {pending ? "Creating…" : hasCode ? "Generate a new code" : "Create invite code"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function JoinForm() {
  const [state, action, pending] = useActionState(joinWithCode, {});

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <Input
          name="code"
          placeholder="ABC234"
          maxLength={CODE_LENGTH + 2}
          autoComplete="off"
          className="font-mono uppercase tracking-widest"
          aria-label="Partner's invite code"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Joining…" : "Join"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}
