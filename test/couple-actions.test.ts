// test/couple-actions.test.ts
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getTodaySession } from "@/lib/devotional";
import { requirePairedUser } from "@/lib/couple";
import { unpair } from "@/app/couple/actions";
import { createPair, form, signInAs } from "./helpers";

// A couple with a session, both reflections and a prayer with an Amen.
async function coupleWithHistory(names: [string, string]) {
  const { first, second, couple } = await createPair(names);
  const session = await getTodaySession(couple);
  for (const user of [first, second]) {
    await db.reflection.create({ data: { sessionId: session.id, userId: user.id, body: `${user.id} text` } });
    await db.sessionProgress.create({ data: { sessionId: session.id, userId: user.id } });
  }
  const prayer = await db.prayerRequest.create({
    data: { coupleId: couple.id, authorId: first.id, title: `${first.id}'s prayer` },
  });
  await db.prayerAmen.create({ data: { prayerRequestId: prayer.id, userId: second.id } });
  return { first, second, couple };
}

describe("unpair", () => {
  it("requires typing unpair", async () => {
    const { first, couple } = await coupleWithHistory(["alice", "bob"]);
    signInAs(first);

    expect((await unpair({}, form({ confirm: "yes" }))).error).toMatch(/Type "unpair"/);
    expect(await db.couple.findUnique({ where: { id: couple.id } })).not.toBeNull();
  });

  it("deletes the couple and all its history, sending both partners to /pair", async () => {
    const { first, second, couple } = await coupleWithHistory(["alice", "bob"]);
    signInAs(first);

    await expect(unpair({}, form({ confirm: " Unpair " }))).rejects.toMatchObject({ url: "/pair" });

    expect(await db.couple.findUnique({ where: { id: couple.id } })).toBeNull();
    expect(await db.devotionalSession.count({ where: { coupleId: couple.id } })).toBe(0);
    expect(await db.reflection.count({ where: { userId: { in: ["alice", "bob"] } } })).toBe(0);
    expect(await db.prayerRequest.count({ where: { coupleId: couple.id } })).toBe(0);
    expect(await db.prayerAmen.count({ where: { userId: "bob" } })).toBe(0);

    // The users themselves remain and can pair again.
    expect(await db.user.count({ where: { id: { in: ["alice", "bob"] } } })).toBe(2);
    signInAs(second);
    await expect(requirePairedUser()).rejects.toMatchObject({ url: "/pair" });
  });

  it("leaves other couples untouched", async () => {
    const { first } = await coupleWithHistory(["alice", "bob"]);
    const other = await coupleWithHistory(["carol", "dave"]);
    signInAs(first);

    await expect(unpair({}, form({ confirm: "unpair" }))).rejects.toMatchObject({ url: "/pair" });

    expect(await db.couple.findUnique({ where: { id: other.couple.id } })).not.toBeNull();
    expect(await db.reflection.count({ where: { userId: { in: ["carol", "dave"] } } })).toBe(2);
    expect(await db.prayerAmen.count({ where: { userId: "dave" } })).toBe(1);
  });

  it("sends unpaired users to /pair without deleting anything", async () => {
    const { couple } = await coupleWithHistory(["alice", "bob"]);
    signInAs(await db.user.create({ data: { id: "loner", name: "loner" } }));

    await expect(unpair({}, form({ confirm: "unpair" }))).rejects.toMatchObject({ url: "/pair" });
    expect(await db.couple.findUnique({ where: { id: couple.id } })).not.toBeNull();
  });
});
