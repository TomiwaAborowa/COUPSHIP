// test/setup.ts
import { beforeEach, vi } from "vitest";
import { resetDb } from "./helpers";

// Never let the suite truncate a real database.
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error(`Refusing to run tests against non-local database host "${url.hostname}".`);
}

// prisma dev's embedded Postgres handles one connection at a time, so the
// tests share a single-connection client instead of src/lib/db's pool.
vi.mock("@/lib/db", async () => {
  const { PrismaClient } = await import("../prisma/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 });
  return { db: new PrismaClient({ adapter }) };
});

// Clerk is replaced by signInAs() from ./helpers.
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));

vi.mock("next/navigation", async () => {
  const { RedirectError } = await import("./redirect");
  return {
    redirect: (url: string) => {
      throw new RedirectError(url);
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
});
