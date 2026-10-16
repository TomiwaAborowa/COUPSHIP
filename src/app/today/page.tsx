// src/app/today/page.tsx
import type { Metadata } from "next";
import { requirePairedUser } from "@/lib/couple";
import { getReflectionsForViewer, getTodaySession } from "@/lib/devotional";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PartnerProgressListener } from "./partner-progress-listener";
import { ReflectionForm } from "./reflection-form";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const { user, couple, partner } = await requirePairedUser();
  const session = await getTodaySession(couple);
  const { mine, partner: partnerReflection, partnerHasReflected } =
    await getReflectionsForViewer(session.id, user.id);
  const { devotional } = session;
  const partnerName = partner?.name ?? "your partner";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      {partner && !partnerHasReflected && (
        <PartnerProgressListener sessionId={session.id} partnerId={partner.id} />
      )}
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{formatLocalDate(session.localDate)}</p>
        <h1 className="text-3xl font-semibold">{devotional.title}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{devotional.scriptureRef}</CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-4 pl-4 italic">{devotional.scriptureText}</blockquote>
        </CardContent>
      </Card>

      <p className="leading-7">{devotional.body}</p>

      <Card>
        <CardHeader>
          <CardTitle>Pray together</CardTitle>
          <CardDescription>{devotional.prayerPrompt}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talk about it</CardTitle>
          <CardDescription>{devotional.discussionQuestion}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your reflection</CardTitle>
        </CardHeader>
        <CardContent>
          {mine ? (
            <p className="whitespace-pre-wrap">{mine.body}</p>
          ) : (
            <ReflectionForm sessionId={session.id} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{partner?.name ? `${partner.name}'s reflection` : "Your partner's reflection"}</CardTitle>
        </CardHeader>
        <CardContent>
          {partnerReflection ? (
            <p className="whitespace-pre-wrap">{partnerReflection.body}</p>
          ) : partnerHasReflected ? (
            <p className="text-muted-foreground">
              {partnerName} has reflected. Write yours to unlock it.
            </p>
          ) : (
            <p className="text-muted-foreground">Waiting for {partnerName} to reflect…</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

// localDate is already in the couple's timezone, so format it as a plain UTC date.
function formatLocalDate(localDate: string) {
  return new Date(`${localDate}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
