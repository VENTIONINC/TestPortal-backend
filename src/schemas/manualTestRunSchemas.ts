// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import {
  MANUAL_TEST_RUN_STATUSES,
  MANUAL_TEST_RUN_STEP_STATUSES,
  MANUAL_TEST_RUN_TERMINAL_STATUSES,
} from "@/types/manualTestRuns";

const uuidSchema = z.string().uuid("Must be a valid UUID");
const nonBlankText = z.string().trim().min(1, "Value must not be blank");
const positiveIntegerQuery = (defaultValue: number, maximum?: number) => {
  const schema = z
    .string()
    .regex(/^\d+$/, "Must be a positive integer")
    .transform(Number)
    .refine((value) => value > 0, "Must be greater than zero")
    .refine(
      (value) => maximum === undefined || value <= maximum,
      maximum === undefined
        ? "Must be a positive integer"
        : `Must be no greater than ${maximum}`,
    );
  return schema.optional().default(String(defaultValue));
};

const runStatusSchema = z.enum(MANUAL_TEST_RUN_STATUSES);
const stepStatusSchema = z.enum(MANUAL_TEST_RUN_STEP_STATUSES);
const terminalStatusSchema = z.enum(MANUAL_TEST_RUN_TERMINAL_STATUSES);
const notesSchema = nonBlankText.nullable();
const timestampSchema = z.string().refine(
  (value) => {
    const hasTimezone =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        value,
      );
    return hasTimezone && !Number.isNaN(Date.parse(value));
  },
  "Must be an RFC 3339 timestamp with an explicit timezone",
);

function withDateRangeValidation<T extends z.AnyZodObject>(schema: T): T {
  return schema.superRefine((value, context) => {
    const startedFrom = value.startedFrom as string | undefined;
    const startedBefore = value.startedBefore as string | undefined;
    if (
      startedFrom !== undefined &&
      startedBefore !== undefined &&
      new Date(startedFrom).getTime() >= new Date(startedBefore).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startedFrom"],
        message: "startedFrom must be earlier than startedBefore",
      });
    }
  }) as unknown as T;
}

export const manualTestRunStartSchema = z
  .object({
    notes: notesSchema.optional(),
  })
  .strict();

export const manualTestRunIdParamsSchema = z.object({
  runId: uuidSchema,
});

export const manualTestRunStepParamsSchema = z.object({
  runId: uuidSchema,
  stepId: uuidSchema,
});

export const manualTestRunScenarioParamsSchema = z.object({
  scenarioId: uuidSchema,
});

export const manualTestRunProjectQuerySchema = z.object({
  projectId: uuidSchema,
});

export const manualTestRunHistoryQuerySchema = withDateRangeValidation(
  z
    .object({
      projectId: uuidSchema,
      page: positiveIntegerQuery(1),
      limit: positiveIntegerQuery(30, 100),
      startedFrom: timestampSchema.optional(),
      startedBefore: timestampSchema.optional(),
      testScenarioId: uuidSchema.optional(),
      status: runStatusSchema.optional(),
    })
    .strict(),
);

export const manualTestRunScenarioHistoryQuerySchema = withDateRangeValidation(
  z
    .object({
      projectId: uuidSchema,
      page: positiveIntegerQuery(1),
      limit: positiveIntegerQuery(30, 100),
      startedFrom: timestampSchema.optional(),
      startedBefore: timestampSchema.optional(),
      status: runStatusSchema.optional(),
    })
    .strict(),
);

export const manualTestRunUpdateSchema = z
  .object({
    status: runStatusSchema.optional(),
    notes: notesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  });

export const manualTestRunStepUpdateSchema = z
  .object({
    status: stepStatusSchema.optional(),
    notes: notesSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  });

export const manualTestRunCompleteSchema = z
  .object({
    status: terminalStatusSchema,
    notes: notesSchema.optional(),
  })
  .strict();

export type ManualTestRunStartInput = z.infer<typeof manualTestRunStartSchema>;
export type ManualTestRunHistoryQuery = z.infer<
  typeof manualTestRunHistoryQuerySchema
>;
export type ManualTestRunScenarioHistoryQuery = z.infer<
  typeof manualTestRunScenarioHistoryQuerySchema
>;
export type ManualTestRunUpdateInput = z.infer<
  typeof manualTestRunUpdateSchema
>;
export type ManualTestRunStepUpdateInput = z.infer<
  typeof manualTestRunStepUpdateSchema
>;
export type ManualTestRunCompleteInput = z.infer<
  typeof manualTestRunCompleteSchema
>;
