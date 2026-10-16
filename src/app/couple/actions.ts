// src/app/couple/actions.ts
"use server";

import { redirect } from "next/navigation";
import { deleteCouple, requirePairedUser } from "@/lib/couple";
import { db } from "@/lib/db";

export type UnpairState = { error?: string };

// Dissolves the couple for both partners and deletes everything it owns.
// Keeping the history would expose it to whoever either person pairs with next.
export async function unpair(_prev: UnpairState, formData: FormData): Promise<UnpairState> {
  const { couple } = await requirePairedUser();

  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== "unpair") return { error: 'Type "unpair" to confirm.' };

  await db.$transaction((tx) => deleteCouple(tx, couple.id));
  redirect("/pair");
}
