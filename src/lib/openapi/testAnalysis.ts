// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const TestAnalysisRequestSchema = z
  .object({
    testResults: z.array(z.any()).optional(),
  })
  .openapi("TestAnalysisRequest");

const TestResultAnalysisSchema = z
  .object({
    id: z.string(),
    status: z.enum(["passed", "failed"]),
    category: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional(),
    confidence: z.number().min(0).max(1),
    conclusion: z.string().optional(),
  })
  .openapi("TestResultAnalysis");

const TestAnalysisResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      dataSource: z.string(),
      totalTests: z.number(),
      analysisResults: z.array(TestResultAnalysisSchema),
    }),
  })
  .openapi("TestAnalysisResponse");

export function registerTestAnalysisRoutes(registry: OpenAPIRegistry) {
  registry.register("TestAnalysisRequest", TestAnalysisRequestSchema);
  registry.register("TestResultAnalysis", TestResultAnalysisSchema);
  registry.register("TestAnalysisResponse", TestAnalysisResponseSchema);

  registry.registerPath({
    method: "post",
    path: "/api/v1/test-analysis/analyze",
    description:
      "Analyzes test results using AI to categorize failures and provide insights",
    request: {
      body: {
        content: {
          "application/json": {
            schema: TestAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Test analysis completed successfully",
        content: {
          "application/json": {
            schema: TestAnalysisResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid test results format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - analysis failed",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Test Analysis"],
  });
}

export {
  TestAnalysisRequestSchema,
  TestResultAnalysisSchema,
  TestAnalysisResponseSchema,
};
