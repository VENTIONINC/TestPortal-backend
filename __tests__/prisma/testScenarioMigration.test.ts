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
  const structuredMigration = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260906120000_add_structured_test_scenario_authoring/migration.sql",
    ),
    "utf8",
  );
  const cascadeMigration = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20260907120000_cascade_project_deletion/migration.sql",
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

  it("cascades project deletion through scenarios without duplicating indexes", () => {
    expect(schema).toContain(
      'project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)',
    );
    expect(cascadeMigration).toContain(
      'DROP CONSTRAINT "TestScenario_projectId_fkey"',
    );
    expect(cascadeMigration).toContain(
      'FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    expect(cascadeMigration).toContain(
      'CREATE INDEX "Result_executionId_idx"',
    );
    expect(cascadeMigration).not.toContain(
      'CREATE INDEX "ResultError_resultId_idx"',
    );
    expect(cascadeMigration).not.toContain(
      'CREATE INDEX "Assumption_issueId_idx"',
    );
    expect(cascadeMigration).not.toContain(
      'CREATE INDEX "Assumption_resultErrorId_idx"',
    );
    expect(cascadeMigration).not.toContain('CREATE INDEX "Result_specId_idx"');
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

  it("defines nullable structured fields and generated projection metadata", () => {
    expect(schema).toMatch(
      /model TestScenario \{[\s\S]*details\s+String\?\s+@db\.Text[\s\S]*objective\s+String\?\s+@db\.Text[\s\S]*contentMd\s+String\s+@db\.Text[\s\S]*contentMdHash\s+String\s+@db\.Char\(64\)[\s\S]*contentMdFormatVersion\s+Int\s+@default\(1\)/,
    );
    expect(detailsMigration).toContain('ALTER TABLE "TestScenario" ADD COLUMN "details" TEXT;');
    expect(structuredMigration.indexOf('DELETE FROM "TestScenarioSpecLink"')).toBeLessThan(
      structuredMigration.indexOf('DELETE FROM "TestScenario"'),
    );
    expect(structuredMigration).toContain('ADD COLUMN "contentMdHash" CHAR(64) NOT NULL');
    expect(structuredMigration).toContain('ADD COLUMN "contentMdFormatVersion" INTEGER NOT NULL DEFAULT 1');
    expect(structuredMigration).toContain('CREATE TABLE "TestScenarioStep"');
    expect(structuredMigration).toContain('CHECK ("position" >= 0)');
    expect(structuredMigration).toContain('CREATE UNIQUE INDEX "TestScenarioStep_testScenarioId_position_key"');
    expect(structuredMigration).not.toContain('TestScenarioStep_testScenarioId_position_idx');
    expect(schema).not.toContain('@@index([testScenarioId, position])');
    expect(structuredMigration).toContain('ON DELETE CASCADE ON UPDATE CASCADE');
    expect(migration).toContain(
      'CONSTRAINT "TestScenario_projectId_fkey" FOREIGN KEY ("projectId")',
    );
    expect(migration).toContain(
      'CONSTRAINT "TestScenario_createdById_fkey" FOREIGN KEY ("createdById")',
    );
  });
});
