// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";

export type StoredResultCategory = TestResultAnalysis["category"];

export const STORED_RESULT_CATEGORY_POLICY_VERSION =
  "stored-results-analysis-v1.1.0-category-v1";

export const STORED_RESULT_CATEGORY_PRIORITY = [
  "infra",
  "performance",
  "script",
  "bug",
  "other",
] as const satisfies readonly StoredResultCategory[];

export const STORED_RESULT_CATEGORY_CRITERIA = {
  infra:
    "Explicit network, DNS, connection, TLS, deployment, credential, or external authentication failures. Generic timeouts without network or environment signals are not infrastructure.",
  performance:
    "Timeouts or waits without network errors, slow responses, long execution, or exceeded performance/resource limits, including heap or memory exhaustion (OOM), memory-limit kills, worker/thread/pool exhaustion, or queue saturation.",
  script:
    "Test framework/setup/data errors, test-code defects, missing selectors or locators, or incorrect automation waits. Classify an assertion as script only when evidence shows the assertion or expected value is itself wrong.",
  bug: "Application defects shown by incorrect product behavior, deterministic logic failures, an application response that differs from the test's expected value, or unhandled application exceptions such as NullPointerException or TypeError in application code. Generic unknown errors alone are not enough.",
  other: "Evidence is missing, generic, insufficient, or conflicting and does not clearly support another category, such as an unknown failure with no diagnostic cause.",
} satisfies Record<StoredResultCategory, string>;

export const STORED_RESULT_CATEGORY_INSTRUCTIONS = `Classify this test result using only the supplied result evidence. Choose the first matching category in this priority order: ${STORED_RESULT_CATEGORY_PRIORITY.join(", ")}. Explicit infrastructure failures take priority over generic timeouts. Classify explicit resource exhaustion or saturation as performance. A test assertion that reports an actual application result different from its expected value is a bug unless the evidence shows the expectation/assertion itself is wrong. Classify explicit application exceptions as bugs and generic unknown failures without a diagnostic cause as other. A stack location alone does not determine the cause.`;
