// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const resultCategorySchema = z.enum([
  "bug",
  "infra",
  "performance",
  "script",
  "other",
]);

const confidenceProbabilitySchema = z.number().finite().min(0).max(1);

export const analysisMetadataSchema = z
  .object({
    version: z.literal(1),
    strategy: z.enum(["decisions", "generative"]),
    connection: z.enum(["openai", "custom"]),
    requestedModel: z.string().max(128).nullable(),
    returnedModel: z.string().max(128).nullable(),
    analyzedAt: z.string().datetime(),
    latencyMs: z.number().int().nonnegative().nullable(),
    attempts: z.number().int().nonnegative().nullable(),
    rawConfidence: confidenceProbabilitySchema.nullable(),
    categoryProbabilities: z
      .record(resultCategorySchema, confidenceProbabilitySchema)
      .nullable(),
    categoryPolicyVersion: z.string().min(1).nullable(),
    confidenceMappingVersion: z.literal("decisions-confidence-v1").nullable(),
  })
  .strict();

export const analysisLastErrorSchema = z
  .object({
    version: z.literal(1),
    kind: z.enum([
      "configuration",
      "authentication",
      "rate_limit",
      "timeout",
      "invalid_response",
      "upstream",
      "persistence",
    ]),
    message: z.string().min(1).max(120),
    occurredAt: z.string().datetime(),
    connection: z.enum(["openai", "custom"]),
    model: z.string().max(128).nullable(),
    strategy: z.enum(["decisions", "generative"]),
  })
  .strict();

export type AnalysisMetadata = z.infer<typeof analysisMetadataSchema>;
export type AnalysisLastError = z.infer<typeof analysisLastErrorSchema>;
