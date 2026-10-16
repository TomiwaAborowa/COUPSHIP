// scripts/test-db.mjs
// Prepares a local Postgres for the test suite: starts a `prisma dev` server,
// adds stand-ins for the Supabase pieces the migrations expect, then migrates.
// Starts a fresh server every run so a crashed one can't leak into the next.
import { execSync } from "node:child_process";
import pg from "pg";

export const TEST_DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

async function run(sql) {
  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

console.log("Starting a fresh local test database (prisma dev)…");
for (const cmd of ["npx prisma dev stop coupship-test", "npx prisma dev rm coupship-test"]) {
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch {
    // Not running / doesn't exist yet.
  }
}
execSync("npx prisma dev -d -n coupship-test -p 51213 -P 51214 --shadow-db-port 51215", {
  stdio: "ignore",
});

// Supabase provides these; plain Postgres doesn't.
await run(`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
    $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
`);

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, DIRECT_URL: TEST_DATABASE_URL },
});

// Supabase grants the API roles full table privileges and relies on RLS; mirror that.
await run(`
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`);

console.log("Test database ready.");
