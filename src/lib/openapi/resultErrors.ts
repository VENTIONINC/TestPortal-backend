// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema, SuccessResponseSchema } from "./common";
import { AssumptionSchema } from "./assumptions";
import { IssueCoreSchema, ResultCategorySchema } from "./issues";

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

const ResultErrorIssueCreateRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    name: z.string(),
    category: ResultCategorySchema,
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("ResultErrorIssueCreateRequest");

const ResultErrorIssueUpdateRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    category: ResultCategorySchema,
    name: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("ResultErrorIssueUpdateRequest");

const ResultErrorIssueWorkflowResponseSchema = z
  .object({
    issue: IssueCoreSchema,
    assumption: AssumptionSchema,
    result: z.object({
      id: z.string().uuid(),
      analysisFeedbackCategory: ResultCategorySchema,
    }),
  })
  .openapi("ResultErrorIssueWorkflowResponse");

const resultErrorSourceSnippetShape = {
  path: z.string(),
  text: z.string(),
  startLine: z.number().int().positive(),
  failingLine: z.number().int().positive(),
};

const ResultErrorSourceSnippetSchema = z
  .object(resultErrorSourceSnippetShape)
  .openapi("ResultErrorSourceSnippet");

const ResultErrorModalIssueSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    category: ResultCategorySchema,
    description: z.string().nullable(),
    portal: z.string().nullable(),
    service: z.string().nullable(),
    ticket: z.string().nullable(),
  })
  .openapi("ResultErrorModalIssue");

const resultErrorModalAssignmentShape = {
  id: z.string().uuid(),
  isConfirmed: z.boolean(),
  score: z.number(),
  madeBy: z.string(),
  issue: ResultErrorModalIssueSchema,
};

const ResultErrorModalAssignmentSchema = z
  .object(resultErrorModalAssignmentShape)
  .openapi("ResultErrorModalAssignment");

const ResultErrorModalContextSchema = z
  .object({
    error: z.object({
      id: z.string().uuid(),
      type: z.string(),
      message: z.string(),
      callLog: z.array(z.string()),
      callStack: z.array(z.string()),
      logs: z.array(z.string()),
      sourceSnippet: z.union([
        z.object(resultErrorSourceSnippetShape),
        z.null(),
      ]),
      generatedTestCase: z.string().nullable(),
      location: z.string(),
    }),
    result: z.object({
      id: z.string().uuid(),
      attempt: z.number().int().positive(),
      status: z.string(),
      duration: z.number().int().nonnegative(),
      startTime: z.string().datetime(),
      reportPortalLink: z.string().nullable(),
      category: z.enum(["bug", "infra", "performance", "script", "other"]),
      testTitle: z.string(),
      specPath: z.string(),
      specKey: z.string(),
      executionName: z.string(),
      environment: z.string(),
    }),
    assignments: z.object({
      confirmed: z.union([
        z.object(resultErrorModalAssignmentShape),
        z.null(),
      ]),
      suggestions: z.array(ResultErrorModalAssignmentSchema),
    }),
  })
  .openapi("ResultErrorModalContext");

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
  registry.register("ResultErrorSourceSnippet", ResultErrorSourceSnippetSchema);
  registry.register("ResultErrorModalIssue", ResultErrorModalIssueSchema);
  registry.register(
    "ResultErrorModalAssignment",
    ResultErrorModalAssignmentSchema,
  );
  registry.register("ResultErrorModalContext", ResultErrorModalContextSchema);
  registry.register(
    "ResultErrorIssueCreateRequest",
    ResultErrorIssueCreateRequestSchema,
  );
  registry.register(
    "ResultErrorIssueUpdateRequest",
    ResultErrorIssueUpdateRequestSchema,
  );
  registry.register(
    "ResultErrorIssueWorkflowResponse",
    ResultErrorIssueWorkflowResponseSchema,
  );

  registry.registerPath({
    method: "post",
    path: "/api/v2/result-errors/{resultErrorId}/issue",
    description: "Creates and assigns a confirmed issue atomically",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({ resultErrorId: z.string().uuid() }),
      body: {
        content: {
          "application/json": { schema: ResultErrorIssueCreateRequestSchema },
        },
      },
    },
    responses: {
      201: {
        description: "Issue created and assigned",
        content: {
          "application/json": {
            schema: ResultErrorIssueWorkflowResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid workflow request",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      404: {
        description: "Result error not found in the project",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/result-errors/{resultErrorId}/issue",
    description: "Updates the confirmed issue and containing result atomically",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({ resultErrorId: z.string().uuid() }),
      body: {
        content: {
          "application/json": { schema: ResultErrorIssueUpdateRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: "Confirmed issue updated",
        content: {
          "application/json": {
            schema: ResultErrorIssueWorkflowResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid workflow request",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      404: {
        description: "Confirmed assignment not found in the project",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/result-errors/{resultErrorId}/modal-context",
    description:
      "Retrieves project-scoped result, error, optional tab, and assignment context for the Assign Issue modal",
    request: {
      params: z.object({ resultErrorId: z.string().uuid() }),
      query: z.object({ projectId: z.string().uuid() }),
    },
    responses: {
      200: {
        description: "Modal context retrieved successfully",
        content: {
          "application/json": { schema: ResultErrorModalContextSchema },
        },
      },
      400: {
        description: "Missing or invalid identifier",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      404: {
        description: "Result error not found in the accessible project",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
      500: {
        description: "Modal context retrieval failed",
        content: { "application/json": { schema: ErrorResponseSchema } },
      },
    },
    tags: ["Result Errors"],
    security: [{ BearerAuth: [] }],
  });


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
    description: "Retrieves a specific result error by ID (requires projectId)",
    request: {
      params: z.object({
        resultErrorId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the result error"),
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
  ResultErrorSourceSnippetSchema,
  ResultErrorModalIssueSchema,
  ResultErrorModalAssignmentSchema,
  ResultErrorModalContextSchema,
};
