// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function performanceSlowResponse(i: number): TestCase {
  const flaky = i % 2 === 0;
  const base = makeCaseBase(i, {
    name: "performance: response exceeded wait threshold",
    status: flaky ? "flaky" : "failed",
    specKey: pick(i, [
      "e2e/search.spec.ts > Search > should display results",
      "api/reports.spec.ts > Reports API > should generate summary",
      "e2e/dashboard.spec.ts > Dashboard > should load metrics",
    ]),
    specTitle: pick(i, [
      "should display results",
      "should generate summary",
      "should load metrics",
    ]),
    executionName: pick(i, ["Chrome - Production", "API Tests - Staging"]),
    duration: pick(i, [15000, 30000, 45000]),
    retry: flaky ? 1 : 0,
    errorMessage: pick(i, [
      "Timeout 15000ms exceeded while waiting for search results to render",
      "Response time 30421ms exceeded the 10000ms service-level threshold",
      "Timed out waiting for dashboard metrics after 45000ms",
    ]),
    errorStack: pick(i, [
      "at SearchPage.waitForResults (pages/search.ts:61:12)",
      "at ReportsClient.waitForSummary (clients/reports.ts:88:14)",
      "at DashboardPage.waitForMetrics (pages/dashboard.ts:47:10)",
    ]),
    errorLocation: pick(i, [
      "e2e/search.spec.ts:40:8",
      "api/reports.spec.ts:73:6",
      "e2e/dashboard.spec.ts:55:9",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["performance", "timeout", "slow-response"],
    input: { ...base.input, id: makeUuid(6000 + i) },
    expect: {
      category: "performance",
      status: base.input.status,
      errorQuality: flaky ? "null" : "required",
      confidenceMin: 3,
      confidenceMax: 5,
    },
  };
}
