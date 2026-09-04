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
  const linkMigration = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260826120000_add_test_scenario_spec_links/migration.sql",
    ),
    "utf8",
  );
  const detailsMigration = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260904120000_add_test_scenario_details/migration.sql",
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

  it("defines a cascading unique scenario/Spec join without changing existing data", () => {
    expect(schema).toMatch(
      /model TestScenarioSpecLink \{[\s\S]*testScenarioId\s+String @db\.Uuid[\s\S]*specId\s+String @db\.Uuid[\s\S]*@@id\(\[testScenarioId, specId\]\)[\s\S]*@@index\(\[specId\]\)/,
    );
    expect(schema).toContain("specLinks TestScenarioSpecLink[]");
    expect(schema).toContain("testScenarioLinks TestScenarioSpecLink[]");
    expect(linkMigration).toContain('CREATE TABLE "TestScenarioSpecLink"');
    expect(linkMigration).toContain(
      'CONSTRAINT "TestScenarioSpecLink_pkey" PRIMARY KEY ("testScenarioId", "specId")',
    );
    expect(linkMigration).toContain(
      'REFERENCES "TestScenario"("id") ON DELETE CASCADE',
    );
    expect(linkMigration).toContain(
      'REFERENCES "Spec"("id") ON DELETE CASCADE',
    );
    expect(linkMigration).toContain(
      'CREATE INDEX "TestScenarioSpecLink_specId_idx"',
    );
    expect(linkMigration).toContain(
      'CREATE INDEX "Result_specId_startTime_idx"',
    );
    expect(linkMigration).toContain(
      'CREATE INDEX "ResultError_resultId_idx"',
    );
    expect(linkMigration).toContain(
      'CREATE INDEX "Assumption_issueId_idx"',
    );
    expect(linkMigration).toContain(
      'CREATE INDEX "Assumption_resultErrorId_idx"',
    );
  });

  it("adds nullable details without changing existing scenario relations", () => {
    expect(schema).toMatch(
      /model TestScenario \{[\s\S]*contentMd\s+String\s+@db\.Text[\s\S]*details\s+String\?\s+@db\.Text/,
    );
    expect(detailsMigration).toContain(
      'ALTER TABLE "TestScenario" ADD COLUMN "details" TEXT;',
    );
    expect(detailsMigration).not.toContain("NOT NULL");
    expect(detailsMigration).not.toContain("DEFAULT");
    expect(detailsMigration).not.toContain("DROP");
    expect(detailsMigration).not.toContain("FOREIGN KEY");
    expect(detailsMigration).not.toContain("CREATE INDEX");
    expect(migration).toContain(
      'CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId")',
    );
    expect(migration).toContain(
      'CONSTRAINT "TestScenario_createdById_fkey" FOREIGN KEY ("createdById")',
    );
  });
});
