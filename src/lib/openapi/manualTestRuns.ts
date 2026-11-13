// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { ZodTypeAny } from "zod";
import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const ManualTestRunStatusSchema = z
  .enum(["in_progress", "completed"])
  .openapi("ManualTestRunStatus");
const ManualTestRunScenarioResultSchema = z
  .enum(["untested", "passed", "failed", "blocked", "skipped"])
  .openapi("ManualTestRunScenarioResult");
const ManualTestRunUserSchema = z
  .object({ id: z.string().uuid(), name: z.string(), email: z.string() })
  .strict()
  .nullable()
  .openapi("ManualTestRunUser");

const ManualTestRunScenarioStepSchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    position: z.number().int().nonnegative().openapi({ readOnly: true }),
    action: z.string().openapi({ readOnly: true }),
    expectedResult: z.string().nullable().openapi({ readOnly: true }),
  })
  .strict()
  .openapi("ManualTestRunScenarioStep");

const ManualTestRunScenarioSchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    sourceScenarioId: z.string().uuid().openapi({ readOnly: true }),
    sourceScenarioKey: z.string().openapi({ readOnly: true }),
    title: z.string().openapi({ readOnly: true }),
    position: z.number().int().nonnegative(),
    details: z.string().nullable().openapi({ readOnly: true }),
    preconditions: z.string().nullable().openapi({ readOnly: true }),
    testData: z.string().nullable().openapi({ readOnly: true }),
    folderPath: z.string().nullable().openapi({ readOnly: true }),
    result: ManualTestRunScenarioResultSchema,
    assigneeId: z.string().uuid().nullable(),
    assignee: ManualTestRunUserSchema,
    resultById: z.string().uuid().nullable().openapi({ readOnly: true }),
    resultBy: ManualTestRunUserSchema,
    resultAt: z.string().nullable().openapi({ readOnly: true }),
    steps: z.array(ManualTestRunScenarioStepSchema).openapi({ readOnly: true }),
  })
  .strict()
  .openapi("ManualTestRunScenario");

const environmentFields = {
  browser: z.string().nullable(),
  operatingSystem: z.string().nullable(),
  device: z.string().nullable(),
  apiEnvironment: z.string().nullable(),
  build: z.string().nullable(),
  deployment: z.string().nullable(),
};

const ManualTestRunSchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    projectId: z.string().uuid().openapi({ readOnly: true }),
    executedById: z.string().uuid().nullable().openapi({ readOnly: true }),
    executedBy: ManualTestRunUserSchema,
    status: ManualTestRunStatusSchema,
    startedAt: z.string().openapi({ readOnly: true }),
    updatedAt: z.string().openapi({ readOnly: true }),
    completedAt: z.string().nullable().openapi({ readOnly: true }),
    completedById: z.string().uuid().nullable().openapi({ readOnly: true }),
    completedBy: ManualTestRunUserSchema,
    skippedAtCompletion: z
      .number()
      .int()
      .nonnegative()
      .openapi({ readOnly: true }),
    title: z.string().openapi({ readOnly: true }),
    ...environmentFields,
    scenarios: z.array(ManualTestRunScenarioSchema).openapi({ readOnly: true }),
  })
  .strict()
  .openapi("ManualTestRun");

const ManualTestRunSummarySchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    executedById: z.string().uuid().nullable(),
    executedBy: ManualTestRunUserSchema,
    status: ManualTestRunStatusSchema,
    startedAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable(),
    completedDay: z.string().nullable(),
    title: z.string(),
    ...environmentFields,
    scenarioCount: z.number().int().nonnegative(),
    untestedCount: z.number().int().nonnegative(),
    passedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    blockedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
  })
  .strict()
  .openapi("ManualTestRunSummary");

const ManualTestRunPageSchema = z
  .object({
    runs: z.array(ManualTestRunSummarySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .strict()
  .openapi("ManualTestRunPage");

const ProjectIdQuerySchema = z
  .object({ projectId: z.string().uuid() })
  .strict();
const RunIdParamsSchema = z.object({ runId: z.string().uuid() }).strict();
const ScenarioParamsSchema = z
  .object({ runId: z.string().uuid(), scenarioId: z.string().uuid() })
  .strict();

const createEnvironmentFields = Object.fromEntries(
  Object.keys(environmentFields).map((field) => [
    field,
    z
      .string()
      .max(200)
      .regex(/^[^\r\n]*$/)
      .nullable()
      .optional(),
  ]),
);
const ManualTestRunCreateRequestSchema = z
  .union([
    z
      .object({
        scenarioIds: z.array(z.string().uuid()).min(1).max(10000),
        ...createEnvironmentFields,
      })
      .strict(),
    z
      .object({ suiteId: z.string().uuid(), ...createEnvironmentFields })
      .strict(),
  ])
  .openapi("ManualTestRunCreateRequest");

const ManualTestRunHistoryQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(30),
    search: z.string().trim().max(200).optional(),
    show: z.enum(["in_progress", "completed", "all"]).default("in_progress"),
    period: z
      .enum([
        "recent",
        "today",
        "yesterday",
        "last_7_days",
        "last_30_days",
        "this_month",
        "last_month",
        "any_time",
        "custom",
      ])
      .default("recent"),
    timeZone: z.string().trim().min(1).max(100).default("UTC"),
    dateFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict()
  .openapi("ManualTestRunHistoryQuery");

const ManualTestRunScenarioResultRequestSchema = z
  .object({
    result: ManualTestRunScenarioResultSchema,
  })
  .strict()
  .openapi("ManualTestRunScenarioResultRequest");
const ManualTestRunScenarioAssigneeRequestSchema = z
  .object({
    assigneeId: z.string().uuid().nullable(),
  })
  .strict()
  .openapi("ManualTestRunScenarioAssigneeRequest");
const ManualTestRunScenarioOrderRequestSchema = z
  .object({
    scenarioIds: z.array(z.string().uuid()).min(1).max(10000),
  })
  .strict()
  .openapi("ManualTestRunScenarioOrderRequest");
const ManualTestRunScenarioBulkRequestSchema = z
  .object({
    scenarioIds: z.array(z.string().uuid()).min(1).max(10000),
    result: ManualTestRunScenarioResultSchema.optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.result !== undefined || value.assigneeId !== undefined,
    "At least one bulk result or assignment change is required",
  )
  .openapi("ManualTestRunScenarioBulkRequest");
const EmptyRequestSchema = z.object({}).strict();

const error = (description: string) => ({
  description,
  content: { "application/json": { schema: ErrorResponseSchema } },
});
const commonErrors = {
  400: error("Invalid request, identifier, filter, or immutable field"),
  401: error("Unauthorized"),
  403: error("Forbidden by the existing authentication lifecycle"),
  404: error(
    "The requested project, run, scenario, or user was not found in scope",
  ),
  409: error("The run cannot make the requested state transition"),
  500: error("Internal server error"),
};
const jsonBody = (schema: ZodTypeAny) => ({
  required: true,
  content: { "application/json": { schema } },
});

export function registerManualTestRunRoutes(registry: OpenAPIRegistry): void {
  for (const [name, schema] of Object.entries({
    ManualTestRunStatus: ManualTestRunStatusSchema,
    ManualTestRunScenarioResult: ManualTestRunScenarioResultSchema,
    ManualTestRunUser: ManualTestRunUserSchema,
    ManualTestRunScenarioStep: ManualTestRunScenarioStepSchema,
    ManualTestRunScenario: ManualTestRunScenarioSchema,
    ManualTestRun: ManualTestRunSchema,
    ManualTestRunSummary: ManualTestRunSummarySchema,
    ManualTestRunPage: ManualTestRunPageSchema,
    ManualTestRunCreateRequest: ManualTestRunCreateRequestSchema,
    ManualTestRunHistoryQuery: ManualTestRunHistoryQuerySchema,
    ManualTestRunScenarioResultRequest:
      ManualTestRunScenarioResultRequestSchema,
    ManualTestRunScenarioAssigneeRequest:
      ManualTestRunScenarioAssigneeRequestSchema,
    ManualTestRunScenarioOrderRequest: ManualTestRunScenarioOrderRequestSchema,
    ManualTestRunScenarioBulkRequest: ManualTestRunScenarioBulkRequestSchema,
  }))
    registry.register(name, schema);

  registry.registerPath({
    method: "post",
    path: "/api/v2/manual-test-runs",
    description:
      "Creates one project-scoped run from an ordered set of scenario IDs or a suite ID. Selected-scenario runs are titled Manual run; suite runs use the suite name. Snapshot creation is atomic.",
    request: {
      query: ProjectIdQuerySchema,
      body: jsonBody(ManualTestRunCreateRequestSchema),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Created run with ordered scenario snapshots",
        content: { "application/json": { schema: ManualTestRunSchema } },
      },
      ...commonErrors,
    },
    tags: ["Manual Test Runs"],
  });
  registry.registerPath({
    method: "get",
    path: "/api/v2/manual-test-runs",
    description:
      "Lists project-scoped runs filtered by search, lifecycle, period, and the requested local time zone. Counts cover every scenario in each run, independent of client paging or filters.",
    request: { query: ManualTestRunHistoryQuerySchema },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paged project run history",
        content: { "application/json": { schema: ManualTestRunPageSchema } },
      },
      ...commonErrors,
    },
    tags: ["Manual Test Runs"],
  });
  registry.registerPath({
    method: "get",
    path: "/api/v2/manual-test-runs/{runId}",
    description:
      "Returns the selected project-scoped run and its ordered immutable scenario and step snapshots with current results and assignments.",
    request: { params: RunIdParamsSchema, query: ProjectIdQuerySchema },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Run detail",
        content: { "application/json": { schema: ManualTestRunSchema } },
      },
      ...commonErrors,
    },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/manual-test-runs/{runId}",
    description: "Permanently deletes a project-scoped run and its scenario snapshots and lifecycle history.",
    request: { params: RunIdParamsSchema, query: ProjectIdQuerySchema },
    security: [{ BearerAuth: [] }],
    responses: { 204: { description: "Run deleted" }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  const mutationResponse = {
    200: {
      description: "Authoritative updated run detail",
      content: { "application/json": { schema: ManualTestRunSchema } },
    },
    ...commonErrors,
  };
  registry.registerPath({
    method: "put",
    path: "/api/v2/manual-test-runs/{runId}/scenarios/order",
    description:
      "Reorders every scenario in an in-progress run using the supplied complete ordered scenario ID list.",
    request: {
      params: RunIdParamsSchema,
      query: ProjectIdQuerySchema,
      body: jsonBody(ManualTestRunScenarioOrderRequestSchema),
    },
    security: [{ BearerAuth: [] }],
    responses: mutationResponse,
    tags: ["Manual Test Runs"],
  });
  registry.registerPath({
    method: "post",
    path: "/api/v2/manual-test-runs/{runId}/scenarios/bulk",
    description:
      "Atomically updates the result and/or assignee of every listed scenario in the run. Result attribution is the authenticated user.",
    request: {
      params: RunIdParamsSchema,
      query: ProjectIdQuerySchema,
      body: jsonBody(ManualTestRunScenarioBulkRequestSchema),
    },
    security: [{ BearerAuth: [] }],
    responses: mutationResponse,
    tags: ["Manual Test Runs"],
  });
  registry.registerPath({
    method: "put",
    path: "/api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/result",
    description:
      "Sets or resets one scenario result and records the authenticated result actor.",
    request: {
      params: ScenarioParamsSchema,
      query: ProjectIdQuerySchema,
      body: jsonBody(ManualTestRunScenarioResultRequestSchema),
    },
    security: [{ BearerAuth: [] }],
    responses: mutationResponse,
    tags: ["Manual Test Runs"],
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v2/manual-test-runs/{runId}/scenarios/{scenarioId}/assignee",
    description:
      "Assigns one scenario to an active project user or clears its assignment with null.",
    request: {
      params: ScenarioParamsSchema,
      query: ProjectIdQuerySchema,
      body: jsonBody(ManualTestRunScenarioAssigneeRequestSchema),
    },
    security: [{ BearerAuth: [] }],
    responses: mutationResponse,
    tags: ["Manual Test Runs"],
  });
  for (const [path, method, description, statusDescription] of [
    [
      "/complete",
      "post",
      "Completes an in-progress run atomically, marks only still-untested scenarios Skipped, and returns the actual skipped count.",
      "Completed run detail",
    ],
    [
      "/reopen",
      "post",
      "Reopens a completed run and preserves scenario results, assignment, attribution, snapshots, and order.",
      "Reopened run detail",
    ],
  ] as const) {
    registry.registerPath({
      method,
      path: `/api/v2/manual-test-runs/{runId}${path}`,
      description,
      request: {
        params: RunIdParamsSchema,
        query: ProjectIdQuerySchema,
        body: jsonBody(EmptyRequestSchema),
      },
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: statusDescription,
          content: { "application/json": { schema: ManualTestRunSchema } },
        },
        ...commonErrors,
      },
      tags: ["Manual Test Runs"],
    });
  }
}

export {
  ManualTestRunSchema,
  ManualTestRunSummarySchema,
  ManualTestRunPageSchema,
  ManualTestRunStatusSchema,
  ManualTestRunScenarioResultSchema,
};
