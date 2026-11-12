// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const describePostgres = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1"
  ? describe : describe.skip;

describePostgres("TP-20 field migration", () => {
  it("removes obsolete columns without rewriting Markdown or execution data", async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query("BEGIN");
      const schema = `tp20_${randomUUID().replaceAll("-", "")}`;
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`
        CREATE TABLE "TestScenario" (
          id INTEGER PRIMARY KEY, objective TEXT, "expectedResult" TEXT, notes TEXT,
          "contentMd" TEXT NOT NULL, "contentMdHash" CHAR(64) NOT NULL,
          "contentMdFormatVersion" INTEGER NOT NULL
        );
        CREATE TABLE "ManualTestRun" (
          id INTEGER PRIMARY KEY, objective TEXT, "expectedResult" TEXT,
          "scenarioNotes" TEXT, notes TEXT
        );
        CREATE TABLE "TestScenarioStep" ("expectedResult" TEXT);
        CREATE TABLE "ManualTestRunStep" ("expectedResult" TEXT, notes TEXT);
        INSERT INTO "TestScenario" VALUES
          (1, 'old objective', 'old expected', 'old notes', '# Legacy bytes', repeat('a', 64), 1);
        INSERT INTO "ManualTestRun" VALUES
          (1, 'old objective', 'old expected', 'old scenario notes', 'execution notes');
        INSERT INTO "TestScenarioStep" VALUES ('step expectation');
        INSERT INTO "ManualTestRunStep" VALUES ('copied expectation', 'step execution notes');
      `);
      await client.query(readFileSync(
        "prisma/migrations/20261023120000_tms_scenario_metadata/migration.sql", "utf8",
      ));
      const scenario = await client.query('SELECT * FROM "TestScenario"');
      expect(scenario.rows).toEqual([{
        id: 1, contentMd: "# Legacy bytes", contentMdHash: "a".repeat(64),
        contentMdFormatVersion: 1, priority: null, relatedIssueUrl: null,
      }]);
      expect((await client.query('SELECT * FROM "ManualTestRun"')).rows)
        .toEqual([{ id: 1, notes: "execution notes" }]);
      expect((await client.query('SELECT * FROM "TestScenarioStep"')).rows)
        .toEqual([{ expectedResult: "step expectation" }]);
      expect((await client.query('SELECT * FROM "ManualTestRunStep"')).rows)
        .toEqual([{ expectedResult: "copied expectation", notes: "step execution notes" }]);
      const enumValues = await client.query(
        `SELECT unnest(enum_range(NULL::"TestScenarioPriority"))::text AS value`,
      );
      expect(enumValues.rows).toEqual([{ value: "low" }, { value: "medium" }, { value: "high" }]);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
