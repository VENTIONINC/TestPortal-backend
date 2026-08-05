// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema, SuccessResponseSchema } from "./common";

const ResultErrorSchema = z
  .object({
    id: z.string().uuid(),
    resultId: z.string().uuid().nullable().optional(),
    type: z.string(),
    message: z.string(),
    callLog: z.array(z.string()),
    callStack: z.array(z.string()),
    testAssertion: z.string().nullable().optional(),
    expectedPattern: z.string().nullable().optional(),
    receivedString: z.string().nullable().optional(),
    location: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ResultError");

const AssignIssueRequestSchema = z
  .object({
    issueId: z.string().uuid(),
  })
  .openapi("AssignIssueRequest");

const BulkReviewRequestSchema = z
  .object({
    errorIds: z.array(z.string().uuid()),
  })
  .openapi("BulkReviewRequest");

const AnalyzeResultErrorsRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    errorIds: z.array(z.string().uuid()),
  })
  .openapi("AnalyzeResultErrorsRequest");

const AnalyzeResultErrorsResponseSchema = z
  .object({
    analyzedResults: z.number(),
    updatedResultIds: z.array(z.string().uuid()),
    skippedErrorIds: z.array(z.string().uuid()),
    totalErrors: z.number(),
  })
  .openapi("AnalyzeResultErrorsResponse");

export function registerResultErrorRoutes(registry: OpenAPIRegistry) {
  registry.register("ResultError", ResultErrorSchema);
  registry.register("AssignIssueRequest", AssignIssueRequestSchema);
  registry.register("BulkReviewRequest", BulkReviewRequestSchema);
  registry.register(
    "AnalyzeResultErrorsRequest",
    AnalyzeResultErrorsRequestSchema,
  );
  registry.register(
    "AnalyzeResultErrorsResponse",
    AnalyzeResultErrorsResponseSchema,
  );

  registry.registerPath({
    method: "patch",
    path: "/api/v2/result-errors/{resultErrorId}/assign-issue",
    description: "Assigns an issue to a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: AssignIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Issue assigned successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/result-errors/{resultErrorId}/review",
    description: "Reviews a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Result error reviewed successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/result-errors/bulk-review",
    description: "Performs a bulk review of result errors",
    request: {
      body: {
        content: {
          "application/json": {
            schema: BulkReviewRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Bulk review completed successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/result-errors/analyze",
    description:
      "Runs AI analysis for specific result errors and updates related results",
    request: {
      body: {
        content: {
          "application/json": {
            schema: AnalyzeResultErrorsRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Analysis completed successfully",
        content: {
          "application/json": {
            schema: AnalyzeResultErrorsResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/result-errors/{resultErrorId}",
    description:
      "Retrieves a result error in a shared-workspace project (requires projectId; project ownership does not restrict access)",
    request: {
      params: z.object({
        resultErrorId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID used to scope the result-error lookup"),
      }),
    },
    responses: {
      200: {
        description: "Result error retrieved successfully",
        content: {
          "application/json": {
            schema: z.object({
              data: ResultErrorSchema,
            }),
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
        description: "Result error not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });
}

export {
  ResultErrorSchema,
  AssignIssueRequestSchema,
  BulkReviewRequestSchema,
  AnalyzeResultErrorsRequestSchema,
  AnalyzeResultErrorsResponseSchema,
};
