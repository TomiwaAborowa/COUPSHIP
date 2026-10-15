// src/app/prayers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePairedUser } from "@/lib/couple";
import { db } from "@/lib/db";
import { findCouplePrayer } from "@/lib/prayer";
import {
  ANSWER_NOTE_MAX_LENGTH,
  PRAYER_BODY_MAX_LENGTH,
  PRAYER_TITLE_MAX_LENGTH,
} from "./constants";

export type PrayerFormState = { error?: string };

// Empty optional text fields become null.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((s) => s || null);

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give your prayer request a title.")
    .max(PRAYER_TITLE_MAX_LENGTH, `Keep the title under ${PRAYER_TITLE_MAX_LENGTH} characters.`),
  body: optionalText(PRAYER_BODY_MAX_LENGTH, `Keep the details under ${PRAYER_BODY_MAX_LENGTH} characters.`),
});

const answerSchema = z.object({
  prayerId: z.string().min(1),
  answerNote: optionalText(ANSWER_NOTE_MAX_LENGTH, `Keep the note under ${ANSWER_NOTE_MAX_LENGTH} characters.`),
});

const prayerIdSchema = z.string().min(1);

export async function createPrayer(
  _prev: PrayerFormState,
  formData: FormData
): Promise<PrayerFormState> {
  const { user, couple } = await requirePairedUser();

  const parsed = createSchema.safeParse({
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.prayerRequest.create({
    data: { ...parsed.data, coupleId: couple.id, authorId: user.id },
  });
  revalidatePath("/prayers");
  return {};
}

// Adds or removes the caller's Amen on their partner's active request.
export async function toggleAmen(formData: FormData) {
  const { user, couple } = await requirePairedUser();
  const prayerId = prayerIdSchema.safeParse(formData.get("prayerId"));
  if (!prayerId.success) return;

  const prayer = await findCouplePrayer(prayerId.data, couple.id);
  if (!prayer || prayer.status !== "ACTIVE" || prayer.authorId === user.id) return;

  const key = { prayerRequestId: prayer.id, userId: user.id };
  const removed = await db.prayerAmen.deleteMany({ where: key });
  if (removed.count === 0) {
    // A double-click can race the create; the second one is a harmless duplicate.
    await db.prayerAmen.createMany({ data: [key], skipDuplicates: true });
  }
  revalidatePath("/prayers");
}

export async function markAnswered(
  _prev: PrayerFormState,
  formData: FormData
): Promise<PrayerFormState> {
  const { user, couple } = await requirePairedUser();

  const parsed = answerSchema.safeParse({
    prayerId: formData.get("prayerId"),
    answerNote: formData.get("answerNote") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const prayer = await findCouplePrayer(parsed.data.prayerId, couple.id);
  if (!prayer || prayer.authorId !== user.id) return { error: "Only the author can mark this answered." };
  if (prayer.status !== "ACTIVE") return { error: "This request is no longer active." };

  await db.prayerRequest.update({
    where: { id: prayer.id },
    data: { status: "ANSWERED", answeredAt: new Date(), answerNote: parsed.data.answerNote },
  });
  revalidatePath("/prayers");
  return {};
}

export async function archivePrayer(formData: FormData) {
  const { user, couple } = await requirePairedUser();
  const prayerId = prayerIdSchema.safeParse(formData.get("prayerId"));
  if (!prayerId.success) return;

  const prayer = await findCouplePrayer(prayerId.data, couple.id);
  if (!prayer || prayer.authorId !== user.id || prayer.status === "ARCHIVED") return;

  await db.prayerRequest.update({ where: { id: prayer.id }, data: { status: "ARCHIVED" } });
  revalidatePath("/prayers");
}
