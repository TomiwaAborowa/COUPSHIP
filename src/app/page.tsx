import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="p-8">
        <p>You&apos;re not signed in. Use the buttons above to sign in or create an account.</p>
      </div>
    );
  }

  // /today sends users without an active couple on to /pair.
  redirect("/today");
}
