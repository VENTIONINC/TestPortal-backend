// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function scriptFixtureSetup(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "script: invalid fixture or test setup",
    status: "failed",
    specKey: pick(i, [
      "e2e/admin.spec.ts > Admin > should create a user",
      "api/orders.spec.ts > Orders API > should cancel an order",
      "e2e/upload.spec.ts > Upload > should attach a document",
    ]),
    specTitle: pick(i, [
      "should create a user",
      "should cancel an order",
      "should attach a document",
    ]),
    executionName: pick(i, ["Chrome - CI", "API Tests - CI"]),
    duration: pick(i, [120, 350, 740]),
    retry: 0,
    errorMessage: pick(i, [
      "Error: Unknown fixture 'adminSession' referenced by the test",
      "Error: beforeEach setup did not create required orderId test data",
      "Error: ENOENT fixture file './fixtures/invoice.pdf' not found",
    ]),
    errorStack: pick(i, [
      "at FixturePool.resolve (node_modules/@playwright/test/fixtures.js:88:13)",
      "at setupOrder (tests/helpers/order-fixture.ts:24:9)",
      "at attachFixture (tests/helpers/upload.ts:17:11)",
    ]),
    errorLocation: pick(i, [
      "e2e/admin.spec.ts:12:3",
      "api/orders.spec.ts:28:5",
      "e2e/upload.spec.ts:19:7",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["script", "fixture", "setup"],
    input: { ...base.input, id: makeUuid(8000 + i) },
    expect: {
      category: "script",
      status: "failed",
      errorQuality: "required",
      confidenceMin: 4,
      confidenceMax: 5,
    },
  };
}
