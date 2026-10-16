// src/app/pair/actions.ts
"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "../../../prisma/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { deleteCouple } from "@/lib/couple";
import { db } from "@/lib/db";
import { CODE_LENGTH } from "./constants";

// No look-alikes: 0/O and 1/I are excluded.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export type PairState = { error?: string };

function generateCode() {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function createInvite(_prev: PairState, formData: FormData): Promise<PairState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const tz = formData.get("timezone");
  const timezone = typeof tz === "string" && isValidTimezone(tz) ? tz : "UTC";

  const existing = await db.coupleMember.findUnique({
    where: { userId: user.id },
    include: { couple: true },
  });
  if (existing?.couple.status === "ACTIVE") redirect("/");

  // Retry on the rare chance a generated code collides with an existing one.
  for (let attempt = 0; attempt < 5; attempt++) {
    const invite = {
      inviteCode: generateCode(),
      inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      timezone,
    };
    try {
      if (existing) {
        await db.couple.update({ where: { id: existing.coupleId }, data: invite });
      } else {
        await db.couple.create({
          data: { ...invite, members: { create: { userId: user.id } } },
        });
      }
      revalidatePath("/pair");
      return {};
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { error: "Couldn't create a code. Please try again." };
}

export async function joinWithCode(_prev: PairState, formData: FormData): Promise<PairState> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length !== CODE_LENGTH) {
    return { error: `Enter the ${CODE_LENGTH}-character code from your partner.` };
  }

  const error = await db.$transaction(async (tx) => {
    const couple = await tx.couple.findUnique({
      where: { inviteCode: code },
      include: { members: true },
    });
    if (!couple || !couple.inviteExpiresAt || couple.inviteExpiresAt < new Date()) {
      return "That code is invalid or has expired.";
    }
    if (couple.members.some((m) => m.userId === user.id)) {
      return "That's your own code. Share it with your partner instead.";
    }
    if (couple.members.length >= 2) return "That couple is already full.";

    const mine = await tx.coupleMember.findUnique({
      where: { userId: user.id },
      include: { couple: true },
    });
    if (mine?.couple.status === "ACTIVE") return "You're already paired.";

    // Claim the code atomically: a concurrent join re-checks this WHERE after
    // the first one commits and matches nothing.
    const claimed = await tx.couple.updateMany({
      where: { id: couple.id, inviteCode: code, status: "PENDING" },
      data: { inviteCode: null, inviteExpiresAt: null, status: "ACTIVE" },
    });
    if (claimed.count === 0) return "That code was just used. Ask your partner for a new one.";

    // Drop the joiner's own unused invite, if they had made one.
    if (mine) await deleteCouple(tx, mine.coupleId);

    await tx.coupleMember.create({ data: { coupleId: couple.id, userId: user.id } });
    return null;
  });

  if (error) return { error };
  redirect("/");
}
