// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid } from "../util";

/**
 * Template factory for generic/ambiguous errors
 * Generates test cases with minimal error information and no clear category
 * @param i - Index for generating variations
 * @returns Test case with other category expectations
 */
export function otherGeneric(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "other: generic error no stack",
    status: "failed",
    specKey: "e2e/smoke.spec.ts > Smoke Tests > should load application",
    specTitle: "should load application",
    executionName: "Chrome - Production",
    duration: 8000,
    retry: 0,
    errorMessage: "Error: Test failed",
    errorStack: null, // No stack trace available
    errorLocation: null, // No location information
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["other", "ambiguous", "generic"],
    input: { ...base.input, id: makeUuid(3000 + i) }, // UUID offset: 3000
    expect: {
      category: "other",
      status: "failed",
      errorQuality: "required",
      confidenceMin: 1,
      confidenceMax: 2, // Low confidence due to lack of information
    },
  };
}
