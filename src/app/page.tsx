import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "A daily devotional for two",
    body: "Scripture, a short reading, a prayer prompt and a question to talk through, the same for both of you each day.",
  },
  {
    title: "Reflections revealed together",
    body: "Write your own reflection first, then see your partner's. No peeking, no pressure, just honest answers.",
  },
  {
    title: "A shared prayer list",
    body: "Add requests, say Amen to each other's, and keep a record of the prayers God has answered.",
  },
];

export default async function Home() {
  const { userId } = await auth();
  // /today sends users without an active couple on to /pair.
  if (userId) redirect("/today");

  return (
    <main className="mx-auto max-w-3xl space-y-12 px-4 py-12 sm:px-8 sm:py-20">
      <section className="space-y-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Grow closer to God, together.
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Coupship gives couples a few quiet minutes each day to read, reflect and pray side by side,
          even when you&apos;re apart.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <SignUpButton>
            <Button size="lg">Get started</Button>
          </SignUpButton>
          <SignInButton>
            <Button size="lg" variant="outline">
              I have an account
            </Button>
          </SignInButton>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="space-y-2">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2 text-center text-sm text-muted-foreground">
        <p>Sign up, create an invite code and share it with your partner to get started.</p>
      </section>
    </main>
  );
}
