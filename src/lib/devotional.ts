// src/lib/devotional.ts
import "server-only";
import { Prisma } from "../../prisma/generated/prisma/client";
import { db } from "./db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" for the given instant in an IANA timezone (en-CA formats as ISO dates).
export function getCoupleLocalDate(timezone: string, at: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function daysBetween(fromLocalDate: string, toLocalDate: string) {
  return Math.round((Date.parse(toLocalDate) - Date.parse(fromLocalDate)) / MS_PER_DAY);
}

// Today's session for the couple, creating it on first visit. The devotional is
// picked deterministically from the number of days since the couple was created.
export async function getTodaySession(couple: { id: string; timezone: string; createdAt: Date }) {
  const localDate = getCoupleLocalDate(couple.timezone);
  const where = { coupleId_localDate: { coupleId: couple.id, localDate } };
  const include = { devotional: true };

  const existing = await db.devotionalSession.findUnique({ where, include });
  if (existing) return existing;

  const total = await db.devotional.count();
  if (total === 0) throw new Error("No devotionals found. Run `npx prisma db seed`.");

  const dayNumber = daysBetween(getCoupleLocalDate(couple.timezone, couple.createdAt), localDate);
  const dayIndex = ((dayNumber % total) + total) % total;
  const devotional = await db.devotional.findUnique({ where: { dayIndex } });
  if (!devotional) throw new Error(`No devotional with dayIndex ${dayIndex}.`);

  try {
    return await db.devotionalSession.upsert({
      where,
      update: {},
      create: { coupleId: couple.id, devotionalId: devotional.id, localDate },
      include,
    });
  } catch (e) {
    // Both partners opened the page at once and the other insert won.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return db.devotionalSession.findUniqueOrThrow({ where, include });
    }
    throw e;
  }
}

// The ONLY function that reads reflections. Prisma bypasses RLS, so the reveal
// rule is enforced here: the partner's text is returned only once the viewer
// has submitted their own. Partner status comes from SessionProgress.
export async function getReflectionsForViewer(sessionId: string, userId: string) {
  const session = await db.devotionalSession.findFirst({
    where: { id: sessionId, couple: { members: { some: { userId } } } },
    select: { id: true },
  });
  if (!session) throw new Error("Session not found for this user.");

  const [mine, partnerProgress] = await Promise.all([
    db.reflection.findUnique({ where: { sessionId_userId: { sessionId, userId } } }),
    db.sessionProgress.findFirst({ where: { sessionId, userId: { not: userId } } }),
  ]);

  const partner = mine
    ? await db.reflection.findFirst({ where: { sessionId, userId: { not: userId } } })
    : null;

  return { mine, partner, partnerHasReflected: partnerProgress !== null };
}
