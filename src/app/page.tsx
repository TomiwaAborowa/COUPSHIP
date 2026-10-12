import { auth } from "@clerk/nextjs/server";
import { requirePairedUser } from "@/lib/couple";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="p-8">
        <p>You&apos;re not signed in. Use the buttons above to sign in or create an account.</p>
      </div>
    );
  }

  // Signed-in users without an active couple are sent to /pair.
  const { user, partner } = await requirePairedUser();
  return (
    <div className="p-8">
      <p>
        Signed in as {user.name}, paired with {partner?.name ?? "your partner"}.
      </p>
    </div>
  );
}
