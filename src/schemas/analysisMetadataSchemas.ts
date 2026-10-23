// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const nullableNonnegativeInteger = z.number().int().nonnegative().nullable();
const nullableNonnegativeFinite = z.number().finite().nonnegative().nullable();

export const analysisMetadataSchema = z.object({
  version: z.literal(1),
  provider: z.enum(["openrouter", "openai", "typesafe"]),
  apiMode: z.enum(["decisions", "chat_completions", "generative"]),
  metricsScope: z.enum(["per_result", "shared_request"]),
  requestedModel: z.string().nullable(),
  returnedModel: z.string().nullable(),
  upstreamProvider: z.string().nullable(),
  requestId: z.string().nullable(),
  analyzedAt: z.string().datetime(),
  latencyMs: nullableNonnegativeInteger,
  attempts: z.number().int().nonnegative().nullable(),
  inputTokens: nullableNonnegativeInteger,
  outputTokens: nullableNonnegativeInteger,
  totalTokens: nullableNonnegativeInteger,
  cost: nullableNonnegativeFinite,
  rawConfidence: z.number().finite().min(0).max(1).nullable(),
  categoryProbabilities: z.record(z.number().finite().min(0).max(1)).nullable(),
  categoryPolicyVersion: z.string().min(1).nullable().optional(),
  confidenceMappingVersion: z.literal("decisions-confidence-v1").nullable(),
}).strict();

export const analysisLastErrorSchema = z.object({
  version: z.literal(1),
  kind: z.enum([
    "configuration",
    "authentication",
    "credit",
    "rate_limit",
    "timeout",
    "network",
    "upstream",
    "invalid_response",
    "refusal",
    "persistence",
  ]),
  message: z.string().min(1),
  occurredAt: z.string().datetime(),
  attempts: z.number().int().nonnegative().nullable(),
  httpStatus: z.number().int().min(100).max(599).nullable(),
  provider: z.enum(["openrouter", "openai", "typesafe"]),
  model: z.string().nullable(),
  apiMode: z.enum(["decisions", "chat_completions", "generative"]),
}).strict();

export type AnalysisMetadata = z.infer<typeof analysisMetadataSchema>;
export type AnalysisLastError = z.infer<typeof analysisLastErrorSchema>;
