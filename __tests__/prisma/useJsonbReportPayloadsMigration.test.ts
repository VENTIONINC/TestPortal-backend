// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

describe("use-jsonb-report-payloads migration", () => {
  it("documents safe [] fallbacks for malformed legacy payloads", () => {
    const migrationPath = path.join(
      process.cwd(),
      "prisma/migrations/20260522100000_use_jsonb_report_payloads/migration.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf8");

    expect(migrationSql).toContain("Malformed or non-array legacy values");
    expect(migrationSql).toContain("RETURN '[]'::jsonb;");
    expect(migrationSql).toContain(
      'ALTER COLUMN "annotations" SET NOT NULL',
    );
  });
});
