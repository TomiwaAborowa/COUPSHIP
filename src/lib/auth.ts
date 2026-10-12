// src/lib/auth.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const name =
    clerkUser?.fullName ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    "Member";

  return db.user.upsert({
    where: { id: userId },
    update: { name, avatarUrl: clerkUser?.imageUrl },
    create: { id: userId, name, avatarUrl: clerkUser?.imageUrl },
  });
}