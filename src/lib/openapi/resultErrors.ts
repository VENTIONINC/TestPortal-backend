import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema, SuccessResponseSchema } from "./common";

const ResultErrorSchema = z
  .object({
    id: z.string().uuid(),
    resultId: z.string().uuid(),
    errorMessage: z.string(),
    stackTrace: z.string().optional(),
    assertionInfo: z.string().optional(),
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

export function registerResultErrorRoutes(registry: OpenAPIRegistry) {
  registry.register("ResultError", ResultErrorSchema);
  registry.register("AssignIssueRequest", AssignIssueRequestSchema);
  registry.register("BulkReviewRequest", BulkReviewRequestSchema);

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
    method: "get",
    path: "/api/v2/result-errors/{resultErrorId}",
    description: "Retrieves a specific result error by ID (requires projectId)",
    request: {
      params: z.object({
        resultErrorId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to verify ownership of the result error"),
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
};
