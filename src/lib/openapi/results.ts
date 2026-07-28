// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";
import { IssueCategorySummarySchema } from "./issues";

const ResultSpecSchema = z
  .object({
    id: z.string().uuid(),
    key: z.string(),
    file: z.string(),
    title: z.string(),
    tags: z.array(z.string()),
  })
  .openapi("ResultSpec");

const ResultExecutionSchema = z
  .object({
    id: z.string().uuid(),
    environment: z.string(),
    type: z.string(),
    name: z.string(),
    version: z.string(),
    startedAt: z.string(),
    createdAt: z.string(),
  })
  .openapi("ResultExecution");

const ResultErrorSchema = z
  .object({
    id: z.string().uuid(),
    type: z.string(),
    message: z.string(),
    callLog: z.array(z.string()),
    callStack: z.array(z.string()),
    testAssertion: z.string().nullable().optional(),
    expectedPattern: z.string().nullable().optional(),
    receivedString: z.string().nullable().optional(),
    location: z.string(),
    resultId: z.string().uuid().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ResultNestedError");

const ResultSchema = z
  .object({
    id: z.string().uuid(),
    status: z.string(),
    reportPortalLink: z.string().nullable().optional(),
    retry: z.number(),
    duration: z.number(),
    startTime: z.string(),
    analysisStatus: z
      .enum(["passed", "failed"])
      .nullable()
      .optional()
      .describe("Test analysis status"),
    analysisCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .nullable()
      .optional()
      .describe("Failure category from AI analysis"),
    analysisConfidence: z
      .number()
      .min(1)
      .max(5)
      .nullable()
      .optional()
      .describe("Confidence level of analysis (1-5 scale)"),
    analysisConclusion: z
      .string()
      .nullable()
      .optional()
      .describe("Explanation for the categorization decision"),
    analysisErrorQuality: z
      .number()
      .int()
      .min(1)
      .max(5)
      .nullable()
      .optional()
      .describe(
        "Quality rating of error messages (1-5 scale, only for failed tests)",
      ),
    analysisErrorQualityConclusion: z
      .string()
      .nullable()
      .optional()
      .describe("Explanation for the error quality rating"),
    analysisReviewedAt: z.string().nullable().optional(),
    analysisReviewedById: z.string().uuid().nullable().optional(),
    analysisFeedbackCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .nullable()
      .optional()
      .describe(
        "Human category correction. When present, this is authoritative over analysisCategory.",
      ),
    analysisFeedbackConfidence: z
      .number()
      .min(1)
      .max(5)
      .nullable()
      .optional(),
    analysisFeedbackConclusion: z.string().nullable().optional(),
    spec: ResultSpecSchema,
    execution: ResultExecutionSchema,
    errors: z.array(ResultErrorSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Result");

const ResultsListResponseSchema = z
  .object({
    results: z.array(ResultSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("ResultsListResponse");

const ResultsStatsSchema = z
  .object({
    byStatus: z.object({
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
      timedOut: z.number(),
    }),
    byStatusTotal: z.number(),
    entityCounts: z.object({
      specs: z.number(),
      results: z.number(),
      executions: z.number(),
      issues: z.number(),
      errors: z.number(),
      assumptions: z.number(),
    }),
    topErrors: z.array(
      z.object({
        title: z.string(),
        count: z.number(),
      }),
    ),
    topIssues: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        count: z.number(),
        categorySummary: IssueCategorySummarySchema.describe(
          "Derived from the same distinct linked results counted by count.",
        ),
      }),
    ),
  })
  .openapi("ResultsStats");

const UpdateResultAnalysisRequestSchema = z
  .object({
    analysisStatus: z
      .enum(["passed", "failed"])
      .optional()
      .describe("Test analysis status"),
    analysisCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional()
      .describe("Failure category from AI analysis"),
    analysisConfidence: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe("Confidence level of analysis (1-5 scale)"),
    analysisConclusion: z
      .string()
      .optional()
      .describe("Explanation for the categorization decision"),
  })
  .openapi("UpdateResultAnalysisRequest");

const UpdateResultAnalysisFeedbackRequestSchema = z
  .object({
    analysisFeedbackCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional()
      .describe(
        "Human category correction. This becomes the effective category instead of the AI analysisCategory while preserving the AI value.",
      ),
    analysisFeedbackConfidence: z
      .number()
      .min(1)
      .max(5)
      .optional()
      .describe("Manual reviewer confidence (1-5 scale)"),
    analysisFeedbackConclusion: z
      .string()
      .optional()
      .describe("Manual reviewer conclusion"),
  })
  .openapi("UpdateResultAnalysisFeedbackRequest");

export function registerResultRoutes(registry: OpenAPIRegistry) {
  registry.register("Result", ResultSchema);
  registry.register("ResultSpec", ResultSpecSchema);
  registry.register("ResultExecution", ResultExecutionSchema);
  registry.register("ResultNestedError", ResultErrorSchema);
  registry.register("ResultsStats", ResultsStatsSchema);
  registry.register("ResultsListResponse", ResultsListResponseSchema);
  registry.register(
    "UpdateResultAnalysisRequest",
    UpdateResultAnalysisRequestSchema,
  );
  registry.register(
    "UpdateResultAnalysisFeedbackRequest",
    UpdateResultAnalysisFeedbackRequestSchema,
  );

  registry.registerPath({
    method: "get",
    path: "/api/v2/results",
    description:
      "Retrieves results with optional filtering (requires projectId)",
    security: [{ BearerAuth: [] }],
    request: {
      query: z.object({
        projectId: z.string().uuid(),
        tag: z.string().optional(),
        specId: z.string().optional(),
        specFile: z.string().optional(),
        specName: z.string().optional(),
        environment: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        reviewStatus: z.string().optional(),
        errorMessage: z.string().optional(),
        issueName: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(1000).optional(),
      }),
    },
    responses: {
      200: {
        description: "List of results",
        content: {
          "application/json": {
            schema: ResultsListResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - projectId is required or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/results/{resultId}",
    description: "Retrieves a specific result by its ID (requires projectId)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        resultId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the result"),
      }),
    },
    responses: {
      200: {
        description: "Result details",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      400: {
        description: "Bad request - missing required projectId parameter",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/results-stats",
    description:
      "Retrieves statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates",
    security: [{ BearerAuth: [] }],
    request: {
      query: z.object({
        projectId: z.string().uuid(),
        dates: z
          .array(z.string())
          .optional()
          .describe(
            "Array of dates in YYYY-MM-DD format to filter results. If not provided, returns stats for all results.",
          ),
      }),
    },
    responses: {
      200: {
        description: "Results statistics",
        content: {
          "application/json": {
            schema: ResultsStatsSchema,
          },
        },
      },
      400: {
        description: "Bad request - projectId is required or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/results/{resultId}/analysis",
    description: "Updates the analysis fields of a specific result",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        resultId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateResultAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Result analysis updated successfully",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid input data",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/results/{resultId}/analysis-feedback",
    description:
      "Updates manual feedback fields for a specific result analysis",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        resultId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateResultAnalysisFeedbackRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Result analysis feedback updated successfully",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid input data",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/results/{resultId}/analysis-feedback",
    description: "Updates the analysis feedback fields of a specific result",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        resultId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateResultAnalysisFeedbackRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Result analysis feedback updated successfully",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid input data",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  // V2 Delete Result Route
  registry.registerPath({
    method: "delete",
    path: "/api/v2/results/{resultId}",
    description:
      "Delete a specific result by its ID (requires projectId and authentication)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        resultId: z.string().uuid().openapi({
          description: "Unique identifier of the result to delete",
        }),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the result"),
      }),
    },
    responses: {
      204: {
        description: "Successfully deleted result",
      },
      400: {
        description: "Bad request - missing required projectId parameter",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized access",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });
}

export {
  ResultSchema,
  ResultsStatsSchema,
  UpdateResultAnalysisRequestSchema,
  UpdateResultAnalysisFeedbackRequestSchema,
};
