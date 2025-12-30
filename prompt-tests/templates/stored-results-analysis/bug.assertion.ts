import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

/**
 * Template factory for bug/assertion failure errors
 * Generates test cases for application logic bugs with assertion failures
 * @param i - Index for generating variations
 * @returns Test case with bug category expectations
 */
export function bugAssertion(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "bug: assertion expected/actual mismatch",
    status: "failed", // Bugs are always failed, not flaky
    specKey: pick(i, [
      "e2e/login.spec.ts > User Login > should login with valid credentials",
      "e2e/dashboard.spec.ts > Dashboard > should display user stats",
      "e2e/checkout.spec.ts > Checkout Flow > should complete purchase",
    ]),
    specTitle: pick(i, [
      "should login with valid credentials",
      "should display user stats",
      "should complete purchase",
    ]),
    executionName: pick(i, [
      "Chrome - Production",
      "Chrome - Staging",
      "Firefox - Production",
    ]),
    duration: pick(i, [1200, 2100, 3400, 1850]),
    retry: 0, // Bugs typically don't have retries in test config
    errorMessage: pick(i, [
      "AssertionError: Expected 'Welcome, User!' to equal 'Welcome, Admin!'",
      "AssertionError: expected true to be false",
      "AssertionError: Expected array length of 5, but got 3",
      "AssertionError: Expected status code 200, but got 404",
    ]),
    errorStack: pick(i, [
      "at Test.Login.validCredentials (test/login.spec.ts:25:12)",
      "at Dashboard.checkStats (test/dashboard.spec.ts:48:8)",
      "at Checkout.completePurchase (test/checkout.spec.ts:92:15)",
    ]),
    errorLocation: pick(i, [
      "test/login.spec.ts:25:12",
      "test/dashboard.spec.ts:48:8",
      "test/checkout.spec.ts:92:15",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["bug", "assertion"],
    input: { ...base.input, id: makeUuid(1000 + i) }, // UUID offset: 1000
    expect: {
      category: "bug",
      status: "failed",
      errorQuality: "required", // Always required for bugs
      confidenceMin: 4,
      confidenceMax: 5, // High confidence for assertion failures
    },
  };
}
