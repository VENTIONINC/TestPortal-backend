import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema, SuccessResponseSchema } from "./common";

const ResultErrorSchema = z
  .object({
    id: z.string(),
    resultId: z.string(),
    errorMessage: z.string(),
    stackTrace: z.string().optional(),
    assertionInfo: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ResultError");

const AssignIssueRequestSchema = z
  .object({
    issueId: z.number(),
  })
  .openapi("AssignIssueRequest");

const BulkReviewRequestSchema = z
  .object({
    errorIds: z.array(z.number()),
  })
  .openapi("BulkReviewRequest");

export function registerResultErrorRoutes(registry: OpenAPIRegistry) {
  registry.register("ResultError", ResultErrorSchema);
  registry.register("AssignIssueRequest", AssignIssueRequestSchema);
  registry.register("BulkReviewRequest", BulkReviewRequestSchema);

  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/{resultErrorId}/assign-issue",
    description: "Assigns an issue to a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string(),
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
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/{resultErrorId}/review",
    description: "Reviews a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string(),
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
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/bulk-review",
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
  });
}

export {
  ResultErrorSchema,
  AssignIssueRequestSchema,
  BulkReviewRequestSchema,
};
