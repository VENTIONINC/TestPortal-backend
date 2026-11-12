// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function bugApplicationError(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "bug: application exception",
    status: "failed",
    specKey: pick(i, [
      "api/orders.spec.ts > Orders API > should create an order",
      "e2e/profile.spec.ts > User Profile > should save profile changes",
      "api/invoices.spec.ts > Invoice API > should calculate totals",
    ]),
    specTitle: pick(i, [
      "should create an order",
      "should save profile changes",
      "should calculate totals",
    ]),
    executionName: pick(i, ["API Tests - CI", "Chrome - Staging"]),
    duration: pick(i, [840, 1320, 2250]),
    retry: 0,
    errorMessage: pick(i, [
      "Expected HTTP 201 but received 500: NullPointerException in OrderService.create",
      "TypeError: Cannot read properties of undefined (reading 'email') in ProfileController",
      "Expected invoice total 119.99 but API returned 109.99",
    ]),
    errorStack: pick(i, [
      "at OrderService.create (src/services/order.ts:84:17)",
      "at ProfileController.update (src/controllers/profile.ts:51:9)",
      "at InvoiceService.calculate (src/services/invoice.ts:107:13)",
    ]),
    errorLocation: pick(i, [
      "api/orders.spec.ts:44:8",
      "e2e/profile.spec.ts:72:10",
      "api/invoices.spec.ts:36:6",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["bug", "application"],
    input: { ...base.input, id: makeUuid(4000 + i) },
    expect: {
      category: "bug",
      status: "failed",
      errorQuality: "required",
      confidenceMin: 4,
      confidenceMax: 5,
    },
  };
}
