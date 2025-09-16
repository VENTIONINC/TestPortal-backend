import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as Schemas from "../schemas";

export function registerResultErrorPaths(registry: OpenAPIRegistry): void {
  // Result Error routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/result-errors",
    description: "Retrieves all result errors",
    responses: {
      200: {
        description: "List of result errors",
        content: {
          "application/json": {
            schema: z.array(Schemas.ResultErrorSchema),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/result-errors/{errorId}",
    description: "Retrieves a result error by its ID",
    request: {
      params: z.object({
        errorId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Result error details",
        content: {
          "application/json": {
            schema: Schemas.ResultErrorSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/result-errors/{errorId}/assumptions",
    description: "Creates a new assumption for a result error",
    request: {
      params: z.object({
        errorId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: Schemas.CreateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Assumption created successfully",
        content: {
          "application/json": {
            schema: Schemas.AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors", "Assumptions"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/result-errors/{errorId}/assign-issue",
    description: "Assigns an issue to a result error",
    request: {
      params: z.object({
        errorId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: Schemas.AssignIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Issue assigned successfully",
        content: {
          "application/json": {
            schema: Schemas.AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error or issue not found",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors", "Issues"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/result-errors/bulk-review",
    description: "Bulk review of result errors",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.BulkReviewRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Bulk review completed",
        content: {
          "application/json": {
            schema: Schemas.SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

}
