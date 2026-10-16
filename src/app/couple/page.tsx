// src/app/couple/page.tsx
import type { Metadata } from "next";
import { requirePairedUser } from "@/lib/couple";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UnpairForm } from "./unpair-form";

export const metadata: Metadata = { title: "Your couple" };

export default async function CouplePage() {
  const { user, couple, partner } = await requirePairedUser();
  const pairedOn = couple.members.find((m) => m.userId !== user.id)?.joinedAt ?? couple.createdAt;

  return (
    <main className="mx-auto max-w-md space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-semibold">Your couple</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {user.name} &amp; {partner?.name ?? "your partner"}
          </CardTitle>
          <CardDescription>
            Paired since{" "}
            {pairedOn.toLocaleDateString("en-US", { dateStyle: "long", timeZone: couple.timezone })}
            {" · "}
            {couple.timezone}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Unpair</CardTitle>
          <CardDescription>
            This ends the pairing for both of you and permanently deletes your shared
            devotional history, reflections and prayer list. It can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnpairForm />
        </CardContent>
      </Card>
    </main>
  );
}
