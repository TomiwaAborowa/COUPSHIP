// src/app/pair/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActiveInvite, getMembership } from "@/lib/couple";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton, CreateInviteForm, JoinForm } from "./pair-forms";

export const metadata: Metadata = { title: "Pair with your partner" };

export default async function PairPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const membership = await getMembership(user.id);
  if (membership?.couple.status === "ACTIVE") redirect("/");

  const invite = getActiveInvite(membership?.couple);

  return (
    <main className="mx-auto max-w-md space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Pair with your partner</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invite your partner</CardTitle>
          <CardDescription>Create a code and share it with them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invite && (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl tracking-widest">{invite.code}</span>
                <CopyButton text={invite.code} />
              </div>
              <p className="text-sm text-muted-foreground">
                Expires in {invite.hoursLeft} hour{invite.hoursLeft === 1 ? "" : "s"}. Waiting for your partner to join…
              </p>
            </div>
          )}
          <CreateInviteForm hasCode={Boolean(invite)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Have a code?</CardTitle>
          <CardDescription>Enter the code your partner shared with you.</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinForm />
        </CardContent>
      </Card>
    </main>
  );
}
