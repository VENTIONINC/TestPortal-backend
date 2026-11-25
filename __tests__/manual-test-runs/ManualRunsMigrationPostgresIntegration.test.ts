// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const describePostgres = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1"
  ? describe
  : describe.skip;

async function expectRejectedQuery(client: Client, query: string): Promise<void> {
  await client.query("SAVEPOINT constraint_probe");
  await expect(client.query(query)).rejects.toThrow();
  await client.query("ROLLBACK TO SAVEPOINT constraint_probe");
  await client.query("RELEASE SAVEPOINT constraint_probe");
}

describePostgres("TP-59 manual run migration", () => {
  it("preserves legacy environment values and supports long custom values", async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = `tp60_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "TestScenarioPriority" AS ENUM ('low', 'medium', 'high');
        CREATE TABLE "ManualTestRun" (
          "browser" VARCHAR(200), "operatingSystem" VARCHAR(200), "device" VARCHAR(200),
          "apiEnvironment" VARCHAR(200), "build" VARCHAR(200), "deployment" VARCHAR(200)
        );
        CREATE TABLE "ManualTestRunScenario" (id integer);
        CREATE TABLE "ManualTestRunScenarioStep" (id integer);
        INSERT INTO "ManualTestRun" ("browser", "build") VALUES ('Firefox', '42');
      `);
      await client.query(readFileSync(
        "prisma/migrations/20261115120000_manual_run_phase_two_fields/migration.sql", "utf8",
      ));
      const result = await client.query('SELECT "environmentProperties" FROM "ManualTestRun"');
      expect(result.rows[0].environmentProperties).toEqual([
        { name: "browser", value: "Firefox" }, { name: "build", value: "42" },
      ]);
      await client.query('UPDATE "ManualTestRun" SET "browser" = $1', ["x".repeat(2000)]);
      expect((await client.query('SELECT length("browser") AS length FROM "ManualTestRun"')).rows[0].length).toBe(2000);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });

  it("drops only legacy manual run data and enforces aggregate ownership and lifecycle constraints", async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = `tp59_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "TestScenarioPriority" AS ENUM ('low', 'medium', 'high');
        CREATE TYPE "ManualTestRunStatus" AS ENUM ('in_progress', 'passed', 'failed', 'blocked', 'skipped');
        CREATE TYPE "ManualTestRunStepStatus" AS ENUM ('not_started', 'passed', 'failed', 'blocked', 'skipped');
        CREATE TABLE "Project" ("id" UUID PRIMARY KEY);
        CREATE TABLE "User" ("id" UUID PRIMARY KEY);
        CREATE TABLE "TestScenario" ("id" UUID PRIMARY KEY, "projectId" UUID NOT NULL);
        CREATE TABLE "TestSuite" ("id" UUID PRIMARY KEY, "projectId" UUID NOT NULL);
        CREATE TABLE "Execution" ("id" UUID PRIMARY KEY);
        CREATE TABLE "Result" ("id" UUID PRIMARY KEY, "executionId" UUID NOT NULL);
        CREATE TABLE "ManualTestRun" (
          "id" UUID PRIMARY KEY, "projectId" UUID NOT NULL,
          "status" "ManualTestRunStatus" NOT NULL
        );
        CREATE TABLE "ManualTestRunStep" (
          "id" UUID PRIMARY KEY, "manualTestRunId" UUID NOT NULL,
          "status" "ManualTestRunStepStatus" NOT NULL
        );
        INSERT INTO "Project" VALUES ('00000000-0000-0000-0000-000000000001');
        INSERT INTO "User" VALUES ('00000000-0000-0000-0000-000000000002');
        INSERT INTO "TestScenario" VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001');
        INSERT INTO "TestSuite" VALUES ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001');
        INSERT INTO "Execution" VALUES ('00000000-0000-0000-0000-000000000005');
        INSERT INTO "Result" VALUES ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005');
        INSERT INTO "ManualTestRun" VALUES ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'in_progress');
        INSERT INTO "ManualTestRunStep" VALUES ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000007', 'not_started');
      `);

      await client.query(readFileSync(
        "prisma/migrations/20261112120000_redesign_manual_test_runs/migration.sql",
        "utf8",
      ));

      for (const table of ["Project", "User", "TestScenario", "TestSuite", "Execution", "Result"]) {
        const rows = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);
        expect(rows.rows[0]?.count).toBe(1);
      }
      expect((await client.query('SELECT * FROM "TestScenario"')).rows).toEqual([{
        id: "00000000-0000-0000-0000-000000000003",
        projectId: "00000000-0000-0000-0000-000000000001",
      }]);
      expect((await client.query('SELECT * FROM "TestSuite"')).rows[0]?.id)
        .toBe("00000000-0000-0000-0000-000000000004");
      expect((await client.query('SELECT * FROM "Project"')).rows[0]?.id)
        .toBe("00000000-0000-0000-0000-000000000001");
      expect((await client.query('SELECT * FROM "Result"')).rows).toEqual([{
        id: "00000000-0000-0000-0000-000000000006",
        executionId: "00000000-0000-0000-0000-000000000005",
      }]);
      expect((await client.query('SELECT count(*)::int AS count FROM "ManualTestRun"')).rows[0]?.count).toBe(0);
      expect((await client.query('SELECT count(*)::int AS count FROM "ManualTestRunScenario"')).rows[0]?.count).toBe(0);

      await client.query(`
        INSERT INTO "ManualTestRun" ("id", "projectId", "updatedAt", "title")
        VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now(), 'Run');
        INSERT INTO "ManualTestRunLifecycleInterval" ("id", "manualTestRunId", "projectId")
        VALUES ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
        INSERT INTO "ManualTestRunScenario" (
          "id", "manualTestRunId", "projectId", "sourceScenarioId", "sourceScenarioKey",
          "title", "position", "details", "preconditions", "testData", "folderPath"
        ) VALUES (
          '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
          'TP-SC-1', 'Scenario', 0, NULL, '', NULL, 'Folder / Login'
        );
        INSERT INTO "ManualTestRunScenarioStep" (
          "id", "manualTestRunScenarioId", "position", "action", "expectedResult"
        ) VALUES (
          '10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003',
          0, 'Open login', 'Login form'
        );
      `);

      await expectRejectedQuery(client, `
        INSERT INTO "ManualTestRunScenario" (
          "id", "manualTestRunId", "projectId", "sourceScenarioId", "sourceScenarioKey",
          "title", "position", "details", "preconditions", "testData", "folderPath"
        ) VALUES (
          '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
          'TP-SC-2', 'Scenario 2', 0, NULL, '', NULL, NULL
        )
      `);
      await expectRejectedQuery(client, `
        INSERT INTO "ManualTestRunScenario" (
          "id", "manualTestRunId", "projectId", "sourceScenarioId", "sourceScenarioKey",
          "title", "position", "details", "preconditions", "testData", "folderPath"
        ) VALUES (
          '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003',
          'TP-SC-3', 'Foreign project', 1, NULL, '', NULL, NULL
        )
      `);
      await expectRejectedQuery(client, `
        INSERT INTO "ManualTestRunScenario" (
          "id", "manualTestRunId", "projectId", "sourceScenarioId", "sourceScenarioKey",
          "title", "position", "details", "preconditions", "testData", "folderPath"
        ) VALUES (
          '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
          'TP-SC-4', 'Negative position', -1, NULL, '', NULL, NULL
        )
      `);
      await expectRejectedQuery(client, `
        INSERT INTO "ManualTestRunLifecycleInterval" (
          "id", "manualTestRunId", "projectId", "startedAt", "endedAt"
        ) VALUES (
          '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001', now(), now() - interval '1 hour'
        )
      `);
      await expectRejectedQuery(client, `
        INSERT INTO "ManualTestRunScenarioStep" (
          "id", "manualTestRunScenarioId", "position", "action"
        ) VALUES (
          '10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003',
          -1, 'Invalid step'
        )
      `);
      await expectRejectedQuery(client, `
        UPDATE "ManualTestRun"
        SET "status" = 'completed', "completedAt" = now() - interval '1 hour'
        WHERE "id" = '10000000-0000-0000-0000-000000000001'
      `);
      await client.query('DELETE FROM "ManualTestRun" WHERE "id" = $1', [
        "10000000-0000-0000-0000-000000000001",
      ]);
      expect((await client.query('SELECT count(*)::int AS count FROM "ManualTestRunScenario"')).rows[0]?.count).toBe(0);
      expect((await client.query('SELECT count(*)::int AS count FROM "ManualTestRunLifecycleInterval"')).rows[0]?.count).toBe(0);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
