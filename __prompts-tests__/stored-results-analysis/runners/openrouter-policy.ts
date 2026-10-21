// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { OpenRouterChoiceQuestion } from "../../../src/lib/openrouter-decisions/schemas";
import type { Category, TestInput } from "../v1.1.0/templates/types";

export const OPENROUTER_CATEGORY_POLICY_VERSION =
  "stored-results-analysis-v1.1.0-category-v1";

export const OPENROUTER_CATEGORY_PRIORITY = [
  "infra",
  "performance",
  "script",
  "bug",
  "other",
] as const satisfies readonly Category[];

// Keep these definitions in sync with the existing direct TypeSafe evaluation.
export const OPENROUTER_CATEGORY_CRITERIA: Record<Category, string> = {
  infra:
    "Explicit network, DNS, connection, TLS, deployment, credential, or external authentication failures.",
  performance:
    "Timeouts without explicit network error codes, or evidence that performance constraints were exceeded.",
  script:
    "Defects in test automation scripts, selectors, setup, or test harness behavior.",
  bug: "Defects in the application under test, including incorrect behavior or failed assertions.",
  other: "Insufficient or conflicting evidence for the other categories.",
};

export const OPENROUTER_CATEGORY_INSTRUCTIONS = `Classify this test result using only the supplied result evidence. Choose the first matching category in this priority order: ${OPENROUTER_CATEGORY_PRIORITY.join(", ")}. Explicit infrastructure failures take priority over generic timeouts. Use other when evidence is insufficient or conflicting.`;

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
