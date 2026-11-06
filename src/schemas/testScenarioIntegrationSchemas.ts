// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const uuidSchema = z.string().uuid("Must be a valid UUID");

const positiveIntegerQuerySchema = (defaultValue: number, maximum?: number) => {
  const schema = z.coerce
    .number()
    .int("Must be an integer")
    .positive("Must be greater than zero");

  return (maximum === undefined ? schema : schema.max(maximum)).default(
    defaultValue,
  );
};

export const testScenarioSpecLinkParamsSchema = z.object({
  scenarioId: uuidSchema,
});

export const testScenarioSpecLinkDeleteParamsSchema = z.object({
  scenarioId: uuidSchema,
  specId: uuidSchema,
});

export const testScenarioSpecLinkQuerySchema = z.object({
  projectId: uuidSchema,
});

export const testScenarioSpecLinkListQuerySchema = z.object({
  projectId: uuidSchema,
  page: positiveIntegerQuerySchema(1),
  limit: positiveIntegerQuerySchema(30, 100),
});

export const testScenarioSpecLinkBodySchema = z.object({
  specId: uuidSchema,
});

export const testScenarioEvidenceParamsSchema = testScenarioSpecLinkParamsSchema;

export const testScenarioEvidenceQuerySchema = z.object({
  projectId: uuidSchema,
  page: positiveIntegerQuerySchema(1),
  limit: positiveIntegerQuerySchema(30, 100),
});

export type TestScenarioSpecLinkParams = z.infer<
  typeof testScenarioSpecLinkParamsSchema
>;
export type TestScenarioSpecLinkDeleteParams = z.infer<
  typeof testScenarioSpecLinkDeleteParamsSchema
>;
export type TestScenarioSpecLinkQuery = z.infer<
  typeof testScenarioSpecLinkQuerySchema
>;
export type TestScenarioSpecLinkListQuery = z.infer<
  typeof testScenarioSpecLinkListQuerySchema
>;
export type TestScenarioSpecLinkBody = z.infer<
  typeof testScenarioSpecLinkBodySchema
>;
export type TestScenarioEvidenceParams = z.infer<
  typeof testScenarioEvidenceParamsSchema
>;
export type TestScenarioEvidenceQuery = z.infer<
  typeof testScenarioEvidenceQuerySchema
>;
