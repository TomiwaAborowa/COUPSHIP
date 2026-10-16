// src/proxy.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

// Only makes the Clerk session available. Access control lives with the data:
// every page and server action checks via getCurrentUser() / requirePairedUser().
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
