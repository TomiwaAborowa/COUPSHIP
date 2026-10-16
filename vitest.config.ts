// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The real package throws outside React Server Components.
      "server-only": path.resolve(__dirname, "test/empty.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Every test file shares one database, so run them one at a time.
    fileParallelism: false,
    env: {
      // Must match TEST_DATABASE_URL in scripts/test-db.mjs.
      DATABASE_URL: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
    },
  },
});
