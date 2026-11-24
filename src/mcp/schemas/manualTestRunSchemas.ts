// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import { environment } from "@/mcp/schemas/manualRunEnvironmentProfileSchemas";
import { MANUAL_TEST_RUN_SCENARIO_RESULTS } from "@/types/manualTestRuns";

const uniqueScenarioIdsSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(10_000)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Scenario IDs must be unique",
  );
const manualRunTitleSchema = z.string().trim().min(1).max(200);
const manualRunEnvironmentPropertiesSchema = z
  .array(
    z
      .object({
        name: z.string().trim().min(1).max(100),
        value: z.string().max(2_000),
      })
      .strict(),
  )
  .max(100);
const manualRunResultValueSchema = z.enum(MANUAL_TEST_RUN_SCENARIO_RESULTS);
const manualRunStepEvidenceFields = {
  comment: z.string().max(10_000).nullable().optional(),
  failedFlag: z.boolean().optional(),
  failedComment: z.string().max(2_000).nullable().optional(),
  blockedFlag: z.boolean().optional(),
  blockedComment: z.string().max(2_000).nullable().optional(),
};

const projectId = z.string().uuid();
const runScope = { projectId, runId: z.string().uuid() };
const scenarioScope = { ...runScope, scenarioId: z.string().uuid() };
const startFields = {
  projectId,
  browser: environment.optional(),
  operatingSystem: environment.optional(),
  device: environment.optional(),
  apiEnvironment: environment.optional(),
  build: environment.optional(),
  deployment: environment.optional(),
  title: manualRunTitleSchema.optional(),
  environmentProperties: manualRunEnvironmentPropertiesSchema.optional(),
};

export const startManualTestRunSchema = z.union([
  z.object({ ...startFields, scenarioIds: uniqueScenarioIdsSchema }).strict(),
  z.object({ ...startFields, suiteId: z.string().uuid() }).strict(),
]);

export const getManualTestRunSchema = z.object(runScope).strict();
export const updateManualTestRunSchema = z
  .object({
    ...runScope,
    title: manualRunTitleSchema,
    scenarioIds: uniqueScenarioIdsSchema,
    environmentProperties: manualRunEnvironmentPropertiesSchema,
  })
  .strict();
export const updateManualTestRunStepSchema = z
  .object({
    ...scenarioScope,
    stepId: z.string().uuid(),
    ...manualRunStepEvidenceFields,
  })
  .strict()
  .refine(
    ({
      projectId: _project,
      runId: _run,
      scenarioId: _scenario,
      stepId: _step,
      ...fields
    }) => Object.values(fields).some((value) => value !== undefined),
    "At least one step evidence field is required",
  );
export const updateManualTestRunResultSchema = z
  .object({ ...scenarioScope, result: manualRunResultValueSchema })
  .strict();
export const completeManualTestRunSchema = z
  .object({ ...runScope, requireAllMarked: z.boolean().optional() })
  .strict();

const runHistorySchema = z
  .object({
    projectId,
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(30),
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
  .strict();

const validPeriod = ({
  period,
  dateFrom,
  dateTo,
}: z.output<typeof runHistorySchema>) =>
  period === "custom"
    ? dateFrom !== undefined && dateTo !== undefined && dateFrom <= dateTo
    : dateFrom === undefined && dateTo === undefined;
const periodMessage =
  "Provide ordered dateFrom and dateTo only when period is custom.";

export const listManualTestRunsSchema = runHistorySchema.refine(
  validPeriod,
  periodMessage,
);
export const listTestScenarioManualRunsSchema = runHistorySchema
  .extend({ scenarioId: z.string().uuid() })
  .refine(validPeriod, periodMessage);
export const listActiveUsersSchema = z.object({}).strict();
export const reassignManualTestRunExecutorSchema = z
  .object({ ...scenarioScope, assigneeId: z.string().uuid().nullable() })
  .strict();

export type StartManualTestRunInput = z.infer<typeof startManualTestRunSchema>;
export type GetManualTestRunInput = z.infer<typeof getManualTestRunSchema>;
export type UpdateManualTestRunInput = z.infer<
  typeof updateManualTestRunSchema
>;
export type UpdateManualTestRunStepInput = z.infer<
  typeof updateManualTestRunStepSchema
>;
export type UpdateManualTestRunResultInput = z.infer<
  typeof updateManualTestRunResultSchema
>;
export type CompleteManualTestRunInput = z.infer<
  typeof completeManualTestRunSchema
>;
export type ListManualTestRunsInput = z.infer<typeof listManualTestRunsSchema>;
export type ListTestScenarioManualRunsInput = z.infer<
  typeof listTestScenarioManualRunsSchema
>;
export type ReassignManualTestRunExecutorInput = z.infer<
  typeof reassignManualTestRunExecutorSchema
>;
