# TogetherFaith (coupship): project context

A couples faith/marriage app. MVP: pair via invite code, a daily devotional with
**delayed-reveal reflections** (your partner's reflection unlocks only after you
submit your own), and a shared prayer list.

## Stack

Next.js 16 App Router (middleware lives in `src/proxy.ts`, Next 16's name for it),
React 19, Tailwind 4, shadcn/ui (`src/components/ui`), Clerk auth, Supabase Postgres,
Prisma 7.

## Prisma 7 rules (don't "fix" these back to Prisma 5/6 habits)

- Connection URL lives in `prisma.config.ts` (`defineConfig` + `env()` from `prisma/config`),
  NOT in `schema.prisma`. The datasource block has only `provider = "postgresql"`.
- Generator is `prisma-client`, output `prisma/generated/prisma`. Import the client from
  `prisma/generated/prisma/client`, never `@prisma/client`.
- A driver adapter is mandatory: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
  Use the shared `db` from `src/lib/db.ts`.
- One `url` only (no `directUrl`). `DATABASE_URL` is Supabase's **session pooler, port 5432**,
  username `postgres.<project-ref>`. Port 6543 (transaction pooler) breaks migrations.
- Seed command is in `prisma.config.ts` (`migrations.seed`), run with `npx prisma db seed`.
- Never edit a migration that's already applied; add a new one
  (`npx prisma migrate dev --create-only --name <x>` for hand-written SQL).

## Security model (important)

- Prisma connects as the `postgres` role, which **bypasses RLS**. So every Prisma query
  must enforce access rules in code: scope by the caller's couple, and never return a
  partner's reflection unless the caller has reflected on that session.
- RLS (migration `20261012140000_rls_policies`) protects supabase-js / Realtime access with
  a Clerk JWT. The API is read-only: there are no insert/update/delete policies. All writes go
  through server actions + Prisma. Helpers: `current_user_id()`, `my_couple_id()`,
  `has_reflected(session_id)`, `session_in_my_couple(session_id)`.
- `prisma/rls.sql` is a stale duplicate of the init migration. Ignore it or delete it.

## Key code

- `src/lib/auth.ts`: `getCurrentUser()` upserts the Clerk user into `users`.
- `src/lib/couple.ts`: `getMembership`, `requirePairedUser()` (redirects to `/sign-in` or
  `/pair`; returns `{ user, couple, partner }`), `getActiveInvite`.
- `src/app/pair/*`: invite create/join server actions (race-safe claim via `updateMany`).
- Couple has `timezone` (IANA, captured when the invite is created).
- `DevotionalSession` is unique on `(coupleId, localDate)`; `localDate` is `YYYY-MM-DD`
  in the couple's timezone. `Reflection` is unique on `(sessionId, userId)`.
  `SessionProgress` records "has reflected" without content (for Realtime).

## Status

| Phase | Scope | Status |
|---|---|---|
| 0–1 | Accounts, scaffold, Vercel deploy | Done |
| 2 | Schema, RLS, seed | Done |
| 3 | Clerk auth | Done |
| 4 | Couple pairing (invite codes) | Done |
| **5** | **Daily devotional + delayed-reveal reflections** | **Built; two-account browser check pending** |
| 6 | Realtime "partner has reflected" (supabase-js, `session_progress`) | Done |
| 7 | Shared prayer list + Amens (`/prayers`) | Done (incl. Realtime) |
| 8 | Joint goals (optional) | Not started |
| 9 | Hardening, tests, polish | Not started |

## Phase 5 plan

1. `src/lib/devotional.ts` (server-only):
   - `getCoupleLocalDate(timezone)`: `YYYY-MM-DD` via `Intl.DateTimeFormat("en-CA", { timeZone })`.
   - `getTodaySession(couple)`: upsert `DevotionalSession` on `(coupleId, localDate)`.
     Pick the devotional deterministically: days since the couple's `createdAt` (in their
     timezone) modulo the number of devotionals, matched on `dayIndex`. Handle the P2002 race
     when both partners open the page at once.
   - `getReflectionsForViewer(sessionId, userId)`: the ONLY function that reads reflections.
     Returns `{ mine, partner }`; `partner` is `null` unless `mine` exists. Partner status
     (reflected or not) comes from `SessionProgress`, never from reflection content.
2. `submitReflection` server action: validate with zod (trimmed, length-limited), check
   the session belongs to the caller's couple and is today's, then create `Reflection` +
   `SessionProgress` in one transaction. Reflections are immutable once submitted.
3. Today page (`/today`, or the home page for paired users): scripture, body, prayer prompt,
   discussion question; your reflection form or your submitted reflection; the partner area
   shows "waiting for <name>", or "<name> has reflected, write yours to unlock", or their text.
4. Optional: a simple history list of past sessions with the same reveal rule.
5. Verify with two accounts (normal and private window): B can't see A's reflection until B submits.
