// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

describe("report upload OpenAPI contracts", () => {
  it("documents clean success responses and validation errors for every upload", () => {
    const spec = generateOpenAPISpec();
    const componentSchemas = spec.components?.schemas ?? {};
    expect(componentSchemas.FutureExecutionTimestampsWarning).toBeUndefined();

    const responseSchemas = new Map([
      ["/api/v2/upload-json-report", "JsonReportResponse"],
      [
        "/api/v2/upload-json-report-api-key",
        "JsonReportResponseWithAnalysis",
      ],
      ["/api/v2/upload-ctrf-report", "CTRFReportResponse"],
      ["/api/v2/upload-ctrf-report-api-key", "CTRFReportResponse"],
    ]);

    for (const [path, componentName] of responseSchemas) {
      const responseSchema = spec.paths?.[path]?.post?.responses?.["201"]
        ?.content?.["application/json"]?.schema;

      expect(responseSchema).toEqual({
        $ref: `#/components/schemas/${componentName}`,
      });
      expect(JSON.stringify(componentSchemas[componentName])).not.toContain(
        '"warnings"',
      );
      expect(
        spec.paths?.[path]?.post?.responses?.["400"]?.content?.[
          "application/json"
        ]?.schema,
      ).toEqual({ $ref: "#/components/schemas/ErrorResponse" });
    }
  });

  it("documents the flat runtime CTRF success response", () => {
    const spec = generateOpenAPISpec();
    const ctrfSchema = spec.components?.schemas?.CTRFReportResponse;

    expect(ctrfSchema).toMatchObject({
      type: "object",
      required: ["success", "executionId", "specsProcessed"],
      properties: {
        success: { type: "boolean" },
        executionId: { type: "string", format: "uuid" },
        specsProcessed: { type: "number" },
      },
    });
    expect(JSON.stringify(ctrfSchema)).not.toContain('"data"');
    expect(JSON.stringify(ctrfSchema)).not.toContain('"message"');
  });
});
