// src/app/today/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "../../../prisma/generated/prisma/client";
import { requirePairedUser } from "@/lib/couple";
import { db } from "@/lib/db";
import { getCoupleLocalDate } from "@/lib/devotional";
import { REFLECTION_MAX_LENGTH } from "./constants";

export type ReflectionState = { error?: string };

const reflectionSchema = z.object({
  sessionId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Write something before submitting.")
    .max(REFLECTION_MAX_LENGTH, `Keep it under ${REFLECTION_MAX_LENGTH} characters.`),
});

export async function submitReflection(
  _prev: ReflectionState,
  formData: FormData
): Promise<ReflectionState> {
  const { user, couple } = await requirePairedUser();

  const parsed = reflectionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { sessionId, body } = parsed.data;

  const session = await db.devotionalSession.findUnique({ where: { id: sessionId } });
  if (!session || session.coupleId !== couple.id) return { error: "Session not found." };
  if (session.localDate !== getCoupleLocalDate(couple.timezone)) {
    return { error: "This devotional has ended. Refresh to see today's." };
  }

  try {
    await db.$transaction([
      db.reflection.create({ data: { sessionId, userId: user.id, body } }),
      db.sessionProgress.create({ data: { sessionId, userId: user.id } }),
    ]);
  } catch (e) {
    // Reflections are immutable: a second submission hits the unique constraint.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "You've already reflected on today's devotional." };
    }
    throw e;
  }

  revalidatePath("/today");
  return {};
}
