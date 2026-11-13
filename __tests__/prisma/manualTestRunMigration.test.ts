// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

describe("manual test run persistence contract", () => {
  const read = (file: string): string =>
    readFileSync(path.join(process.cwd(), file), "utf8");
  const schema = read("prisma/schema.prisma");
  const migration = read(
    "prisma/migrations/20261112120000_redesign_manual_test_runs/migration.sql",
  );

  it("defines the run aggregate with scenario snapshots and lifecycle intervals", () => {
    expect(schema).toContain("enum ManualTestRunStatus");
    expect(schema).toContain("enum ManualTestRunScenarioResult");
    expect(schema).toMatch(/model ManualTestRun \{[\s\S]*scenarios\s+ManualTestRunScenario\[\][\s\S]*intervals\s+ManualTestRunLifecycleInterval\[\]/);
    expect(schema).toMatch(/model ManualTestRunScenario \{[\s\S]*sourceScenarioId\s+String[\s\S]*result\s+ManualTestRunScenarioResult[\s\S]*assigneeId\s+String\?/);
    expect(schema).toMatch(/model ManualTestRunScenarioStep \{[\s\S]*action\s+String[\s\S]*expectedResult\s+String\?/);
    expect(schema).toContain("@@unique([manualTestRunId, position])");
    expect(schema).toContain("@@unique([id, projectId])");
  });

  it("replaces the legacy model with one-way aggregate migration constraints", () => {
    expect(migration).toContain('DROP TABLE IF EXISTS "ManualTestRunStep"');
    expect(migration).toContain('DROP TABLE IF EXISTS "ManualTestRun"');
    expect(migration).toContain('CREATE TYPE "ManualTestRunScenarioResult"');
    expect(migration).toContain('CREATE TABLE "ManualTestRunScenario"');
    expect(migration).toContain('CREATE TABLE "ManualTestRunScenarioStep"');
    expect(migration).toContain('CREATE TABLE "ManualTestRunLifecycleInterval"');
    expect(migration).toContain('"ManualTestRun_lifecycle_check"');
    expect(migration).toContain('"ManualTestRunScenario_position_check"');
    expect(migration).toContain('WHERE "endedAt" IS NULL');
    expect(migration).toContain("ON DELETE SET NULL");
    expect(migration).toContain("ON DELETE CASCADE");
    expect(migration).not.toContain("DELETE FROM");
    expect(schema).not.toContain("ManualTestRunStepStatus");
    expect(schema).not.toContain("runKey");
    const snapshotModel = schema.match(/model ManualTestRunScenario \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(snapshotModel).not.toContain("contentMd");
  });

});
