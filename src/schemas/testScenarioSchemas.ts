// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import {
  TEST_SCENARIO_SORT_FIELDS,
  TEST_SCENARIO_SORT_VALUES,
} from "@/types/testScenarios";

const uuidSchema = z.string().uuid("Must be a valid UUID");
const nonBlankText = z.string().trim().min(1, "Value must not be blank");
const commaSeparatedUuidSchema = z.string().min(1).superRefine((value, context) => {
  const ids = value.split(",");
  ids.forEach((id, index) => {
    if (!uuidSchema.safeParse(id).success) {
      context.addIssue({ code: "custom", path: [index], message: "Each value must be a valid UUID" });
    }
  });
  if (new Set(ids.map((id) => id.toLowerCase())).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Creator UUIDs must be unique" });
  }
});

export const testScenarioPrioritySchema = z.enum(["low", "medium", "high"]);
export const testScenarioRelatedIssueUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        /^https?:\/\//i.test(value) &&
        ["http:", "https:"].includes(url.protocol)
      );
    } catch {
      return false;
    }
  }, "Must be an absolute HTTP(S) URL");

const createStepSchema = z
  .object({
    action: nonBlankText,
    expectedResult: nonBlankText.optional(),
  })
  .strict();

export const editorStepSchema = z
  .object({
    id: uuidSchema.optional(),
    action: nonBlankText,
    expectedResult: nonBlankText.nullable().optional(),
  })
  .strict();
export const scenarioSuiteIdsSchema = z
  .array(uuidSchema)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate suite IDs");
export const scenarioNewSuitesSchema = z
  .array(z.object({ name: nonBlankText.max(200) }).strict())
  .refine(
    (suites) =>
      new Set(suites.map(({ name }) => name.toLowerCase())).size ===
      suites.length,
    "Duplicate suite names",
  );

export const createTestScenarioSchema = z
  .object({
    projectId: uuidSchema,
    folderId: uuidSchema.nullable().optional(),
    title: nonBlankText,
    details: nonBlankText.optional(),
    preconditions: nonBlankText.optional(),
    testData: nonBlankText.optional(),
    priority: testScenarioPrioritySchema.default("medium"),
    relatedIssueUrl: testScenarioRelatedIssueUrlSchema.nullable().optional(),
    steps: z.array(createStepSchema).default([]),
    suiteIds: scenarioSuiteIdsSchema.optional(),
    newSuites: scenarioNewSuitesSchema.optional(),
  })
  .strict();

const updateFieldSchema = nonBlankText.nullable();

export const updateTestScenarioSchema = z
  .object({
    folderId: uuidSchema.nullable().optional(),
    title: nonBlankText.optional(),
    details: updateFieldSchema.optional(),
    preconditions: updateFieldSchema.optional(),
    testData: updateFieldSchema.optional(),
    priority: testScenarioPrioritySchema.optional(),
    relatedIssueUrl: testScenarioRelatedIssueUrlSchema.nullable().optional(),
    steps: z
      .array(editorStepSchema)
      .refine((steps) => {
        const ids = steps.flatMap((step) => (step.id ? [step.id] : []));
        return new Set(ids).size === ids.length;
      }, "Duplicate step IDs")
      .optional(),
    suiteIds: scenarioSuiteIdsSchema.optional(),
    newSuites: scenarioNewSuitesSchema.optional(),
    expectedRevision: z.number().int().positive().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  })
  .superRefine((value, context) => {
    const supplied = [value.steps, value.suiteIds, value.newSuites].filter(
      (item) => item !== undefined,
    ).length;
    if (
      (supplied > 0 &&
        (supplied !== 3 || value.expectedRevision === undefined)) ||
      (supplied === 0 && value.expectedRevision !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Editor saves require steps, suiteIds, newSuites and expectedRevision together",
      });
    }
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

const testScenarioListQueryBaseSchema = z.object({
  projectId: uuidSchema,
  page: positiveIntegerQuerySchema(1),
  limit: positiveIntegerQuerySchema(30, 100),
  search: z.string().trim().optional(),
  createdById: uuidSchema.optional(),
  createdByIds: commaSeparatedUuidSchema.optional(),
  priority: z.string().regex(/^(low|medium|high)(,(low|medium|high))*$/).optional(),
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
});

const validateScenarioAuthorFilter = (
  value: { createdById?: string | undefined; createdByIds?: string | undefined },
  context: z.RefinementCtx,
) => {
  if (value.createdById && value.createdByIds) {
    context.addIssue({ code: "custom", path: ["createdByIds"], message: "Use createdById or createdByIds, not both" });
  }
};

export const testScenarioListQuerySchema = testScenarioListQueryBaseSchema.superRefine((value, context) => {
  validateScenarioAuthorFilter(value, context);
  if (value.sortDirection && !value.sortField) context.addIssue({ code: "custom", path: ["sortDirection"], message: "sortDirection requires sortField" });
  if (value.sortField && value.sort !== undefined) context.addIssue({ code: "custom", path: ["sort"], message: "sort cannot be combined with sortField" });
});

export const testScenarioSelectionQuerySchema = testScenarioListQueryBaseSchema
  .omit({ page: true, limit: true, sort: true, sortField: true, sortDirection: true })
  .strict()
  .superRefine(validateScenarioAuthorFilter);
export const testScenarioAuthorsQuerySchema = testScenarioListQueryBaseSchema
  .omit({ page: true, limit: true, createdById: true, createdByIds: true, sort: true, sortField: true, sortDirection: true })
  .strict();
export type TestScenarioSelectionQuery = z.infer<typeof testScenarioSelectionQuerySchema>;
export type TestScenarioAuthorsQuery = z.infer<typeof testScenarioAuthorsQuerySchema>;

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
