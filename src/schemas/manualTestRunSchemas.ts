// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { environmentValueSchema } from "@/schemas/manualRunEnvironmentProfileSchemas";
import { MANUAL_TEST_RUN_SCENARIO_RESULTS } from "@/types/manualTestRuns";

const uuidSchema = z.string().uuid("Must be a valid UUID");
const positiveIntegerQuery = (defaultValue: number, maximum?: number) =>
  z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .transform(Number)
    .refine((value) => value > 0, "Must be greater than zero")
    .refine(
      (value) => maximum === undefined || value <= maximum,
      maximum === undefined
        ? "Must be a positive integer"
        : `Must be no greater than ${maximum}`,
    )
    .optional()
    .default(String(defaultValue));
const resultSchema = z.enum(MANUAL_TEST_RUN_SCENARIO_RESULTS);
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date in YYYY-MM-DD format");

const uniqueScenarioIdsSchema = z
  .array(uuidSchema)
  .min(1)
  .max(10_000)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Scenario IDs must be unique",
  );

const createEnvironmentFields = {
  browser: environmentValueSchema.optional(),
  operatingSystem: environmentValueSchema.optional(),
  device: environmentValueSchema.optional(),
  apiEnvironment: environmentValueSchema.optional(),
  build: environmentValueSchema.optional(),
  deployment: environmentValueSchema.optional(),
};
const createRunMetadata = {
  title: z.string().trim().min(1).max(200).optional(),
  environmentProperties: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    value: z.string().max(2_000),
  }).strict()).max(100).optional(),
};

export const manualTestRunCreateSchema = z.union([
  z
    .object({
      scenarioIds: uniqueScenarioIdsSchema,
      ...createEnvironmentFields,
      ...createRunMetadata,
    })
    .strict(),
  z.object({ suiteId: uuidSchema, ...createEnvironmentFields, ...createRunMetadata }).strict(),
]);

export const manualTestRunScenarioResultSchema = z
  .object({ result: resultSchema })
  .strict();
export const manualTestRunScenarioAssigneeSchema = z
  .object({ assigneeId: uuidSchema.nullable() })
  .strict();
export const manualTestRunScenarioOrderSchema = z
  .object({ scenarioIds: uniqueScenarioIdsSchema })
  .strict();
export const manualTestRunDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  scenarioIds: uniqueScenarioIdsSchema,
  environmentProperties: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    value: z.string().max(2_000),
  }).strict()).max(100),
}).strict();
export const manualTestRunStepEvidenceSchema = z
  .object({
    id: uuidSchema,
    comment: z.string().max(10_000).nullable().optional(),
    failedFlag: z.boolean().optional(),
    failedComment: z.string().max(2_000).nullable().optional(),
    blockedFlag: z.boolean().optional(),
    blockedComment: z.string().max(2_000).nullable().optional(),
  })
  .strict()
  .refine(
    ({ id: _id, ...fields }) =>
      Object.values(fields).some((value) => value !== undefined),
    "At least one step evidence field is required",
  );

export const manualTestRunScenarioEvidenceSchema = z.object({
  executionComment: z.string().max(10_000).nullable().optional(),
  defectReference: z.string().max(2_000).nullable().optional(),
  steps: z.array(manualTestRunStepEvidenceSchema).max(500).optional(),
}).strict().refine((value) =>
  value.executionComment !== undefined || value.defectReference !== undefined || (value.steps?.length ?? 0) > 0,
  "At least one execution evidence field is required",
);
export const manualTestRunScenarioBulkSchema = z
  .object({
    scenarioIds: uniqueScenarioIdsSchema,
    result: resultSchema.optional(),
    assigneeId: uuidSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.result !== undefined || value.assigneeId !== undefined,
    "At least one bulk result or assignment change is required",
  );

export const manualTestRunIdParamsSchema = z.object({ runId: uuidSchema });
export const manualTestRunScenarioParamsSchema = z.object({
  scenarioId: uuidSchema,
});
export const manualTestRunProjectQuerySchema = z.object({
  projectId: uuidSchema,
});

export const manualTestRunHistoryQuerySchema = z
  .object({
    projectId: uuidSchema,
    page: positiveIntegerQuery(1),
    limit: positiveIntegerQuery(30, 100),
    search: z.string().trim().max(200).optional(),
    show: z
      .enum(["in_progress", "completed", "all"])
      .optional()
      .default("in_progress"),
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
      .optional()
      .default("recent"),
    timeZone: z.string().trim().min(1).max(100).optional().default("UTC"),
    dateFrom: dateOnlySchema.optional(),
    dateTo: dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.period === "custom" && (!value.dateFrom || !value.dateTo)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateFrom"],
        message: "Custom period requires dateFrom and dateTo",
      });
    }
    if (
      value.period !== "custom" &&
      (value.dateFrom !== undefined || value.dateTo !== undefined)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period"],
        message: "dateFrom and dateTo are only valid for a custom period",
      });
    }
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateFrom"],
        message: "dateFrom must not be after dateTo",
      });
    }
  });

export const manualTestRunCompleteSchema = z.object({ requireAllMarked: z.boolean().optional() }).strict();
export const manualTestRunReopenSchema = z.object({}).strict();

export type ManualTestRunCreateInput = z.infer<
  typeof manualTestRunCreateSchema
>;
export type ManualTestRunHistoryQuery = z.infer<
  typeof manualTestRunHistoryQuerySchema
>;
export type ManualTestRunCompleteInput = z.infer<
  typeof manualTestRunCompleteSchema
>;
