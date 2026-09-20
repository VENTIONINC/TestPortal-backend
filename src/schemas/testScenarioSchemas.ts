// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { TEST_SCENARIO_SORT_VALUES } from "@/types/testScenarios";

const uuidSchema = z.string().uuid("Must be a valid UUID");
const nonBlankText = z.string().trim().min(1, "Value must not be blank");

const createStepSchema = z
  .object({
    action: nonBlankText,
    expectedResult: nonBlankText.optional(),
  })
  .strict();

export const createTestScenarioSchema = z
  .object({
    projectId: uuidSchema,
    title: nonBlankText,
    details: nonBlankText.optional(),
    objective: nonBlankText.optional(),
    preconditions: nonBlankText.optional(),
    testData: nonBlankText.optional(),
    expectedResult: nonBlankText.optional(),
    notes: nonBlankText.optional(),
    steps: z.array(createStepSchema).default([]),
  })
  .strict();

const updateFieldSchema = nonBlankText.nullable();

export const updateTestScenarioSchema = z
  .object({
    title: nonBlankText.optional(),
    details: updateFieldSchema.optional(),
    objective: updateFieldSchema.optional(),
    preconditions: updateFieldSchema.optional(),
    testData: updateFieldSchema.optional(),
    expectedResult: updateFieldSchema.optional(),
    notes: updateFieldSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  });

export const appendTestScenarioStepSchema = z
  .object({
    action: nonBlankText,
    expectedResult: nonBlankText.optional(),
  })
  .strict();

export const updateTestScenarioStepSchema = z
  .object({
    action: nonBlankText.optional(),
    expectedResult: updateFieldSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one step field is required",
  });

export const reorderTestScenarioStepsSchema = z
  .object({ stepIds: z.array(uuidSchema) })
  .strict();

export const testScenarioProjectQuerySchema = z.object({
  projectId: uuidSchema,
});

export const testScenarioIdParamsSchema = z.object({
  scenarioId: uuidSchema,
});

export const testScenarioStepParamsSchema = z.object({
  scenarioId: uuidSchema,
  stepId: uuidSchema,
});

const positiveIntegerQuerySchema = (defaultValue: number, maximum?: number) => {
  const schema = z.coerce
    .number()
    .int("Must be an integer")
    .positive("Must be greater than zero");

  return (maximum === undefined ? schema : schema.max(maximum)).default(
    defaultValue,
  );
};

export const testScenarioListQuerySchema = z.object({
  projectId: uuidSchema,
  page: positiveIntegerQuerySchema(1),
  limit: positiveIntegerQuerySchema(30, 100),
  search: z.string().trim().optional(),
  createdById: uuidSchema.optional(),
  sort: z.enum(TEST_SCENARIO_SORT_VALUES).default("recently_created"),
});

export type CreateTestScenarioInput = z.infer<typeof createTestScenarioSchema>;
export type UpdateTestScenarioInput = z.infer<typeof updateTestScenarioSchema>;
export type AppendTestScenarioStepInput = z.infer<
  typeof appendTestScenarioStepSchema
>;
export type UpdateTestScenarioStepInput = z.infer<
  typeof updateTestScenarioStepSchema
>;
export type ReorderTestScenarioStepsInput = z.infer<
  typeof reorderTestScenarioStepsSchema
>;
export type TestScenarioProjectQuery = z.infer<
  typeof testScenarioProjectQuerySchema
>;
export type TestScenarioIdParams = z.infer<typeof testScenarioIdParamsSchema>;
export type TestScenarioStepParams = z.infer<
  typeof testScenarioStepParamsSchema
>;
export type TestScenarioListQuery = z.infer<typeof testScenarioListQuerySchema>;
