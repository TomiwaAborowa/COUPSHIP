// test/today-actions.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getTodaySession } from "@/lib/devotional";
import { submitReflection } from "@/app/today/actions";
import { createPair, createUser, form, signInAs } from "./helpers";
import { RedirectError } from "./redirect";

describe("submitReflection", () => {
  let ctx: Awaited<ReturnType<typeof setup>>;

  async function setup() {
    const { first: alice, second: bob, couple } = await createPair(["alice", "bob"]);
    const session = await getTodaySession(couple);
    signInAs(alice);
    return { alice, bob, couple, session };
  }

  const submit = (sessionId: string, body: string) =>
    submitReflection({}, form({ sessionId, body }));

  beforeEach(async () => {
    ctx = await setup();
  });

  it("saves a trimmed reflection and progress together", async () => {
    expect(await submit(ctx.session.id, "  Grateful today  ")).toEqual({});

    const reflection = await db.reflection.findFirstOrThrow({ where: { userId: ctx.alice.id } });
    expect(reflection.body).toBe("Grateful today");
    expect(await db.sessionProgress.count({ where: { userId: ctx.alice.id } })).toBe(1);
  });

  it("rejects blank and overlong reflections", async () => {
    expect((await submit(ctx.session.id, "   ")).error).toMatch(/Write something/);
    expect((await submit(ctx.session.id, "x".repeat(4001))).error).toMatch(/under 4000/);
    expect(await db.reflection.count()).toBe(0);
  });

  it("does not allow a second submission", async () => {
    await submit(ctx.session.id, "First");
    expect((await submit(ctx.session.id, "Second")).error).toMatch(/already reflected/);

    const reflections = await db.reflection.findMany();
    expect(reflections.map((r) => r.body)).toEqual(["First"]);
    expect(await db.sessionProgress.count()).toBe(1);
  });

  it("rejects another couple's session", async () => {
    const { couple: otherCouple } = await createPair(["carol", "dave"]);
    const otherSession = await getTodaySession(otherCouple);

    expect((await submit(otherSession.id, "Sneaky")).error).toBe("Session not found.");
    expect(await db.reflection.count()).toBe(0);
  });

  it("rejects a past day's session", async () => {
    const past = await db.devotionalSession.create({
      data: { coupleId: ctx.couple.id, devotionalId: ctx.session.devotionalId, localDate: "2000-01-01" },
    });

    expect((await submit(past.id, "Late")).error).toMatch(/ended/);
  });

  it("sends unpaired users to /pair", async () => {
    signInAs(await createUser("loner"));
    await expect(submit(ctx.session.id, "Hi")).rejects.toThrow(RedirectError);
    await expect(submit(ctx.session.id, "Hi")).rejects.toMatchObject({ url: "/pair" });
  });
});
