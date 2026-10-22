// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { OpenRouterChoiceQuestion } from "@/lib/openrouter-decisions/schemas";
import type { Category, TestInput } from "@/root/__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";
import {
  STORED_RESULT_CATEGORY_CRITERIA,
  STORED_RESULT_CATEGORY_INSTRUCTIONS,
  STORED_RESULT_CATEGORY_POLICY_VERSION,
  STORED_RESULT_CATEGORY_PRIORITY,
} from "@/lib/storedResultCategoryPolicy";

export const OPENROUTER_CATEGORY_POLICY_VERSION =
  STORED_RESULT_CATEGORY_POLICY_VERSION;
export const OPENROUTER_CATEGORY_PRIORITY = STORED_RESULT_CATEGORY_PRIORITY;
export const OPENROUTER_CATEGORY_CRITERIA =
  STORED_RESULT_CATEGORY_CRITERIA satisfies Record<Category, string>;
export const OPENROUTER_CATEGORY_INSTRUCTIONS =
  STORED_RESULT_CATEGORY_INSTRUCTIONS;

export function toOpenRouterEvidence(input: TestInput): Record<
  string,
  string | number | null
> {
  return {
    specKey: input.specKey,
    specTitle: input.specTitle,
    status: input.status,
    duration: input.duration,
    retry: input.retry,
    executionName: input.executionName,
    errorMessage: input.errorMessage ?? null,
    errorStack: input.errorStack ?? null,
    errorLocation: input.errorLocation ?? null,
  };
}

export function createOpenRouterCategoryQuestion(): OpenRouterChoiceQuestion {
  return {
    type: "choice",
    instructions: OPENROUTER_CATEGORY_INSTRUCTIONS,
    criteria: OPENROUTER_CATEGORY_CRITERIA,
  };
}
