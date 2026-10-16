// test/rls.test.ts
// Checks the RLS policies that guard supabase-js / Realtime access, by querying
// as Supabase's `authenticated` role with a fake Clerk JWT.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getTodaySession } from "@/lib/devotional";
import { createPair } from "./helpers";

class Rollback extends Error {
  constructor(public rows: Record<string, unknown>[]) {
    super("rollback");
  }
}

// Runs a query as the given Clerk user inside a transaction that is always
// rolled back, so nothing it does persists.
async function asUser(sub: string, sql: string, params: unknown[] = []) {
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
      await tx.$executeRawUnsafe("SELECT set_config('request.jwt.claims', $1, true)", JSON.stringify({ sub, role: "authenticated" }));
      throw new Rollback(await tx.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params));
    });
  } catch (e) {
    if (e instanceof Rollback) return e.rows;
    throw e;
  }
  throw new Error("unreachable");
}

let sessionId: string;

beforeEach(async () => {
  const { couple } = await createPair(["alice", "bob"]);
  await createPair(["carol", "dave"]);
  sessionId = (await getTodaySession(couple)).id;
  await db.reflection.create({ data: { sessionId, userId: "alice", body: "Alice's secret" } });
  await db.sessionProgress.create({ data: { sessionId, userId: "alice" } });
});

const reflections = `SELECT body FROM reflections WHERE "sessionId" = $1`;
const progress = `SELECT "userId" FROM session_progress WHERE "sessionId" = $1`;

describe("RLS policies", () => {
  it("lets the partner see progress but not the reflection before reflecting", async () => {
    expect(await asUser("bob", progress, [sessionId])).toEqual([{ userId: "alice" }]);
    expect(await asUser("bob", reflections, [sessionId])).toEqual([]);
  });

  it("reveals the partner's reflection after you reflect", async () => {
    await db.reflection.create({ data: { sessionId, userId: "bob", body: "Bob's text" } });
    const bodies = (await asUser("bob", reflections, [sessionId])).map((r) => r.body).sort();
    expect(bodies).toEqual(["Alice's secret", "Bob's text"]);
  });

  it("hides everything from other couples", async () => {
    expect(await asUser("carol", progress, [sessionId])).toEqual([]);
    expect(await asUser("carol", reflections, [sessionId])).toEqual([]);
    expect(await asUser("carol", `SELECT id FROM users WHERE id IN ('alice', 'bob')`)).toEqual([]);
  });

  it("hides everything from requests without a user", async () => {
    expect(await asUser("", reflections, [sessionId])).toEqual([]);
    expect(await asUser("", `SELECT id FROM couples`)).toEqual([]);
  });

  it("blocks inserts through the API", async () => {
    await expect(
      asUser("bob", `INSERT INTO session_progress ("sessionId", "userId") VALUES ($1, 'bob')`, [sessionId])
    ).rejects.toThrow(/row-level security/);
    expect(await db.sessionProgress.count()).toBe(1);
  });

  // UPDATE/DELETE as `authenticated` crash prisma dev's embedded Postgres
  // (PGlite), so the read-only guarantee is checked from the catalog: RLS is on
  // for every table and no policy allows anything but SELECT.
  it("has RLS on every table and only SELECT policies", async () => {
    const unprotected = await db.$queryRawUnsafe(
      `SELECT relname FROM pg_class
       WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity`
    );
    expect(unprotected).toEqual([]);

    const writePolicies = await db.$queryRawUnsafe(
      `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND cmd <> 'SELECT'`
    );
    expect(writePolicies).toEqual([]);
  });
});
