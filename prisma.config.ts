// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not env("DIRECT_URL"): that throws when unset, which breaks `prisma generate`
    // on deploy builds where only the runtime DATABASE_URL is needed.
    url: process.env.DIRECT_URL,
  },
});
