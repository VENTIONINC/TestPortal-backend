// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function otherInsufficientContext(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "other: unknown failure without diagnostic evidence",
    status: "failed",
    specKey: pick(i, [
      "e2e/navigation.spec.ts > Navigation > should open details",
      "api/jobs.spec.ts > Jobs API > should finish background task",
      "e2e/preferences.spec.ts > Preferences > should retain settings",
    ]),
    specTitle: pick(i, [
      "should open details",
      "should finish background task",
      "should retain settings",
    ]),
    executionName: pick(i, ["Chrome - Production", "API Tests - Staging"]),
    duration: pick(i, [900, 4200, 7600]),
    retry: 0,
    errorMessage: pick(i, [
      "Error: Operation unsuccessful (code UNKNOWN)",
      "Error: Background task ended unexpectedly",
      "Error: Unexpected test failure with no additional diagnostics",
    ]),
    errorStack: null,
    errorLocation: null,
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["other", "unknown", "insufficient-context"],
    input: { ...base.input, id: makeUuid(9000 + i) },
    expect: {
      category: "other",
      status: "failed",
      errorQuality: "required",
      confidenceMin: 1,
      confidenceMax: 2,
    },
  };
}
