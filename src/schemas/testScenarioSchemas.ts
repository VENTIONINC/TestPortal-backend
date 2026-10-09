// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { editableTestManagementKeySchema } from "@/schemas/testManagementKeySchemas";
import { TEST_SCENARIO_SORT_FIELDS, TEST_SCENARIO_SORT_VALUES } from "@/types/testScenarios";

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
    folderId: uuidSchema.nullable().optional(),
    title: nonBlankText,
    scenarioKey: editableTestManagementKeySchema.optional(),
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
    folderId: uuidSchema.nullable().optional(),
    title: nonBlankText.optional(),
    scenarioKey: editableTestManagementKeySchema.optional(),
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
  sort: z.enum(TEST_SCENARIO_SORT_VALUES).optional(),
  sortField: z.enum(TEST_SCENARIO_SORT_FIELDS).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  scenarioKey: z.string().trim().optional().transform((value) => value || undefined),
  title: z.string().trim().optional().transform((value) => value || undefined),
  details: z.string().trim().optional().transform((value) => value || undefined),
  folder: z.string().trim().optional().transform((value) => value || undefined),
  createdBy: z.string().trim().optional().transform((value) => value || undefined),
  folderId: z.union([uuidSchema, z.literal("unfiled")]).optional(),
  includeDescendants: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  suiteId: uuidSchema.optional(),
}).superRefine((value, context) => {
  if (value.sortDirection && !value.sortField) context.addIssue({ code: "custom", path: ["sortDirection"], message: "sortDirection requires sortField" });
  if (value.sortField && value.sort !== undefined) context.addIssue({ code: "custom", path: ["sort"], message: "sort cannot be combined with sortField" });
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
