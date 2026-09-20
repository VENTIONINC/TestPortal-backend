// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";
import { TEST_SCENARIO_SORT_VALUES } from "@/types/testScenarios";

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
        "Optional case-insensitive literal substring matched against title only",
      ),
    createdById: uuid()
      .optional()
      .describe(
        "Optional creator User UUID filter; may identify any user, not only the authenticated user",
      ),
    sort: z
      .enum(TEST_SCENARIO_SORT_VALUES)
      .default("recently_created")
      .describe("Ordering: recently_created, recently_updated, or title_asc"),
  })
  .strict() satisfies MCPToolSchema;

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
    details: z.string().trim().min(1).nullable().optional(),
    objective: z.string().trim().min(1).nullable().optional(),
    preconditions: z.string().trim().min(1).nullable().optional(),
    testData: z.string().trim().min(1).nullable().optional(),
    expectedResult: z.string().trim().min(1).nullable().optional(),
    notes: z.string().trim().min(1).nullable().optional(),
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
