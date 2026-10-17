// src/app/layout.tsx
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Coupship", template: "%s · Coupship" },
  description: "A daily devotional and shared prayer list for couples.",
};

const buttonClass =
  "rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="min-h-screen bg-white text-zinc-900">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-8 sm:py-4">
            <Link href="/" className="text-lg font-semibold">
              Coupship
            </Link>
            <nav className="flex flex-wrap items-center gap-3">
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
                <Link href="/prayers" className="text-sm font-medium hover:underline">
                  Prayers
                </Link>
                <Link href="/couple" className="text-sm font-medium hover:underline">
                  Couple
                </Link>
                <UserButton />
                {/* The UserButton menu has sign-out too; the extra button is hidden on phones. */}
                <SignOutButton>
                  <button className={`${buttonClass} hidden border hover:bg-zinc-100 sm:inline-flex`}>
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
