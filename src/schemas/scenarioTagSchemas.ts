// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "@/lib/openapi/zod";

export const tagProjectParams = z.object({ projectId: z.string().uuid() });
export const tagItemParams = tagProjectParams.extend({
  tagId: z.string().uuid(),
});
export const tagFields = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
  })
  .strict();
export const tagSummary = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
  })
  .openapi("ScenarioTagSummary");
export const managedTag = tagSummary
  .extend({ usageCount: z.number().int().nonnegative() })
  .openapi("ManagedScenarioTag");

export const tagSelection = z
  .object({ tagIds: z.array(z.string().uuid()).min(1) })
  .strict();
export const tagPreview = z.object({
  affectedCount: z.number().int(),
  revision: z.string(),
});
export const tagDelete = tagSelection.extend({
  revision: z.string().min(1),
  operationId: z.string().uuid(),
});
export const tagUndo = z.object({ operationId: z.string().uuid() }).strict();

const assignTarget = z.object({
  scenarioIds: z.array(z.string().uuid()).min(1),
  present: z.boolean(),
});
export const assignmentBody = z.union([
  assignTarget.extend({ tagId: z.string().uuid() }).strict(),
  assignTarget
    .extend({ name: z.string().trim().min(1), present: z.literal(true) })
    .strict(),
]);
export const inlineTagBody = z
  .object({ name: z.string().trim().min(1) })
  .strict();
export const selectedScenarioIds = z
  .object({ scenarioIds: z.array(z.string().uuid()).min(1) })
  .strict();
