// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const ManualTestRunStatusSchema = z
  .enum(["in_progress", "passed", "failed", "blocked", "skipped"])
  .openapi("ManualTestRunStatus");

const ManualTestRunStepStatusSchema = z
  .enum(["not_started", "passed", "failed", "blocked", "skipped"])
  .openapi("ManualTestRunStepStatus");

const ManualTestRunExecutorSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
  })
  .strict()
  .nullable()
  .openapi("ManualTestRunExecutor");

const ManualTestRunStepSchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    position: z.number().int().nonnegative().openapi({ readOnly: true }),
    action: z.string().openapi({ readOnly: true }),
    expectedResult: z.string().nullable().openapi({ readOnly: true }),
    status: ManualTestRunStepStatusSchema,
    notes: z.string().nullable(),
    updatedAt: z.string().openapi({ readOnly: true }),
  })
  .strict()
  .openapi("ManualTestRunStep");

const ManualTestRunSchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    projectId: z.string().uuid().openapi({ readOnly: true }),
    sourceTestScenarioId: z.string().uuid().openapi({ readOnly: true }),
    testScenarioId: z.string().uuid().nullable().openapi({ readOnly: true }),
    executedById: z.string().uuid().nullable().openapi({ readOnly: true }),
    executedBy: ManualTestRunExecutorSchema,
    status: ManualTestRunStatusSchema,
    startedAt: z.string().openapi({ readOnly: true }),
    completedAt: z.string().nullable().openapi({ readOnly: true }),
    updatedAt: z.string().openapi({ readOnly: true }),
    title: z.string().openapi({ readOnly: true }),
    details: z.string().nullable().openapi({ readOnly: true }),
    objective: z.string().nullable().openapi({ readOnly: true }),
    preconditions: z.string().nullable().openapi({ readOnly: true }),
    testData: z.string().nullable().openapi({ readOnly: true }),
    expectedResult: z.string().nullable().openapi({ readOnly: true }),
    scenarioNotes: z.string().nullable().openapi({ readOnly: true }),
    notes: z.string().nullable(),
    steps: z.array(ManualTestRunStepSchema).openapi({ readOnly: true }),
  })
  .strict()
  .openapi("ManualTestRun");

const ManualTestRunSummarySchema = z
  .object({
    id: z.string().uuid().openapi({ readOnly: true }),
    projectId: z.string().uuid().openapi({ readOnly: true }),
    sourceTestScenarioId: z.string().uuid().openapi({ readOnly: true }),
    testScenarioId: z.string().uuid().nullable().openapi({ readOnly: true }),
    executedById: z.string().uuid().nullable().openapi({ readOnly: true }),
    executedBy: ManualTestRunExecutorSchema,
    title: z.string().openapi({ readOnly: true }),
    status: ManualTestRunStatusSchema,
    startedAt: z.string().openapi({ readOnly: true }),
    completedAt: z.string().nullable().openapi({ readOnly: true }),
    updatedAt: z.string().openapi({ readOnly: true }),
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

const ProjectIdQuerySchema = z.object({
  projectId: z.string().uuid(),
});

const ScenarioIdParamsSchema = z.object({
  scenarioId: z.string().uuid(),
});

const RunIdParamsSchema = z.object({
  runId: z.string().uuid(),
});

const RunStepParamsSchema = z.object({
  runId: z.string().uuid(),
  stepId: z.string().uuid(),
});

const dateDescription =
  "RFC 3339 timestamp with an explicit Z or numeric timezone offset; startedFrom is inclusive and startedBefore is exclusive";

const ManualTestRunHistoryQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(30),
    startedFrom: z.string().describe(dateDescription).optional(),
    startedBefore: z.string().describe(dateDescription).optional(),
    testScenarioId: z.string().uuid().describe("Immutable source scenario UUID").optional(),
    status: ManualTestRunStatusSchema.optional(),
  })
  .strict()
  .openapi("ManualTestRunHistoryQuery");

const ManualTestRunScenarioHistoryQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(30),
    startedFrom: z.string().describe(dateDescription).optional(),
    startedBefore: z.string().describe(dateDescription).optional(),
    status: ManualTestRunStatusSchema.optional(),
  })
  .strict()
  .openapi("ManualTestRunScenarioHistoryQuery");

const ManualTestRunStartRequestSchema = z
  .object({
    notes: z.string().min(1).regex(/\S/).nullable().optional(),
  })
  .strict()
  .openapi("ManualTestRunStartRequest");

const ManualTestRunUpdateRequestSchema = z
  .object({
    status: ManualTestRunStatusSchema.optional(),
    notes: z.string().min(1).regex(/\S/).nullable().optional(),
  })
  .strict()
  .openapi("ManualTestRunUpdateRequest");

const ManualTestRunStepUpdateRequestSchema = z
  .object({
    status: ManualTestRunStepStatusSchema.optional(),
    notes: z.string().min(1).regex(/\S/).nullable().optional(),
  })
  .strict()
  .openapi("ManualTestRunStepUpdateRequest");

const ManualTestRunCompleteRequestSchema = z
  .object({
    status: z.enum(["passed", "failed", "blocked", "skipped"]),
    notes: z.string().min(1).regex(/\S/).nullable().optional(),
  })
  .strict()
  .openapi("ManualTestRunCompleteRequest");

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ErrorResponseSchema } },
});

const commonErrors = {
  400: errorResponse("Invalid request, identifier, filter, or immutable field"),
  401: errorResponse("Unauthorized"),
  403: errorResponse("Forbidden by the existing authentication lifecycle"),
  404: errorResponse("The requested project, scenario, run, or step was not found in scope"),
  409: errorResponse("The run cannot make the requested state transition"),
  500: errorResponse("Internal server error"),
};

export function registerManualTestRunRoutes(registry: OpenAPIRegistry): void {
  registry.register("ManualTestRunStatus", ManualTestRunStatusSchema);
  registry.register("ManualTestRunStepStatus", ManualTestRunStepStatusSchema);
  registry.register("ManualTestRunExecutor", ManualTestRunExecutorSchema);
  registry.register("ManualTestRunStep", ManualTestRunStepSchema);
  registry.register("ManualTestRun", ManualTestRunSchema);
  registry.register("ManualTestRunSummary", ManualTestRunSummarySchema);
  registry.register("ManualTestRunPage", ManualTestRunPageSchema);
  registry.register("ManualTestRunHistoryQuery", ManualTestRunHistoryQuerySchema);
  registry.register(
    "ManualTestRunScenarioHistoryQuery",
    ManualTestRunScenarioHistoryQuerySchema,
  );
  registry.register("ManualTestRunStartRequest", ManualTestRunStartRequestSchema);
  registry.register("ManualTestRunUpdateRequest", ManualTestRunUpdateRequestSchema);
  registry.register(
    "ManualTestRunStepUpdateRequest",
    ManualTestRunStepUpdateRequestSchema,
  );
  registry.register(
    "ManualTestRunCompleteRequest",
    ManualTestRunCompleteRequestSchema,
  );

  registry.registerPath({
    method: "post",
    path: "/api/v2/test-scenarios/{scenarioId}/manual-runs",
    description:
      "Starts an authenticated manual run by atomically capturing the structured scenario and ordered steps. The executor and timestamps are server-owned.",
    request: {
      params: ScenarioIdParamsSchema,
      query: ProjectIdQuerySchema,
      body: {
        required: false,
        content: { "application/json": { schema: ManualTestRunStartRequestSchema } },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Manual test run started",
        content: { "application/json": { schema: ManualTestRunSchema } },
      },
      ...commonErrors,
    },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios/{scenarioId}/manual-runs",
    description:
      "Lists lightweight runs for a live project-scoped scenario. The path scenario is the immutable source filter; offset pagination is deterministic for unchanged data but can shift after new runs.",
    request: {
      params: ScenarioIdParamsSchema,
      query: ManualTestRunScenarioHistoryQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Scenario manual-run history", content: { "application/json": { schema: ManualTestRunPageSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/manual-test-runs",
    description:
      "Lists project-scoped lightweight manual-run history, including detached runs after source scenario deletion. Filters combine with AND before page and count.",
    request: { query: ManualTestRunHistoryQuerySchema },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Project manual-run history", content: { "application/json": { schema: ManualTestRunPageSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/manual-test-runs/{runId}",
    description:
      "Retrieves a complete immutable snapshot and current execution state. Null live scenario/executor fields explicitly indicate deletion.",
    request: { params: RunIdParamsSchema, query: ProjectIdQuerySchema },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Manual test run detail", content: { "application/json": { schema: ManualTestRunSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/manual-test-runs/{runId}",
    description:
      "Updates active run notes or explicitly selects the overall outcome. A terminal status completes the run atomically; completed runs cannot be edited or reopened.",
    request: {
      params: RunIdParamsSchema,
      query: ProjectIdQuerySchema,
      body: { required: true, content: { "application/json": { schema: ManualTestRunUpdateRequestSchema } } },
    },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Updated manual test run", content: { "application/json": { schema: ManualTestRunSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/manual-test-runs/{runId}/steps/{stepId}",
    description:
      "Updates one copied step of an active run. Omitted notes are preserved and null clears them; source step content and position are immutable.",
    request: {
      params: RunStepParamsSchema,
      query: ProjectIdQuerySchema,
      body: { required: true, content: { "application/json": { schema: ManualTestRunStepUpdateRequestSchema } } },
    },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Updated manual test run", content: { "application/json": { schema: ManualTestRunSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/manual-test-runs/{runId}/complete",
    description:
      "Explicitly completes an active run using the same atomic transition as terminal run PATCH. Passing requires a nonempty run to have at least one passed step and no failed, blocked, or not-started steps; failed, blocked, and skipped may finish early.",
    request: {
      params: RunIdParamsSchema,
      query: ProjectIdQuerySchema,
      body: { required: true, content: { "application/json": { schema: ManualTestRunCompleteRequestSchema } } },
    },
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: "Completed manual test run", content: { "application/json": { schema: ManualTestRunSchema } } }, ...commonErrors },
    tags: ["Manual Test Runs"],
  });
}

export {
  ManualTestRunSchema,
  ManualTestRunSummarySchema,
  ManualTestRunPageSchema,
  ManualTestRunStatusSchema,
  ManualTestRunStepStatusSchema,
};
