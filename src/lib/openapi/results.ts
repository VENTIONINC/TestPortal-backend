import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ResultSchema = z
  .object({
    id: z.string().uuid(),
    tag: z.string().optional(),
    specId: z.string().uuid().optional(),
    specFile: z.string().optional(),
    specName: z.string().optional(),
    environment: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    reportPortalLink: z.string().optional(),
    retry: z.number().optional(),
    duration: z.number().optional(),
    startTime: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Result");

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
        title: z.string(),
        count: z.number(),
      }),
    ),
  })
  .openapi("ResultsStats");

const UpdateResultAnalysisRequestSchema = z
  .object({
    analysisStatus: z.enum(["passed", "failed"]).optional(),
    analysisCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional(),
    analysisConfidence: z.number().min(0).max(1).optional(),
    analysisConclusion: z.string().optional(),
  })
  .openapi("UpdateResultAnalysisRequest");

export function registerResultRoutes(registry: OpenAPIRegistry) {
  registry.register("Result", ResultSchema);
  registry.register("ResultsStats", ResultsStatsSchema);
  registry.register(
    "UpdateResultAnalysisRequest",
    UpdateResultAnalysisRequestSchema,
  );

  registry.registerPath({
    method: "get",
    path: "/api/v2/results",
    description:
      "Retrieves results with optional filtering (requires projectId)",
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
            schema: z.array(ResultSchema),
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
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/results/{resultId}",
    description: "Retrieves a specific result by its ID",
    request: {
      params: z.object({
        resultId: z.string().uuid(),
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

  registry.registerPath({
    method: "get",
    path: "/api/v2/results-stats",
    description:
      "Retrieves statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates",
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
}

export { ResultSchema, ResultsStatsSchema, UpdateResultAnalysisRequestSchema };
