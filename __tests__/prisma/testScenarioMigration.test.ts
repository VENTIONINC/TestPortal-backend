// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

describe("test-scenario persistence contract", () => {
  const schema = readFileSync(
    path.join(process.cwd(), "prisma/schema.prisma"),
    "utf8",
  );
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260824120000_add_test_scenarios/migration.sql",
    ),
    "utf8",
  );

  it("defines a project-owned Markdown record with creator and timestamp fields", () => {
    expect(schema).toMatch(
      /model TestScenario \{[\s\S]*id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid[\s\S]*contentMd\s+String\s+@db\.Text[\s\S]*projectId\s+String\s+@db\.Uuid/,
    );
    expect(schema).toContain("testScenarios TestScenario[]");
    expect(schema).toContain(
      'testScenariosCreated TestScenario[] @relation("TestScenarioCreatedBy")',
    );
    expect(schema).toContain(
      'createdBy User    @relation("TestScenarioCreatedBy"',
    );
  });

  it("creates only the independent scenario table and project foreign key", () => {
    expect(migration).toContain('CREATE TABLE "TestScenario"');
    expect(migration).toContain('"contentMd" TEXT NOT NULL');
    expect(migration).toContain('"createdById" UUID NOT NULL');
    expect(migration).toContain('"TestScenario_projectId_idx"');
    expect(migration).toContain('"TestScenario_projectId_createdAt_idx"');
    expect(migration).toContain('"TestScenario_projectId_fkey"');
    expect(migration).toContain('"TestScenario_createdById_idx"');
    expect(migration).toContain('"TestScenario_createdById_fkey"');
    expect(migration).not.toContain('"Spec"');
    expect(migration).not.toContain('"Execution"');
    expect(migration).not.toContain('"Issue"');
  });
});
