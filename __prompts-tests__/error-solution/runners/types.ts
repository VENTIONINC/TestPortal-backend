// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ErrorSuggestionOutput } from "@/schemas/errorSuggestionSchemas";

export interface EvalFailure {
  testCaseName: string;
  reason: string;
}

export interface EvalResult {
  responses: Array<{ testCaseName: string; output: ErrorSuggestionOutput }>;
  failures: EvalFailure[];
  metadata: EvalMetadata;
}

export interface EvalMetadata {
  suite: string;
  operation: string;
  promptVersion: string;
  configurationVersion: 1;
  configurationSource: "evaluation-baseline" | "custom";
  profile: string;
  provider: "openai";
  requestedModel: string;
  reasoning?: { effort: "none" | "low" | "medium" | "high" };
  generationSettings: {
    temperature?: number;
    maxOutputTokens: number;
    maxRetries: number;
    timeoutMs?: number;
    cache?: false;
  };
}
