// src/lib/couple.ts
import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { db } from "./db";

export function getMembership(userId: string) {
  return db.coupleMember.findUnique({
    where: { userId },
    include: { couple: { include: { members: { include: { user: true } } } } },
  });
}

// Use at the top of any page that requires a paired couple.
export async function requirePairedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getMembership(user.id);
  if (!membership || membership.couple.status !== "ACTIVE") redirect("/pair");

  const partner = membership.couple.members.find((m) => m.userId !== user.id)?.user ?? null;
  return { user, couple: membership.couple, partner };
}

// The couple's invite code if it's still valid, with the hours left before it expires.
export function getActiveInvite(couple: { inviteCode: string | null; inviteExpiresAt: Date | null } | undefined) {
  if (!couple?.inviteCode || !couple.inviteExpiresAt) return null;
  const msLeft = couple.inviteExpiresAt.getTime() - Date.now();
  if (msLeft <= 0) return null;
  return { code: couple.inviteCode, hoursLeft: Math.ceil(msLeft / 3_600_000) };
}
