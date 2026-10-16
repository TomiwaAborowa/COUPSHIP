// test/helpers.ts
import { vi } from "vitest";
import type { User } from "../prisma/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const DAY_MS = 24 * 60 * 60 * 1000;

// Empties every app table and inserts three devotionals (dayIndex 0–2).
export async function resetDb() {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE prayer_amens, prayer_requests, session_progress, reflections,
      devotional_sessions, couple_members, couples, users, devotionals CASCADE
  `);
  await db.devotional.createMany({
    data: [0, 1, 2].map((dayIndex) => ({
      dayIndex,
      title: `Day ${dayIndex}`,
      scriptureRef: `Ref ${dayIndex}`,
      scriptureText: "Scripture",
      body: "Body",
      prayerPrompt: "Prayer prompt",
      discussionQuestion: "Question",
    })),
  });
}

export function createUser(id: string) {
  return db.user.create({ data: { id, name: id } });
}

export function createCouple(
  memberIds: string[],
  data: {
    status?: "PENDING" | "ACTIVE";
    timezone?: string;
    createdAt?: Date;
    inviteCode?: string;
    inviteExpiresAt?: Date;
  } = {}
) {
  return db.couple.create({
    data: {
      status: "ACTIVE",
      ...data,
      members: { create: memberIds.map((userId) => ({ userId })) },
    },
  });
}

// Two users in an active couple.
export async function createPair(names: [string, string], timezone = "UTC") {
  const first = await createUser(names[0]);
  const second = await createUser(names[1]);
  const couple = await createCouple([first.id, second.id], { timezone });
  return { first, second, couple };
}

// What getCurrentUser() (Clerk) returns for the next calls.
export function signInAs(user: User | null) {
  vi.mocked(getCurrentUser).mockResolvedValue(user);
}

export function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}
