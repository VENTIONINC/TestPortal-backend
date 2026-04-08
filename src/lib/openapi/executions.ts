import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ExecutionSchema = z
  .object({
    id: z.string().uuid(),
    runId: z.string(),
    env: z.string().optional(),
    version: z.string().optional(),
    provider: z.string(),
    startTime: z.string(),
    endTime: z.string().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Execution");

const FailureGroupingCategorySchema = z
  .enum(["bug", "infra", "performance", "script", "other"])
  .openapi("FailureGroupingCategory");

const FailureGroupingReasonSchema = z
  .enum(["insufficient_failures", "analysis_not_complete", "too_many_failures"])
  .openapi("FailureGroupingReason");

const FailureGroupingSourceSchema = z
  .enum(["llm", "algorithmic", "none"])
  .openapi("FailureGroupingSource");

const FailureGroupSchema = z
  .object({
    groupDescription: z.string(),
    confidence: z.number().min(0).max(1),
    resultErrorIds: z.array(z.string().uuid()),
    suggestedIssueQuery: z.string().optional(),
  })
  .openapi("FailureGroup");

const GroupFailuresRequestSchema = z
  .object({
    category: FailureGroupingCategorySchema,
  })
  .openapi("GroupFailuresRequest");

const GroupFailuresResponseSchema = z
  .object({
    groups: z.array(FailureGroupSchema),
    source: FailureGroupingSourceSchema,
    reason: FailureGroupingReasonSchema.optional(),
  })
  .openapi("GroupFailuresResponse");

const AcceptFailureGroupRequestSchema = z
  .object({
    issueId: z.string().uuid(),
    groupResultErrorIds: z.array(z.string().uuid()).min(1),
  })
  .openapi("AcceptFailureGroupRequest");

const AcceptedAssumptionSchema = z
  .object({
    id: z.string().uuid(),
    issueId: z.string().uuid(),
    resultErrorId: z.string().uuid().nullable().optional(),
    madeBy: z.string(),
    isConfirmed: z.boolean(),
    score: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AcceptedAssumption");

const AcceptFailureGroupResponseSchema = z
  .object({
    createdAssumptions: z.array(AcceptedAssumptionSchema),
    skippedResultErrorIds: z.array(z.string().uuid()),
  })
  .openapi("AcceptFailureGroupResponse");

export function registerExecutionRoutes(registry: OpenAPIRegistry) {
  registry.register("Execution", ExecutionSchema);
  registry.register("FailureGroupingCategory", FailureGroupingCategorySchema);
  registry.register("FailureGroupingReason", FailureGroupingReasonSchema);
  registry.register("FailureGroupingSource", FailureGroupingSourceSchema);
  registry.register("FailureGroup", FailureGroupSchema);
  registry.register("GroupFailuresRequest", GroupFailuresRequestSchema);
  registry.register("GroupFailuresResponse", GroupFailuresResponseSchema);
  registry.register(
    "AcceptFailureGroupRequest",
    AcceptFailureGroupRequestSchema,
  );
  registry.register("AcceptedAssumption", AcceptedAssumptionSchema);
  registry.register(
    "AcceptFailureGroupResponse",
    AcceptFailureGroupResponseSchema,
  );

  registry.registerPath({
    method: "get",
    path: "/api/v2/executions/{executionId}",
    description: "Retrieves an execution by its ID (requires projectId)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        executionId: z.string().uuid().openapi({
          description: "Unique identifier of the execution",
        }),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the execution"),
      }),
    },
    responses: {
      200: {
        description: "Execution details retrieved successfully",
        content: {
          "application/json": {
            schema: ExecutionSchema,
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
      401: {
        description:
          "Unauthorized - Authentication token is missing or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });

  // V2 Delete Execution Route
  registry.registerPath({
    method: "post",
    path: "/api/v2/executions/{executionId}/group-failures",
    description: "Groups failures within one execution and one AI category",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        executionId: z.string().uuid().openapi({
          description: "Unique identifier of the execution",
        }),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the execution"),
      }),
      body: {
        content: {
          "application/json": {
            schema: GroupFailuresRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Failure grouping response",
        content: {
          "application/json": {
            schema: GroupFailuresResponseSchema,
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
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/executions/{executionId}/group-failures/accept",
    description:
      "Creates confirmed assumptions for the selected execution failure group",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        executionId: z.string().uuid().openapi({
          description: "Unique identifier of the execution",
        }),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the execution"),
      }),
      body: {
        content: {
          "application/json": {
            schema: AcceptFailureGroupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Confirmed assumptions created for the accepted group",
        content: {
          "application/json": {
            schema: AcceptFailureGroupResponseSchema,
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
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/executions/{executionId}",
    description:
      "Delete an execution by its ID (requires projectId and authentication)",
    security: [{ BearerAuth: [] }],
    request: {
      params: z.object({
        executionId: z.string().uuid().openapi({
          description: "Unique identifier of the execution to delete",
        }),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the execution"),
      }),
    },
    responses: {
      204: {
        description: "Successfully deleted execution",
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
        description:
          "Unauthorized - Authentication token is missing or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
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
    tags: ["Executions"],
  });
}

export { ExecutionSchema };
