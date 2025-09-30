import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { IssueCategory } from "@/types/enums";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const IssueSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
    createdById: z.string().uuid().optional(),
    updatedById: z.string().uuid().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Issue");

const CreateIssueRequestSchema = z
  .object({
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("CreateIssueRequest");

const UpdateIssueRequestSchema = z
  .object({
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("UpdateIssueRequest");

export function registerIssueRoutes(registry: OpenAPIRegistry) {
  registry.register("Issue", IssueSchema);
  registry.register("CreateIssueRequest", CreateIssueRequestSchema);
  registry.register("UpdateIssueRequest", UpdateIssueRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v1/issues",
    description: "Retrieves all issues",
    request: {
      query: z.object({
        category: z.nativeEnum(IssueCategory).optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(30).optional(),
      }),
    },
    responses: {
      200: {
        description: "List of issues",
        content: {
          "application/json": {
            schema: z.array(IssueSchema),
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
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/issues/with-stats",
    description:
      "Retrieves all issues with their statistics including occurrence count, first/last occurrence, impacted tests count, and time-based distribution. Optionally filter statistics by date range.",
    request: {
      query: z.object({
        category: z.nativeEnum(IssueCategory).optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(10).optional(),
        statFrom: z
          .string()
          .datetime()
          .optional()
          .describe(
            "Start date for statistics in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
          ),
        statTo: z
          .string()
          .datetime()
          .optional()
          .describe(
            "End date for statistics in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
          ),
      }),
    },
    responses: {
      200: {
        description: "List of issues with statistics",
        content: {
          "application/json": {
            schema: z.object({
              issues: z.array(
                z.object({
                  ...IssueSchema.shape,
                  statistics: z.object({
                    occurrenceCount: z.number(),
                    firstOccurrence: z.date().nullable(),
                    lastOccurrence: z.date().nullable(),
                    impactedTestsCount: z.number(),
                    timeDistribution: z.array(
                      z.object({
                        date: z.string(),
                        count: z.number(),
                      }),
                    ),
                  }),
                }),
              ),
              total: z.number(),
              page: z.number(),
              totalPages: z.number(),
            }),
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
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/issues/{issueId}",
    description:
      "Deletes an issue by its ID. Also deletes all associated assumptions (cascade delete).",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    responses: {
      200: {
        description:
          "Issue and all associated assumptions deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
              issue: IssueSchema,
            }),
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/issues/{issueId}",
    description: "Retrieves an issue by its ID",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    responses: {
      200: {
        description: "Issue details",
        content: {
          "application/json": {
            schema: IssueSchema,
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/issues",
    description: "Creates a new issue",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Issue created successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
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
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/issues/{issueId}",
    description: "Updates an existing issue",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Issue updated successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues",
    description: "Retrieves all issues (requires authentication)",
    request: {
      query: z.object({
        category: z.string().optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(30).optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of issues",
        content: {
          "application/json": {
            schema: z.array(IssueSchema),
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
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues/{issueId}",
    description: "Retrieves an issue by its ID (requires authentication)",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Issue details",
        content: {
          "application/json": {
            schema: IssueSchema,
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/issues",
    description: "Creates a new issue (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateIssueRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Issue created successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
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
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/issues/{issueId}",
    description: "Updates an existing issue (requires authentication)",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateIssueRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Issue updated successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/issues/{issueId}",
    description:
      "Deletes an issue by its ID (requires authentication). Also deletes all associated assumptions (cascade delete).",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description:
          "Issue and all associated assumptions deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
              issue: IssueSchema,
            }),
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
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });
}

export { IssueSchema, CreateIssueRequestSchema, UpdateIssueRequestSchema };
