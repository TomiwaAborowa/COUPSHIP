// src/app/prayers/prayer-forms.tsx
"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPrayer, markAnswered } from "./actions";
import {
  ANSWER_NOTE_MAX_LENGTH,
  PRAYER_BODY_MAX_LENGTH,
  PRAYER_TITLE_MAX_LENGTH,
} from "./constants";

export function NewPrayerForm() {
  const [state, action, pending] = useActionState(createPrayer, {});

  return (
    <form action={action} className="space-y-3">
      <Input
        name="title"
        maxLength={PRAYER_TITLE_MAX_LENGTH}
        placeholder="What should we pray for?"
        aria-label="Prayer request title"
        required
      />
      <Textarea
        name="body"
        rows={3}
        maxLength={PRAYER_BODY_MAX_LENGTH}
        placeholder="Details (optional)"
        aria-label="Prayer request details"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add prayer request"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function MarkAnsweredForm({ prayerId }: { prayerId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(markAnswered, {});

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Mark answered
      </Button>
    );
  }

  return (
    <form action={action} className="w-full space-y-2">
      <input type="hidden" name="prayerId" value={prayerId} />
      <Textarea
        name="answerNote"
        rows={2}
        maxLength={ANSWER_NOTE_MAX_LENGTH}
        placeholder="How did God answer? (optional)"
        aria-label="Answer note"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save as answered"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
