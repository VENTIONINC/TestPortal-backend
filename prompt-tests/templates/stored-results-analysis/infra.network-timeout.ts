import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

/**
 * Template factory for infrastructure network timeout errors
 * Generates test cases for ETIMEDOUT connection errors
 * @param i - Index for generating variations
 * @returns Test case with infra category expectations
 */
export function infraNetworkTimeout(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "infra: connect ETIMEDOUT",
    status: i % 3 === 0 ? "flaky" : "failed",
    specKey: pick(i, [
      "api/health.spec.ts > API Health > should return 200",
      "api/users.spec.ts > Users API > should list users",
      "api/auth.spec.ts > Authentication > should login successfully",
    ]),
    specTitle: pick(i, [
      "should return 200",
      "should list users",
      "should login successfully",
    ]),
    executionName: pick(i, [
      "API Tests - Staging",
      "API Tests - Production",
      "API Tests - CI",
    ]),
    duration: pick(i, [30000, 45000, 60000]),
    retry: i % 3 === 0 ? 1 : 2,
    errorMessage: pick(i, [
      "Error: connect ETIMEDOUT 10.0.0.1:443",
      "Error: connect ETIMEDOUT api.internal:443",
      "Error: connect ETIMEDOUT 192.168.1.100:8080",
    ]),
    errorStack: "at TCPConnectWrap.afterConnect (node:net:1148:16)",
    errorLocation: pick(i, [
      "api/health.spec.ts:15:8",
      "api/users.spec.ts:42:10",
      "api/auth.spec.ts:28:12",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["infra", "network", "timeout"],
    input: { ...base.input, id: makeUuid(i) },
    expect: {
      category: "infra",
      status: base.input.status,
      errorQuality: base.input.status === "failed" ? "required" : "null",
      confidenceMin: 3,
      confidenceMax: 5,
    },
  };
}
