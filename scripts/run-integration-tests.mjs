// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (!testDatabaseUrl) {
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated PostgreSQL database before running integration tests.",
  );
}

let testDatabase;
try {
  testDatabase = new URL(testDatabaseUrl);
} catch {
  throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
}

if (testDatabase.protocol !== "postgresql:" && testDatabase.protocol !== "postgres:") {
  throw new Error("TEST_DATABASE_URL must use the PostgreSQL protocol.");
}

const exampleEnvironment = readFileSync(
  path.join(repositoryRoot, ".env.example"),
  "utf8",
);
const baseDatabaseUrlMatch = exampleEnvironment.match(
  /^DATABASE_URL="?([^"\n]+)"?$/m,
);

if (!baseDatabaseUrlMatch?.[1]) {
  throw new Error("Could not determine the base database name from .env.example.");
}

const baseDatabaseName = new URL(baseDatabaseUrlMatch[1]).pathname.slice(1);
const testDatabaseName = decodeURIComponent(testDatabase.pathname.slice(1));

if (!testDatabaseName.startsWith(`${baseDatabaseName}_`)) {
  throw new Error(
    `Refusing database '${testDatabaseName}': integration tests require a dedicated database named with the '${baseDatabaseName}_' prefix.`,
  );
}

const jestBin = path.join(repositoryRoot, "node_modules", "jest", "bin", "jest.js");
const result = spawnSync(
  process.execPath,
  [
    jestBin,
    "--config",
    "jest.main.config.ts",
    "--selectProjects",
    "integration",
    "--runInBand",
    ...process.argv.slice(2),
  ],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      RUN_POSTGRES_INTEGRATION_TESTS: "1",
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
