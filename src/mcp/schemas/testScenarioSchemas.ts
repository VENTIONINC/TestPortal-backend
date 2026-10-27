// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";
import {
  TEST_SCENARIO_SORT_FIELDS,
  TEST_SCENARIO_SORT_VALUES,
} from "@/types/testScenarios";

const testScenarioPrioritySchema = z.enum(["low", "medium", "high"]);
const testScenarioRelatedIssueUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Must be an absolute HTTP(S) URL",
  );
export const createTestScenarioSchema = z
  .object({
    projectId: z.string().uuid(),
    folderId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1),
    scenarioKey: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[^\r\n]+$/)
      .nullable()
      .optional(),
    details: z.string().trim().min(1).optional(),
    preconditions: z.string().trim().min(1).optional(),
    testData: z.string().trim().min(1).optional(),
    priority: testScenarioPrioritySchema.nullable().optional(),
    relatedIssueUrl: testScenarioRelatedIssueUrlSchema.nullable().optional(),
    steps: z
      .array(
        z
          .object({
            action: z.string().trim().min(1),
            expectedResult: z.string().trim().min(1).optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict() satisfies MCPToolSchema;

const uuid = () => z.string().uuid();
const page = () => z.number().int().min(1);
const limit = () => z.number().int().min(1).max(100);

export const listTestScenariosSchema = z
  .object({
    projectId: uuid().describe("The UUID of the project"),
    page: page().default(1),
    limit: limit().default(30),
    search: z
      .string()
      .optional()
      .describe(
        "Optional case-insensitive literal substring matched against title or scenarioKey; surrounding whitespace is trimmed by the service",
      ),
    createdById: uuid()
      .optional()
      .describe(
        "Optional creator User UUID filter; may identify any user, not only the authenticated user",
      ),
    sort: z
      .enum(TEST_SCENARIO_SORT_VALUES)
      .optional()
      .describe(
        "Ordering: recently_created (default, createdAt DESC then id DESC), recently_updated (updatedAt DESC then id DESC), or title_asc (title ASC then id ASC under database collation)",
      ),
    sortField: z.enum(TEST_SCENARIO_SORT_FIELDS).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    scenarioKey: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    title: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    details: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    folder: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    createdBy: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.sortDirection && !value.sortField)
      context.addIssue({
        code: "custom",
        path: ["sortDirection"],
        message: "sortDirection requires sortField",
      });
    if (value.sortField && value.sort !== undefined)
      context.addIssue({
        code: "custom",
        path: ["sort"],
        message: "sort cannot be combined with sortField",
      });
  }) satisfies MCPToolSchema;

export const getTestScenarioSchema = z
  .object({
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    projectId: uuid().describe("The UUID of the project"),
    resultPage: page().default(1),
    resultLimit: limit().default(30),
    issuePage: page().default(1),
    issueLimit: limit().default(30),
  })
  .strict() satisfies MCPToolSchema;

export const updateTestScenarioSchema = z
  .object({
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    projectId: uuid().describe("The UUID of the project"),
    title: z.string().trim().min(1).optional(),
    scenarioKey: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[^\r\n]+$/)
      .nullable()
      .optional(),
    details: z.string().trim().min(1).nullable().optional(),
    preconditions: z.string().trim().min(1).nullable().optional(),
    testData: z.string().trim().min(1).nullable().optional(),
    priority: testScenarioPrioritySchema.nullable().optional(),
    relatedIssueUrl: testScenarioRelatedIssueUrlSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== "scenarioId" && key !== "projectId",
      ),
    {
      message: "At least one editable field is required",
    },
  ) satisfies MCPToolSchema;

export const deleteTestScenarioSchema = z
  .object({
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    projectId: uuid().describe("The UUID of the project"),
  })
  .strict() satisfies MCPToolSchema;

export const appendTestScenarioStepSchema = z
  .object({
    projectId: uuid().describe("The UUID of the project"),
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    action: z.string().trim().min(1),
    expectedResult: z.string().trim().min(1).optional(),
  })
  .strict() satisfies MCPToolSchema;

export const updateTestScenarioStepSchema = z
  .object({
    projectId: uuid().describe("The UUID of the project"),
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    stepId: uuid().describe("The UUID of the scenario step"),
    action: z.string().trim().min(1).optional(),
    expectedResult: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => value.action !== undefined || value.expectedResult !== undefined,
    { message: "At least one step field is required" },
  ) satisfies MCPToolSchema;

export const deleteTestScenarioStepSchema = z
  .object({
    projectId: uuid().describe("The UUID of the project"),
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    stepId: uuid().describe("The UUID of the scenario step"),
  })
  .strict() satisfies MCPToolSchema;

export const reorderTestScenarioStepsSchema = z
  .object({
    projectId: uuid().describe("The UUID of the project"),
    scenarioId: uuid().describe("The UUID of the Test Scenario"),
    stepIds: z.array(uuid()).describe("Every current step UUID exactly once, in the desired order"),
  })
  .strict() satisfies MCPToolSchema;
