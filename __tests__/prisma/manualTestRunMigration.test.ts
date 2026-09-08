// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

describe("manual test run persistence contract", () => {
  const read = (file: string): string =>
    readFileSync(path.join(process.cwd(), file), "utf8");
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20260908120000_add_manual_test_runs/migration.sql",
  );
  const projectModel = read("src/models/projectModel.ts");

  it("defines independent run and step aggregates with nullable live relations", () => {
    expect(schema).toContain("enum ManualTestRunStatus");
    expect(schema).toContain("enum ManualTestRunStepStatus");
    expect(schema).toMatch(
      /model ManualTestRun \{[\s\S]*testScenarioId\s+String\?[\s\S]*sourceTestScenarioId\s+String[\s\S]*executedById\s+String\?/,
    );
    expect(schema).toMatch(
      /testScenario\s+TestScenario\?\s+@relation\(fields: \[testScenarioId\], references: \[id\], onDelete: SetNull\)/,
    );
    expect(schema).toMatch(
      /executedBy\s+User\?\s+@relation\("ManualTestRunExecutedBy", fields: \[executedById\], references: \[id\], onDelete: SetNull\)/,
    );
    expect(schema).toContain("@@unique([manualTestRunId, position])");
  });

  it("uses an additive migration with structural and lifecycle checks", () => {
    expect(migration).toContain('CREATE TYPE "ManualTestRunStatus"');
    expect(migration).toContain('CREATE TABLE "ManualTestRun"');
    expect(migration).toContain('CREATE TABLE "ManualTestRunStep"');
    expect(migration).toContain('CHECK ("position" >= 0)');
    expect(migration).toContain('"ManualTestRun_completedAt_status_check"');
    expect(migration).toContain('"ManualTestRun_completedAt_startedAt_check"');
    expect(migration).toContain("ON DELETE SET NULL");
    expect(migration).toContain("ON DELETE CASCADE");
    expect(migration).toContain(
      'CREATE INDEX "ManualTestRun_projectId_sourceTestScenarioId_startedAt_id_idx"',
    );
    expect(migration).not.toContain("DELETE FROM");
  });

  it("deletes runs before scenarios during project cascade", () => {
    const runDelete = projectModel.indexOf("tx.manualTestRun.deleteMany");
    const scenarioDelete = projectModel.indexOf("tx.testScenario.deleteMany");
    const projectDelete = projectModel.indexOf("tx.project.delete");
    expect(runDelete).toBeGreaterThan(-1);
    expect(runDelete).toBeLessThan(scenarioDelete);
    expect(scenarioDelete).toBeLessThan(projectDelete);
  });
});
