// test/prayer-actions.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "../prisma/generated/prisma/client";
import { db } from "@/lib/db";
import { archivePrayer, createPrayer, markAnswered, toggleAmen } from "@/app/prayers/actions";
import { getCouplePrayers } from "@/lib/prayer";
import { createPair, form, signInAs } from "./helpers";

let alice: User, bob: User, carol: User, coupleId: string;

beforeEach(async () => {
  const pair = await createPair(["alice", "bob"]);
  ({ first: alice, second: bob } = pair);
  coupleId = pair.couple.id;
  ({ first: carol } = await createPair(["carol", "dave"]));
});

async function prayerBy(user: User, title = "Job interview") {
  signInAs(user);
  await createPrayer({}, form({ title, body: "" }));
  return db.prayerRequest.findFirstOrThrow({ where: { title, authorId: user.id } });
}

const amenCount = (prayerId: string) => db.prayerAmen.count({ where: { prayerRequestId: prayerId } });

describe("createPrayer", () => {
  it("saves a request for the caller's couple with empty details as null", async () => {
    signInAs(alice);
    expect(await createPrayer({}, form({ title: "  Job interview  ", body: "   " }))).toEqual({});

    const prayer = await db.prayerRequest.findFirstOrThrow();
    expect(prayer).toMatchObject({ title: "Job interview", body: null, coupleId, authorId: alice.id, status: "ACTIVE" });
  });

  it("requires a title within the length limit", async () => {
    signInAs(alice);
    expect((await createPrayer({}, form({ title: " " }))).error).toMatch(/title/);
    expect((await createPrayer({}, form({ title: "x".repeat(121) }))).error).toMatch(/under 120/);
    expect(await db.prayerRequest.count()).toBe(0);
  });
});

describe("toggleAmen", () => {
  it("lets the partner add and remove an Amen", async () => {
    const prayer = await prayerBy(alice);
    signInAs(bob);

    await toggleAmen(form({ prayerId: prayer.id }));
    expect(await amenCount(prayer.id)).toBe(1);
    await toggleAmen(form({ prayerId: prayer.id }));
    expect(await amenCount(prayer.id)).toBe(0);
  });

  it("ignores the author, other couples and non-active requests", async () => {
    const prayer = await prayerBy(alice);

    await toggleAmen(form({ prayerId: prayer.id })); // alice on her own
    signInAs(carol);
    await toggleAmen(form({ prayerId: prayer.id }));
    expect(await amenCount(prayer.id)).toBe(0);

    await db.prayerRequest.update({ where: { id: prayer.id }, data: { status: "ANSWERED" } });
    signInAs(bob);
    await toggleAmen(form({ prayerId: prayer.id }));
    expect(await amenCount(prayer.id)).toBe(0);
  });
});

describe("markAnswered", () => {
  it("lets the author mark a request answered with a note", async () => {
    const prayer = await prayerBy(alice);
    expect(await markAnswered({}, form({ prayerId: prayer.id, answerNote: " Got the job! " }))).toEqual({});

    const updated = await db.prayerRequest.findUniqueOrThrow({ where: { id: prayer.id } });
    expect(updated).toMatchObject({ status: "ANSWERED", answerNote: "Got the job!" });
    expect(updated.answeredAt).toBeInstanceOf(Date);

    expect((await markAnswered({}, form({ prayerId: prayer.id }))).error).toMatch(/no longer active/);
  });

  it("refuses the partner and other couples", async () => {
    const prayer = await prayerBy(alice);
    for (const user of [bob, carol]) {
      signInAs(user);
      expect((await markAnswered({}, form({ prayerId: prayer.id }))).error).toMatch(/Only the author/);
    }
    expect((await db.prayerRequest.findUniqueOrThrow({ where: { id: prayer.id } })).status).toBe("ACTIVE");
  });
});

describe("archivePrayer", () => {
  it("only lets the author archive", async () => {
    const prayer = await prayerBy(alice);
    signInAs(bob);
    await archivePrayer(form({ prayerId: prayer.id }));
    expect((await db.prayerRequest.findUniqueOrThrow({ where: { id: prayer.id } })).status).toBe("ACTIVE");

    signInAs(alice);
    await archivePrayer(form({ prayerId: prayer.id }));
    expect((await db.prayerRequest.findUniqueOrThrow({ where: { id: prayer.id } })).status).toBe("ARCHIVED");
  });
});

describe("getCouplePrayers", () => {
  it("only returns the couple's own requests, grouped by status", async () => {
    await prayerBy(alice, "Ours");
    await prayerBy(carol, "Theirs");

    const { active, answered, archived } = await getCouplePrayers(coupleId);
    expect(active.map((p) => p.title)).toEqual(["Ours"]);
    expect(answered).toEqual([]);
    expect(archived).toEqual([]);
  });
});
