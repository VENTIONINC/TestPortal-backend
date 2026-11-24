// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "@/lib/openapi/zod";

const uuid = z.string().uuid().toLowerCase();

export const tagProjectParams = z.object({ projectId: uuid });
export const tagItemParams = tagProjectParams.extend({
  tagId: uuid,
});
export const tagFields = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
  })
  .strict();
export const tagSummary = z
  .object({
    id: uuid,
    name: z.string(),
    description: z.string(),
  })
  .openapi("ScenarioTagSummary");
export const managedTag = tagSummary
  .extend({ usageCount: z.number().int().nonnegative() })
  .openapi("ManagedScenarioTag");

export const tagSelection = z.object({ tagIds: z.array(uuid).min(1) }).strict();
export const tagPreview = z.object({
  affectedCount: z.number().int(),
  revision: z.string(),
});
export const tagDelete = tagSelection.extend({
  revision: z.string().min(1),
  operationId: uuid,
});
export const tagUndo = z.object({ operationId: uuid }).strict();

const assignTarget = z.object({
  scenarioIds: z.array(uuid).min(1),
  present: z.boolean(),
});
export const assignmentBody = z.union([
  assignTarget.extend({ tagId: uuid }).strict(),
  assignTarget
    .extend({ name: z.string().trim().min(1), present: z.literal(true) })
    .strict(),
]);
export const inlineTagBody = z
  .object({ name: z.string().trim().min(1) })
  .strict();
export const selectedScenarioIds = z
  .object({ scenarioIds: z.array(uuid).min(1) })
  .strict();
