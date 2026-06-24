// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, pick } from "../util";

export function bugAssertion(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "bug: assertion expected/actual mismatch",
    errorMessage: pick(i, [
      "AssertionError: expected status 200 but got 500",
      "AssertionError: expected true to be false",
      "AssertionError: expected array length 5 but got 3",
    ]),
    errorStack: pick(i, [
      "at api/users.spec.ts:42:10",
      "at e2e/login.spec.ts:25:12",
      "at e2e/dashboard.spec.ts:48:8",
    ]),
    errorLocation: pick(i, [
      "api/users.spec.ts:42:10",
      "e2e/login.spec.ts:25:12",
      "e2e/dashboard.spec.ts:48:8",
    ]),
    analysisCategory: "bug",
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["bug", "assertion"],
    input: base.input,
    expect: {
      minLength: 90,
      minSteps: 2,
    },
  };
}
