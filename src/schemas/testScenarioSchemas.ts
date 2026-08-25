// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const uuidSchema = z.string().uuid("Must be a valid UUID");

export const createTestScenarioSchema = z
  .object({
    projectId: uuidSchema,
    title: z.string().trim().min(1, "Title is required"),
    contentMd: z.string().min(1, "contentMd is required"),
  });

export const testScenarioProjectQuerySchema = z.object({
  projectId: uuidSchema,
});

export const testScenarioIdParamsSchema = z.object({
  scenarioId: uuidSchema,
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
});

export type CreateTestScenarioInput = z.infer<typeof createTestScenarioSchema>;
export type TestScenarioProjectQuery = z.infer<
  typeof testScenarioProjectQuerySchema
>;
export type TestScenarioIdParams = z.infer<typeof testScenarioIdParamsSchema>;
export type TestScenarioListQuery = z.infer<
  typeof testScenarioListQuerySchema
>;
