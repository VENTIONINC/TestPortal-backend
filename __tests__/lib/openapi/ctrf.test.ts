// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";
import { processCtrfReportSchema } from "@/mcp/schemas/ctrfSchemas";
import type { z } from "zod/v3";

const conformantReport = {
  reportFormat: "CTRF",
  specVersion: "0.0.0",
  results: {
    tool: { name: "other" },
    summary: { tests: 1, passed: 0, failed: 1, pending: 0, skipped: 0, other: 0, start: 1, stop: 2 },
    tests: [{ name: "fails", status: "failed", duration: 1, suite: ["suite"], retries: 0, extra: { testPortal: { version: 1, errors: [{ index: 0, message: "boom", rawLogs: ["log"] }] } } }],
  },
};

describe("CTRF REST and MCP contracts", () => {
  it("documents required root metadata and namespaced diagnostics", () => {
    const schemas = generateOpenAPISpec().components?.schemas ?? {};
    expect(schemas.CTRFReportRequest).toMatchObject({
      required: expect.arrayContaining(["reportFormat", "specVersion", "results"]),
    });
    expect(JSON.stringify(schemas.CTRFTest)).toContain('"testPortal"');
    expect(JSON.stringify(schemas.CTRFTest)).toContain('"retryAttempts"');
  });

  it("accepts the same conformant report through the MCP runtime schema", () => {
    const reportSchema = processCtrfReportSchema.report as z.ZodSchema;
    expect(reportSchema.safeParse(conformantReport).success).toBe(true);
  });
});
