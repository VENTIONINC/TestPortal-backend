// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ResultCategorySchema = z.enum([
  "bug",
  "infra",
  "performance",
  "script",
  "other",
]);

const SerializedUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

const IssueCoreSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    portal: z.string().nullable().optional(),
    service: z.string().nullable().optional(),
    ticket: z.string().nullable().optional(),
    projectId: z.string().uuid().optional(),
    createdById: z.string().uuid().nullable().optional(),
    updatedById: z.string().uuid().nullable().optional(),
    createdBy: SerializedUserSchema.nullable().optional(),
    updatedBy: SerializedUserSchema.nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("IssueCore");

const IssueCategorySummarySchema = z
  .object({
    displayCategory: ResultCategorySchema.nullable(),
    isMixed: z.boolean(),
    distribution: z.object({
      bug: z.number().int().nonnegative(),
      infra: z.number().int().nonnegative(),
      performance: z.number().int().nonnegative(),
      script: z.number().int().nonnegative(),
      other: z.number().int().nonnegative(),
    }),
    uncategorizedCount: z.number().int().nonnegative(),
  })
  .openapi("IssueCategorySummary");

const IssueReadSchema = IssueCoreSchema.extend({
  categorySummary: IssueCategorySummarySchema.describe(
    "Derived from distinct linked results. Human analysis feedback takes precedence over AI analysis category.",
  ),
}).openapi("IssueRead");

const IssueStatisticsSchema = z
  .object({
    occurrenceCount: z.number().int().nonnegative(),
    firstOccurrence: z.string().nullable(),
    lastOccurrence: z.string().nullable(),
    impactedTestsCount: z.number().int().nonnegative(),
    timeDistribution: z.array(
      z.object({
        date: z.string(),
        count: z.number().int().nonnegative(),
      }),
    ),
  })
  .openapi("IssueStatistics");

const IssueWithStatisticsSchema = IssueReadSchema.extend({
  statistics: IssueStatisticsSchema,
}).openapi("IssueWithStatistics");

const PaginatedIssueListSchema = z
  .object({
    issues: z.array(IssueReadSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("PaginatedIssueList");

const PaginatedIssueStatisticsListSchema = z
  .object({
    issues: z.array(IssueWithStatisticsSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("PaginatedIssueStatisticsList");

const CreateIssueRequestSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
    projectId: z
      .string()
      .uuid()
      .describe("The UUID of the project this issue belongs to"),
  })
  .openapi("CreateIssueRequest");

const UpdateIssueRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("UpdateIssueRequest");

const PaginationQuerySchema = {
  name: z.string().optional(),
  page: z.number().default(1).optional(),
  limit: z.number().default(30).optional(),
};

export function registerIssueRoutes(registry: OpenAPIRegistry) {
  registry.register("IssueCore", IssueCoreSchema);
  registry.register("IssueCategorySummary", IssueCategorySummarySchema);
  registry.register("IssueRead", IssueReadSchema);
  registry.register("IssueStatistics", IssueStatisticsSchema);
  registry.register("IssueWithStatistics", IssueWithStatisticsSchema);
  registry.register("PaginatedIssueList", PaginatedIssueListSchema);
  registry.register(
    "PaginatedIssueStatisticsList",
    PaginatedIssueStatisticsListSchema,
  );
  registry.register("CreateIssueRequest", CreateIssueRequestSchema);
  registry.register("UpdateIssueRequest", UpdateIssueRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues",
    description:
      "Retrieves issues with pagination and category summaries derived from distinct linked results. Issue category filtering has been removed.",
    request: {
      query: z.object({
        projectId: z.string().uuid().describe("Project ID to filter issues"),
        ...PaginationQuerySchema,
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated list of issues with derived category summaries",
        content: {
          "application/json": {
            schema: PaginatedIssueListSchema,
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
    path: "/api/v2/issues/with-stats",
    description:
      "Retrieves issues with occurrence statistics and derived category summaries. statFrom and statTo constrain the same distinct linked-result set for both.",
    request: {
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to filter issues with statistics"),
        ...PaginationQuerySchema,
        limit: z.number().default(10).optional(),
        statFrom: z.string().datetime().optional(),
        statTo: z.string().datetime().optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description:
          "Paginated list of issues with statistics and derived summaries",
        content: {
          "application/json": {
            schema: PaginatedIssueStatisticsListSchema,
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
        description: "Unauthorized",
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
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues/{issueId}",
    description:
      "Retrieves an issue with a category summary derived from linked result analysis and human feedback.",
    request: {
      params: z.object({
        issueId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the issue"),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Issue details with derived category summary",
        content: {
          "application/json": {
            schema: IssueReadSchema,
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
    description:
      "Creates an issue core record. Failure categories are written on result analysis or analysis feedback, not on issues.",
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
        description: "Issue core created successfully",
        content: {
          "application/json": {
            schema: IssueCoreSchema,
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
    description:
      "Updates issue core fields. Result analysis feedback is the human category correction path.",
    request: {
      params: z.object({
        issueId: z.string().uuid(),
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
        description: "Issue core updated successfully",
        content: {
          "application/json": {
            schema: IssueCoreSchema,
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
      "Deletes an issue and its associated assumptions. The response contains the deleted issue core.",
    request: {
      params: z.object({
        issueId: z.string().uuid(),
      }),
      query: z.object({
        projectId: z
          .string()
          .uuid()
          .describe("Project ID to verify ownership of the issue"),
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
              issue: IssueCoreSchema,
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

export {
  IssueCoreSchema,
  IssueCategorySummarySchema,
  IssueReadSchema,
  IssueStatisticsSchema,
  IssueWithStatisticsSchema,
  PaginatedIssueListSchema,
  CreateIssueRequestSchema,
  UpdateIssueRequestSchema,
};
