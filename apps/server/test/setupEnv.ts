import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Runs before every test file, before any app module is imported.
// Unlike --env-file, this OVERRIDES existing vars, so a DATABASE_URL exported
// in your shell can never point the tests at the dev database.
Object.assign(process.env, parseEnv(readFileSync(new URL("../.env.test", import.meta.url), "utf8")));

if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(`Refusing to run tests against a non-test database: ${process.env.DATABASE_URL}`);
}
