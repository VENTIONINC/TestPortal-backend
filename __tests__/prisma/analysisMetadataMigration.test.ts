// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

describe("analysis metadata migration", () => {
  it("adds nullable JSONB provenance and failure columns without backfill", () => {
    const schema = readFileSync(
      path.join(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "prisma/migrations/20261112120000_add_result_analysis_metadata/migration.sql",
      ),
      "utf8",
    );

    expect(schema).toMatch(/analysisMetadata\s+Json\?/);
    expect(schema).toMatch(/analysisLastError\s+Json\?/);
    expect(migration).toContain('ADD COLUMN "analysisMetadata" JSONB');
    expect(migration).toContain('ADD COLUMN "analysisLastError" JSONB');
    expect(migration).not.toMatch(/\bDEFAULT\b|\bNOT NULL\b|\bUPDATE\b/i);
  });
});
