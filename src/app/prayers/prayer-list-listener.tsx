// src/app/prayers/prayer-list-listener.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@/lib/supabase";

// Refreshes the page when the partner adds, answers or archives a request, or
// says Amen. Only INSERT/UPDATE: Realtime can't apply RLS to DELETE events, so
// subscribing to them would receive other couples' deletes (an undone Amen
// therefore shows up on the next refresh instead).
export function PrayerListListener({ coupleId, userId }: { coupleId: string; userId: string }) {
  const supabase = useSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const refreshIfPartner = (actorId: string | undefined) => {
      if (actorId && actorId !== userId) router.refresh();
    };
    const requestFilter = { schema: "public", table: "prayer_requests", filter: `coupleId=eq.${coupleId}` };

    const channel = supabase
      .channel(`prayers:${coupleId}`)
      .on("postgres_changes", { event: "INSERT", ...requestFilter }, (payload) =>
        refreshIfPartner((payload.new as { authorId?: string }).authorId)
      )
      .on("postgres_changes", { event: "UPDATE", ...requestFilter }, (payload) =>
        refreshIfPartner((payload.new as { authorId?: string }).authorId)
      )
      // prayer_amens has no coupleId column; RLS limits these to our couple.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prayer_amens" }, (payload) =>
        refreshIfPartner((payload.new as { userId?: string }).userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, coupleId, userId, router]);

  return null;
}
