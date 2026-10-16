// test/devotional.test.ts
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../prisma/generated/prisma/client";
import { db } from "@/lib/db";
import { getCoupleLocalDate, getReflectionsForViewer, getTodaySession } from "@/lib/devotional";
import { createCouple, createPair, createUser, DAY_MS } from "./helpers";

async function reflect(sessionId: string, userId: string, body: string) {
  await db.reflection.create({ data: { sessionId, userId, body } });
  await db.sessionProgress.create({ data: { sessionId, userId } });
}

describe("getCoupleLocalDate", () => {
  it("returns YYYY-MM-DD in the couple's timezone", () => {
    const at = new Date("2026-01-01T23:30:00Z");
    expect(getCoupleLocalDate("UTC", at)).toBe("2026-01-01");
    expect(getCoupleLocalDate("Africa/Lagos", at)).toBe("2026-01-02");
    expect(getCoupleLocalDate("America/New_York", at)).toBe("2026-01-01");
  });
});

describe("getTodaySession", () => {
  it("creates today's session once and reuses it", async () => {
    const { couple } = await createPair(["alice", "bob"]);
    const first = await getTodaySession(couple);
    const second = await getTodaySession(couple);

    expect(second.id).toBe(first.id);
    expect(first.localDate).toBe(getCoupleLocalDate("UTC"));
    expect(await db.devotionalSession.count()).toBe(1);
  });

  it("shares one session when both partners open the page at once", async () => {
    const { couple } = await createPair(["alice", "bob"]);
    const [a, b] = await Promise.all([getTodaySession(couple), getTodaySession(couple)]);

    expect(a.id).toBe(b.id);
    expect(await db.devotionalSession.count()).toBe(1);
  });

  it("falls back to the existing session when a concurrent insert wins", async () => {
    const { couple } = await createPair(["alice", "bob"]);
    // Simulate the partner's insert landing between our lookup and upsert.
    const upsert = vi.spyOn(db.devotionalSession, "upsert").mockImplementationOnce((async (
      args: Prisma.DevotionalSessionUpsertArgs
    ) => {
      await db.devotionalSession.create({ data: args.create as Prisma.DevotionalSessionUncheckedCreateInput });
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: Prisma.prismaVersion.client,
      });
    }) as never);

    const session = await getTodaySession(couple);
    upsert.mockRestore();

    expect(session.coupleId).toBe(couple.id);
    expect(await db.devotionalSession.count()).toBe(1);
  });

  it("rotates devotionals by days since the couple was created", async () => {
    const alice = await createUser("alice");
    const couple = await createCouple([alice.id], { createdAt: new Date(Date.now() - 4 * DAY_MS) });

    const session = await getTodaySession(couple);
    expect(session.devotional.dayIndex).toBe(4 % 3);
  });

  it("explains how to fix a missing seed", async () => {
    const { couple } = await createPair(["alice", "bob"]);
    await db.devotional.deleteMany();

    await expect(getTodaySession(couple)).rejects.toThrow(/prisma db seed/);
  });
});

describe("getReflectionsForViewer (delayed reveal)", () => {
  async function setup() {
    const { first: alice, second: bob, couple } = await createPair(["alice", "bob"]);
    const session = await getTodaySession(couple);
    return { alice, bob, session };
  }

  it("shows nothing before anyone reflects", async () => {
    const { bob, session } = await setup();
    expect(await getReflectionsForViewer(session.id, bob.id)).toEqual({
      mine: null,
      partner: null,
      partnerHasReflected: false,
    });
  });

  it("tells you your partner reflected without revealing their text", async () => {
    const { alice, bob, session } = await setup();
    await reflect(session.id, alice.id, "Alice's secret");

    const view = await getReflectionsForViewer(session.id, bob.id);
    expect(view.partnerHasReflected).toBe(true);
    expect(view.partner).toBeNull();
    expect(JSON.stringify(view)).not.toContain("Alice's secret");
  });

  it("shows your own reflection while the partner's is pending", async () => {
    const { alice, session } = await setup();
    await reflect(session.id, alice.id, "Alice's text");

    const view = await getReflectionsForViewer(session.id, alice.id);
    expect(view.mine?.body).toBe("Alice's text");
    expect(view.partner).toBeNull();
    expect(view.partnerHasReflected).toBe(false);
  });

  it("reveals both reflections once both have submitted", async () => {
    const { alice, bob, session } = await setup();
    await reflect(session.id, alice.id, "Alice's text");
    await reflect(session.id, bob.id, "Bob's text");

    expect((await getReflectionsForViewer(session.id, bob.id)).partner?.body).toBe("Alice's text");
    expect((await getReflectionsForViewer(session.id, alice.id)).partner?.body).toBe("Bob's text");
  });

  it("refuses users outside the couple", async () => {
    const { alice, session } = await setup();
    const carol = await createUser("carol");
    await reflect(session.id, alice.id, "Alice's text");

    await expect(getReflectionsForViewer(session.id, carol.id)).rejects.toThrow(/not found/);
  });
});
