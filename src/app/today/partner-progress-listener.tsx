// src/app/today/partner-progress-listener.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@/lib/supabase";

// Refreshes the page when the partner's SessionProgress row is inserted. The
// event carries no reflection content; the server re-render decides what to reveal.
export function PartnerProgressListener({
  sessionId,
  partnerId,
}: {
  sessionId: string;
  partnerId: string;
}) {
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel(`session-progress:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_progress",
          filter: `sessionId=eq.${sessionId}`,
        },
        (payload) => {
          if ((payload.new as { userId?: string }).userId === partnerId) router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, sessionId, partnerId, router]);

  return null;
}
