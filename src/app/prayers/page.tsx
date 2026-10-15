// src/app/prayers/page.tsx
import { requirePairedUser } from "@/lib/couple";
import { getCouplePrayers, type CouplePrayer } from "@/lib/prayer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { archivePrayer, toggleAmen } from "./actions";
import { PrayerListListener } from "./prayer-list-listener";
import { MarkAnsweredForm, NewPrayerForm } from "./prayer-forms";

export default async function PrayersPage() {
  const { user, couple, partner } = await requirePairedUser();
  const { active, answered, archived } = await getCouplePrayers(couple.id);
  const partnerName = partner?.name ?? "your partner";

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: couple.timezone });

  function PrayerCard({ prayer }: { prayer: CouplePrayer }) {
    const isMine = prayer.authorId === user.id;
    const amenedByMe = prayer.amens.some((a) => a.userId === user.id);
    const partnerAmened = prayer.amens.some((a) => a.userId !== user.id);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{prayer.title}</CardTitle>
          <CardDescription>
            {isMine ? "You" : prayer.author.name} · {formatDate(prayer.createdAt)}
          </CardDescription>
        </CardHeader>
        {(prayer.body || prayer.status === "ANSWERED") && (
          <CardContent className="space-y-3">
            {prayer.body && <p className="whitespace-pre-wrap">{prayer.body}</p>}
            {prayer.status === "ANSWERED" && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">
                  Answered{prayer.answeredAt && ` on ${formatDate(prayer.answeredAt)}`}
                </p>
                {prayer.answerNote && <p className="mt-1 whitespace-pre-wrap">{prayer.answerNote}</p>}
              </div>
            )}
          </CardContent>
        )}
        {prayer.status === "ACTIVE" && (
          <CardFooter className="flex flex-wrap items-center gap-2">
            {isMine ? (
              <>
                <span className="mr-auto text-sm text-muted-foreground">
                  {partnerAmened ? `🙏 ${partnerName} is praying with you` : `Waiting for ${partnerName}'s Amen`}
                </span>
                <MarkAnsweredForm prayerId={prayer.id} />
                <form action={archivePrayer}>
                  <input type="hidden" name="prayerId" value={prayer.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Archive
                  </Button>
                </form>
              </>
            ) : (
              <form action={toggleAmen}>
                <input type="hidden" name="prayerId" value={prayer.id} />
                <Button type="submit" variant={amenedByMe ? "secondary" : "default"} size="sm">
                  {amenedByMe ? "🙏 Amen'd (undo)" : "🙏 Amen"}
                </Button>
              </form>
            )}
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <PrayerListListener coupleId={couple.id} userId={user.id} />
      <h1 className="text-3xl font-semibold">Prayer list</h1>

      <Card>
        <CardHeader>
          <CardTitle>New prayer request</CardTitle>
          <CardDescription>Share what&apos;s on your heart with {partnerName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewPrayerForm />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Praying for ({active.length})</h2>
        {active.length === 0 ? (
          <p className="text-muted-foreground">No active requests. Add one above.</p>
        ) : (
          active.map((p) => <PrayerCard key={p.id} prayer={p} />)
        )}
      </section>

      {answered.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Answered ({answered.length})</h2>
          {answered.map((p) => (
            <PrayerCard key={p.id} prayer={p} />
          ))}
        </section>
      )}

      {archived.length > 0 && (
        <details className="space-y-4">
          <summary className="cursor-pointer text-muted-foreground">
            Archived ({archived.length})
          </summary>
          <div className="mt-4 space-y-4">
            {archived.map((p) => (
              <PrayerCard key={p.id} prayer={p} />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
