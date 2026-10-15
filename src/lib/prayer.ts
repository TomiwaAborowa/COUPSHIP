// src/lib/prayer.ts
import "server-only";
import { db } from "./db";

// Prisma bypasses RLS, so every read is scoped to the caller's couple here.
export async function getCouplePrayers(coupleId: string) {
  const prayers = await db.prayerRequest.findMany({
    where: { coupleId },
    include: {
      author: { select: { id: true, name: true } },
      amens: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    active: prayers.filter((p) => p.status === "ACTIVE"),
    answered: prayers
      .filter((p) => p.status === "ANSWERED")
      .sort((a, b) => (b.answeredAt?.getTime() ?? 0) - (a.answeredAt?.getTime() ?? 0)),
    archived: prayers.filter((p) => p.status === "ARCHIVED"),
  };
}

export type CouplePrayer = Awaited<ReturnType<typeof getCouplePrayers>>["active"][number];

// The prayer if it belongs to the couple, otherwise null.
export function findCouplePrayer(prayerId: string, coupleId: string) {
  return db.prayerRequest.findFirst({ where: { id: prayerId, coupleId } });
}
