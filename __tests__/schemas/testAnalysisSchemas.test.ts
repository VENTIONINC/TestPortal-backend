// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  testAnalysisSchema,
  testAnalysisSchemaV1_0_0,
  testAnalysisSchemaV1_1_0,
  testAnalysisSchemaV1_2_0,
  testResultSchema,
  testResultSchemaV1_2_0,
} from "@/schemas/testAnalysisSchemas";

const failedResult = {
  id: "result-1",
  status: "failed" as const,
  category: "bug" as const,
  confidence: 5,
  conclusion: "An assertion mismatch identifies an application defect.",
  errorQuality: 4,
  errorQualityConclusion: "The error includes expected and actual values.",
};

describe("testAnalysisSchemas", () => {
  it("keeps the current backward-compatible schema exports", () => {
    expect(testResultSchema).toBe(testResultSchemaV1_2_0);
    expect(testAnalysisSchema).toBe(testAnalysisSchemaV1_2_0);
  });

  it("accepts the existing response contract regardless of input key order", () => {
    expect(testAnalysisSchema.parse({ results: [failedResult] })).toMatchObject(
      { results: [failedResult] },
    );
  });

  it.each([
    ["v1.0.0", testAnalysisSchemaV1_0_0],
    ["v1.1.0", testAnalysisSchemaV1_1_0],
  ])("preserves the legacy field order for %s", (_, schema) => {
    const parsed = schema.parse({ results: [failedResult] });
    const [result] = parsed.results;

    if (!result) {
      throw new Error("Expected one parsed analysis result");
    }

    expect(Object.keys(result)).toEqual([
      "id",
      "status",
      "category",
      "confidence",
      "conclusion",
      "errorQuality",
      "errorQualityConclusion",
    ]);
  });

  it("emits conclusion before category for v1.2.0 structured output", () => {
    const parsed = testAnalysisSchemaV1_2_0.parse({ results: [failedResult] });
    const [result] = parsed.results;

    if (!result) {
      throw new Error("Expected one parsed analysis result");
    }

    expect(Object.keys(result)).toEqual([
      "id",
      "status",
      "conclusion",
      "category",
      "confidence",
      "errorQuality",
      "errorQualityConclusion",
    ]);
  });
});
