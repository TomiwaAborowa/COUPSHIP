// test/pair-actions.test.ts
import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveInvite } from "@/lib/couple";
import { createInvite, joinWithCode } from "@/app/pair/actions";
import { createPair, createUser, DAY_MS, form, signInAs } from "./helpers";

async function inviteFrom(name: string) {
  const user = await createUser(name);
  signInAs(user);
  await createInvite({}, form({ timezone: "Africa/Lagos" }));
  const couple = await db.couple.findFirstOrThrow({ where: { members: { some: { userId: user.id } } } });
  return { user, couple, code: couple.inviteCode! };
}

describe("createInvite", () => {
  it("creates a pending couple with a readable 6-character code", async () => {
    const { user, couple, code } = await inviteFrom("alice");

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(couple.status).toBe("PENDING");
    expect(couple.timezone).toBe("Africa/Lagos");
    expect(couple.inviteExpiresAt!.getTime()).toBeGreaterThan(Date.now() + DAY_MS - 60_000);
    expect(await db.coupleMember.findUnique({ where: { userId: user.id } })).not.toBeNull();
  });

  it("falls back to UTC for an invalid timezone", async () => {
    signInAs(await createUser("alice"));
    await createInvite({}, form({ timezone: "Not/AZone" }));
    expect((await db.couple.findFirstOrThrow()).timezone).toBe("UTC");
  });

  it("reuses the same pending couple when making a new code", async () => {
    const { couple } = await inviteFrom("alice");
    await db.couple.update({ where: { id: couple.id }, data: { inviteExpiresAt: new Date(0) } });

    await createInvite({}, form({}));
    expect(await db.couple.count()).toBe(1);
    expect(getActiveInvite(await db.couple.findFirstOrThrow())).not.toBeNull();
  });

  it("sends already-paired users home", async () => {
    const { first } = await createPair(["alice", "bob"]);
    signInAs(first);
    await expect(createInvite({}, form({}))).rejects.toMatchObject({ url: "/" });
  });
});

describe("joinWithCode", () => {
  it("pairs the couple, clears the code and sends the joiner home", async () => {
    const { couple, code } = await inviteFrom("alice");
    signInAs(await createUser("bob"));

    // Lowercase and spacing are normalised.
    const typed = ` ${code.slice(0, 3).toLowerCase()} ${code.slice(3)} `;
    await expect(joinWithCode({}, form({ code: typed }))).rejects.toMatchObject({ url: "/" });

    const paired = await db.couple.findUniqueOrThrow({ where: { id: couple.id }, include: { members: true } });
    expect(paired.status).toBe("ACTIVE");
    expect(paired.inviteCode).toBeNull();
    expect(paired.inviteExpiresAt).toBeNull();
    expect(paired.members.map((m) => m.userId).sort()).toEqual(["alice", "bob"]);
  });

  it("rejects malformed, unknown and expired codes", async () => {
    const { couple, code } = await inviteFrom("alice");
    signInAs(await createUser("bob"));

    expect((await joinWithCode({}, form({ code: "ABC" }))).error).toMatch(/6-character/);
    expect((await joinWithCode({}, form({ code: "ZZZZZZ" }))).error).toMatch(/invalid or has expired/);

    await db.couple.update({ where: { id: couple.id }, data: { inviteExpiresAt: new Date(Date.now() - 1000) } });
    expect((await joinWithCode({}, form({ code }))).error).toMatch(/invalid or has expired/);
  });

  it("rejects joining your own code", async () => {
    const { code } = await inviteFrom("alice");
    expect((await joinWithCode({}, form({ code }))).error).toMatch(/your own code/);
  });

  it("rejects users who are already paired", async () => {
    const { code } = await inviteFrom("alice");
    const { first: carol } = await createPair(["carol", "dave"]);
    signInAs(carol);

    expect((await joinWithCode({}, form({ code }))).error).toMatch(/already paired/);
  });

  it("drops the joiner's own unused invite", async () => {
    const { code } = await inviteFrom("alice");
    const { couple: bobsPending } = await inviteFrom("bob");

    await expect(joinWithCode({}, form({ code }))).rejects.toMatchObject({ url: "/" });
    expect(await db.couple.findUnique({ where: { id: bobsPending.id } })).toBeNull();
    expect(await db.couple.count()).toBe(1);
  });

  it("lets only one person claim a code when two join at once", async () => {
    const { couple, code } = await inviteFrom("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    vi.mocked(getCurrentUser).mockResolvedValueOnce(bob).mockResolvedValueOnce(carol);

    const results = await Promise.allSettled([
      joinWithCode({}, form({ code })),
      joinWithCode({}, form({ code })),
    ]);

    const redirected = results.filter((r) => r.status === "rejected");
    const refused = results.filter((r) => r.status === "fulfilled");
    expect(redirected).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(await db.coupleMember.count({ where: { coupleId: couple.id } })).toBe(2);
  });
});

describe("getActiveInvite", () => {
  it("returns the code with hours left, or null once expired", () => {
    const inThreeHours = new Date(Date.now() + 2.5 * 60 * 60 * 1000);
    expect(getActiveInvite({ inviteCode: "ABC234", inviteExpiresAt: inThreeHours })).toEqual({
      code: "ABC234",
      hoursLeft: 3,
    });
    expect(getActiveInvite({ inviteCode: "ABC234", inviteExpiresAt: new Date(Date.now() - 1) })).toBeNull();
    expect(getActiveInvite({ inviteCode: null, inviteExpiresAt: null })).toBeNull();
    expect(getActiveInvite(undefined)).toBeNull();
  });
});
