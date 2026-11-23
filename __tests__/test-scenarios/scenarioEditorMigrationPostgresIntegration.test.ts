// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("TP-43 scenario identity migration", () => {
  it.each([false, true])(
    "preserves history and deterministically numbers projects (populated: %s)",
    async (populated) => {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        await client.query("BEGIN");
        const schema = `tp43_${randomUUID().replaceAll("-", "")}`;
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET LOCAL search_path TO "${schema}"`);
        await client.query(`
        CREATE TYPE "TestScenarioPriority" AS ENUM ('low', 'medium', 'high');
        CREATE TABLE "User" (id UUID PRIMARY KEY);
        CREATE TABLE "Project" (id UUID PRIMARY KEY);
        CREATE TABLE "TestScenario" (
          id UUID PRIMARY KEY, "projectId" UUID NOT NULL,
          "createdAt" TIMESTAMP NOT NULL, "scenarioKey" VARCHAR(100),
          priority "TestScenarioPriority", "contentMd" TEXT NOT NULL
        );
        CREATE TABLE "ManualTestRun" ("runKey" TEXT, "sourceScenarioKey" TEXT);
        CREATE TABLE "TestScenarioStep" (id UUID PRIMARY KEY, "testScenarioId" UUID);
        INSERT INTO "Project" VALUES
          ('00000000-0000-0000-0000-000000000001'),
          ('00000000-0000-0000-0000-000000000002'),
          ('00000000-0000-0000-0000-000000000003');
        INSERT INTO "ManualTestRun" VALUES ('custom run', 'old key'), (NULL, NULL);
      `);
        const first = "10000000-0000-0000-0000-000000000001";
        const second = "10000000-0000-0000-0000-000000000002";
        const third = "10000000-0000-0000-0000-000000000003";
        const fourth = "10000000-0000-0000-0000-000000000004";
        if (populated) {
          await client.query(
            `
          INSERT INTO "TestScenario" VALUES
            ($2, '00000000-0000-0000-0000-000000000001', '2026-01-02', 'duplicate', 'high', 'unchanged 2'),
            ($1, '00000000-0000-0000-0000-000000000001', '2026-01-02', 'duplicate', NULL, 'unchanged 1'),
            ($3, '00000000-0000-0000-0000-000000000001', '2026-01-01', NULL, 'low', 'unchanged 3'),
            ($4, '00000000-0000-0000-0000-000000000002', '2026-01-01', 'arbitrary', 'medium', 'unchanged 4');
        `,
            [first, second, third, fourth],
          );
          await client.query('INSERT INTO "TestScenarioStep" VALUES ($1, $2)', [
            randomUUID(),
            first,
          ]);
        }
        const beforeSteps = (
          await client.query('SELECT * FROM "TestScenarioStep"')
        ).rows;
        await client.query(
          readFileSync(
            "prisma/migrations/20261030210000_scenario_editor_identity/migration.sql",
            "utf8",
          ),
        );
        expect(
          (
            await client.query(
              'SELECT "lastScenarioNumber" FROM "Project" ORDER BY id',
            )
          ).rows,
        ).toEqual(
          [populated ? 3 : 0, populated ? 1 : 0, 0].map(
            (lastScenarioNumber) => ({ lastScenarioNumber }),
          ),
        );
        const scenarios = (
          await client.query('SELECT * FROM "TestScenario" ORDER BY id')
        ).rows;
        expect(
          scenarios.map(
            ({
              id,
              scenarioKey,
              scenarioNumber,
              priority,
              revision,
              updatedById,
              contentMd,
            }) => ({
              id,
              scenarioKey,
              scenarioNumber,
              priority,
              revision,
              updatedById,
              contentMd,
            }),
          ),
        ).toEqual(
          populated
            ? [
                {
                  id: first,
                  scenarioKey: "TMS-2",
                  scenarioNumber: 2,
                  priority: "medium",
                  revision: 1,
                  updatedById: null,
                  contentMd: "unchanged 1",
                },
                {
                  id: second,
                  scenarioKey: "TMS-3",
                  scenarioNumber: 3,
                  priority: "high",
                  revision: 1,
                  updatedById: null,
                  contentMd: "unchanged 2",
                },
                {
                  id: third,
                  scenarioKey: "TMS-1",
                  scenarioNumber: 1,
                  priority: "low",
                  revision: 1,
                  updatedById: null,
                  contentMd: "unchanged 3",
                },
                {
                  id: fourth,
                  scenarioKey: "TMS-1",
                  scenarioNumber: 1,
                  priority: "medium",
                  revision: 1,
                  updatedById: null,
                  contentMd: "unchanged 4",
                },
              ]
            : [],
        );
        expect(
          (await client.query('SELECT * FROM "ManualTestRun"')).rows,
        ).toEqual([
          { runKey: "custom run", sourceScenarioKey: "old key" },
          { runKey: null, sourceScenarioKey: null },
        ]);
        expect(
          (await client.query('SELECT * FROM "TestScenarioStep"')).rows,
        ).toEqual(beforeSteps);
        if (populated) {
          await client.query("SAVEPOINT constraints");
          await expect(
            client.query(
              'UPDATE "TestScenario" SET "scenarioNumber" = 0 WHERE id = $1',
              [first],
            ),
          ).rejects.toMatchObject({ code: "23514" });
          await client.query("ROLLBACK TO SAVEPOINT constraints");
          await expect(
            client.query(
              'UPDATE "TestScenario" SET "scenarioNumber" = 3 WHERE id = $1',
              [first],
            ),
          ).rejects.toMatchObject({ code: "23505" });
          await client.query("ROLLBACK TO SAVEPOINT constraints");
          await expect(
            client.query(
              'UPDATE "TestScenario" SET priority = NULL WHERE id = $1',
              [first],
            ),
          ).rejects.toMatchObject({ code: "23502" });
        }
      } finally {
        await client.query("ROLLBACK");
        await client.end();
      }
    },
  );
});
