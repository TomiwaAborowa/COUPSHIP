// src/app/layout.tsx
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

const buttonClass =
  "rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-white text-zinc-900">
          <header className="flex items-center justify-between border-b px-8 py-4">
            <Link href="/" className="text-lg font-semibold">
              Coupship
            </Link>
            <nav className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton>
                  <button className={`${buttonClass} border hover:bg-zinc-100`}>
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className={`${buttonClass} bg-zinc-900 text-white hover:bg-zinc-700`}>
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link href="/today" className="text-sm font-medium hover:underline">
                  Today
                </Link>
                <Link href="/prayers" className="mr-2 text-sm font-medium hover:underline">
                  Prayers
                </Link>
                <UserButton />
                <SignOutButton>
                  <button className={`${buttonClass} border hover:bg-zinc-100`}>
                    Sign out
                  </button>
                </SignOutButton>
              </Show>
            </nav>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
