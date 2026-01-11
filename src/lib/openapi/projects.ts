import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import { ErrorResponseSchema } from "./common";

const ProjectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    ownerId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
    _count: z
      .object({
        executions: z.number(),
        specs: z.number(),
        issues: z.number(),
      })
      .optional(),
  })
  .openapi("Project");

const CreateProjectRequestSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .openapi("CreateProjectRequest");

const UpdateProjectRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateProjectRequest");

const DashboardIssueMetricsSchema = z
  .object({
    bug: z.number(),
    environment: z.number(),
    script: z.number(),
    performance: z.number(),
    other: z.number(),
  })
  .openapi("DashboardIssueMetrics");

const DailyExecutionMetricsSchema = z
  .object({
    total: z.number().describe("Total number of tests"),
    passed: z.number().describe("Number of passed tests"),
    failed: z.number().describe("Number of failed tests"),
    skipped: z.number().describe("Number of skipped tests"),
    duration: z.number().describe("Total duration in milliseconds"),
    issues: DashboardIssueMetricsSchema,
  })
  .openapi("DailyExecutionMetrics");

const ExecutionSummarySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().describe("Name of the execution"),
    status: z
      .enum(["passed", "failed", "skipped", "running"])
      .describe("Overall execution status"),
    startedAt: z.string().describe("ISO 8601 timestamp when execution started"),
    duration: z.number().describe("Total duration in milliseconds"),
    type: z.string().describe("Execution type (e.g., Nightly, Release, OnDemand)"),
    environment: z.string().describe("Environment where execution ran"),
    metrics: z
      .object({
        total: z.number().describe("Total number of tests"),
        passed: z.number().describe("Number of passed tests"),
        failed: z.number().describe("Number of failed tests"),
      })
      .optional()
      .describe("Test metrics for the execution"),
  })
  .openapi("ExecutionSummary");

const DashboardResponseSchema = z
  .object({
    summary: z.object({
      totalRuns: z.number().describe("Total number of test runs in the period"),
      passRate: z.number().describe("Pass rate percentage (0-100)"),
      passRateTrend: z
        .number()
        .optional()
        .describe("Pass rate trend indicator (percentage change)"),
    }),
    history: z.array(
      z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        metrics: DailyExecutionMetricsSchema,
      })
    ),
    recentExecutions: z.array(ExecutionSummarySchema),
  })
  .openapi("DashboardResponse");

export function registerProjectRoutes(registry: OpenAPIRegistry) {
  registry.register("Project", ProjectSchema);
  registry.register("CreateProjectRequest", CreateProjectRequestSchema);
  registry.register("UpdateProjectRequest", UpdateProjectRequestSchema);
  registry.register("DashboardIssueMetrics", DashboardIssueMetricsSchema);
  registry.register("DailyExecutionMetrics", DailyExecutionMetricsSchema);
  registry.register("ExecutionSummary", ExecutionSummarySchema);
  registry.register("DashboardResponse", DashboardResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects",
    description:
      "Retrieves all projects for the authenticated user (requires authentication)",
    request: {
      query: z.object({
        ownerId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
        name: z.string().optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of projects",
        content: {
          "application/json": {
            schema: z.array(ProjectSchema),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
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
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects/{id}",
    description: "Retrieves a specific project by ID (requires authentication)",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project details",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/projects",
    description: "Creates a new project (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Project created successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "put",
    path: "/api/v2/projects/{id}",
    description: "Updates an existing project (requires authentication)",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project updated successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/projects/{id}",
    description:
      "Deletes a project by ID (requires authentication). Also deletes all associated executions, specs, and results (cascade delete).",
    request: {
      params: z.object({
        id: z.string().uuid(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      204: {
        description: "Project and all associated data deleted successfully",
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects/{projectId}/dashboard",
    description:
      "Retrieves dashboard metrics and analytics for a project (requires authentication). Returns aggregated test execution statistics, daily metrics history, and recent execution summaries.",
    request: {
      params: z.object({
        projectId: z.string().uuid().describe("The unique identifier of the project"),
      }),
      query: z.object({
        environment: z
          .string()
          .describe("Environment filter (e.g., staging, production, development)"),
        period: z
          .number()
          .optional()
          .default(30)
          .describe("Number of days to include in the history (default: 30)"),
        type: z
          .string()
          .optional()
          .describe("Execution type filter (e.g., Nightly, Release, OnDemand)"),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description:
          "Dashboard data with summary statistics, daily metrics history, and recent executions",
        content: {
          "application/json": {
            schema: DashboardResponseSchema,
          },
        },
      },
      400: {
        description:
          "Bad request - missing environment parameter or invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - failed to fetch dashboard data",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });
}

export {
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  DashboardIssueMetricsSchema,
  DailyExecutionMetricsSchema,
  ExecutionSummarySchema,
  DashboardResponseSchema,
};
