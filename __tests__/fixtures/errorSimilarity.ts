// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Assumption, ResultError } from "@prisma/client";
import type {
  AssumptionWithRelations,
  ResultErrorWithRelations,
} from "@/types/database";

export type ErrorFixture = ResultErrorWithRelations & ResultError;
type AssumptionFixture = AssumptionWithRelations & Assumption;

const date = new Date("2026-09-01T00:00:00Z");
export const makeAssumption = (
  overrides: Partial<AssumptionFixture> = {},
): AssumptionFixture => ({
  id: "assumption-old",
  createdAt: date,
  updatedAt: date,
  isConfirmed: true,
  score: 1,
  madeBy: "user",
  issueId: "issue-old",
  resultErrorId: "error-old",
  issue: {
    id: "issue-old",
    createdAt: date,
    updatedAt: date,
    name: "Checkout unavailable",
    category: "bug",
    projectId: "project-a",
  },
  ...overrides,
});
export const makeError = (
  overrides: Partial<ErrorFixture> = {},
): ErrorFixture => ({
  id: "error-target",
  createdAt: date,
  updatedAt: date,
  type: "TimeoutError",
  message: "Checkout button was not visible",
  callLog: ["waiting for checkout button"],
  callStack: ["at /app/checkout.ts:10:2"],
  location: "/app/checkout.ts",
  resultId: "result-target",
  result: null,
  assumptions: [],
  rawLogs: null,
  sourceSnippet: null,
  generatedTestCase: null,
  testAssertion: null,
  expectedPattern: null,
  receivedString: null,
  ...overrides,
});

export interface SimilarityCase {
  id: string;
  legacyMatch: boolean;
  // null means a mechanics-only fixture without a defensible semantic label.
  expectedMatch: boolean | null;
  makePair: () => { target: ErrorFixture; candidate: ErrorFixture };
}

function pair(
  target: Partial<ErrorFixture> = {},
  candidate: Partial<ErrorFixture> = {},
) {
  return {
    target: makeError(target),
    candidate: makeError({
      id: "error-old",
      assumptions: [makeAssumption()],
      ...candidate,
    }),
  };
}

export const similarityCases: SimilarityCase[] = [
  {
    id: "identical-checkout",
    legacyMatch: true,
    expectedMatch: true,
    makePair: () => pair(),
  },
  {
    id: "missing-both-traces",
    legacyMatch: false,
    expectedMatch: true,
    makePair: () => pair({ callLog: [], callStack: [] }),
  },
  {
    id: "missing-call-log",
    legacyMatch: true,
    expectedMatch: true,
    makePair: () => pair({ callLog: [] }),
  },
  {
    id: "missing-call-stack",
    legacyMatch: true,
    expectedMatch: true,
    makePair: () => pair({ callStack: [] }),
  },
  {
    id: "different-placeholder-messages",
    legacyMatch: false,
    expectedMatch: null,
    makePair: () => pair({ message: "aaaa" }, { message: "zzzz" }),
  },
  {
    id: "length-over-50-percent",
    legacyMatch: false,
    expectedMatch: null,
    makePair: () =>
      pair({ message: "Error 1" }, { message: "Error 123456789012345" }),
  },
  {
    id: "length-exactly-50-percent",
    legacyMatch: true,
    expectedMatch: null,
    makePair: () => pair({ message: "Error 12" }, { message: "Error 123456" }),
  },
  {
    id: "legacy-json-traces",
    legacyMatch: true,
    expectedMatch: true,
    makePair: () => {
      const value = pair();
      for (const error of [value.target, value.candidate]) {
        error.callLog = JSON.stringify(error.callLog);
        error.callStack = JSON.stringify(error.callStack);
      }
      return value;
    },
  },
  {
    id: "http-status-conflict",
    legacyMatch: true,
    expectedMatch: false,
    makePair: () =>
      pair(
        { message: "HTTP 401 Unauthorized" },
        { message: "HTTP 500 Unauthorized" },
      ),
  },
];

// Semantic labels are specified before calling Jev. Each pair has its own
// diagnostic context; unrelated cases do not inherit checkout fixture traces.
function scenario(
  id: string,
  expectedMatch: boolean,
  legacyMatch: boolean,
  targetMessage: string,
  candidateMessage: string,
  targetLog: string[],
  candidateLog: string[],
  stack = ["at /app/testRunner.ts:10:2"],
  candidateStack = stack,
): SimilarityCase {
  return {
    id,
    expectedMatch,
    legacyMatch,
    makePair: () =>
      pair(
        {
          type: "TestError",
          message: targetMessage,
          callLog: targetLog,
          callStack: stack,
        },
        {
          type: "TestError",
          message: candidateMessage,
          callLog: candidateLog,
          callStack: candidateStack,
        },
      ),
  };
}

similarityCases.push(
  scenario(
    "selector-line-number-change",
    true,
    true,
    "Timeout 30000ms: #checkout-submit is not visible",
    "Timeout 45000ms: #checkout-submit is not visible",
    ["waiting for #checkout-submit to become visible"],
    ["waiting for #checkout-submit to become visible"],
    ["at /app/checkout.spec.ts:42:7"],
    ["at /app/checkout.spec.ts:91:3"],
  ),
  scenario(
    "connection-refused-paraphrase",
    true,
    false,
    "connect ECONNREFUSED 127.0.0.1:5432",
    "PostgreSQL refused the connection on localhost port 5432",
    ["database setup: TCP connection rejected; postgres not listening"],
    ["database setup: TCP connection rejected; postgres not listening"],
  ),
  scenario(
    "dns-paraphrase",
    true,
    false,
    "getaddrinfo ENOTFOUND inventory.internal",
    "Cannot resolve host inventory.internal: DNS name does not exist",
    ["GET https://inventory.internal/stock failed during DNS lookup"],
    ["GET https://inventory.internal/stock failed during DNS lookup"],
  ),
  scenario(
    "expired-certificate-paraphrase",
    true,
    false,
    "CERT_HAS_EXPIRED for https://payments.internal",
    "TLS handshake rejected: payments.internal server certificate has expired",
    ["payments healthcheck: certificate expiration date is in the past"],
    ["payments healthcheck: certificate expiration date is in the past"],
  ),
  scenario(
    "jwt-expired-paraphrase",
    true,
    false,
    "JWT expired while loading /profile",
    "GET /profile returned 401 because the access token is past its expiration time",
    ["auth middleware: token expiration check failed"],
    ["auth middleware: token expiration check failed"],
  ),
  scenario(
    "missing-specific-error-traces",
    true,
    false,
    "Unique constraint failed on users.email during signup",
    "Unique constraint failed on users.email during signup",
    [],
    [],
    [],
    [],
  ),
  scenario(
    "dynamic-order-identifiers",
    true,
    true,
    "Order 12345: total remained zero after adding product",
    "Order 98765: total remained zero after adding product",
    ["cart recalculation: expected total 25, received 0"],
    ["cart recalculation: expected total 25, received 0"],
  ),
  scenario(
    "assertion-paraphrase",
    true,
    true,
    "Cart total mismatch: expected 25, received 0",
    "Cart total should be 25 but was 0",
    ["POST /cart/items succeeded; cart total is still 0"],
    ["POST /cart/items succeeded; cart total is still 0"],
  ),
  scenario(
    "wrapper-adds-long-context",
    true,
    false,
    "ECONNRESET reading /inventory",
    "Test fixture initialization failed while preparing the inventory scenario: ECONNRESET reading /inventory; the upstream server closed the socket before returning headers",
    ["inventory fixture: socket reset by peer before headers"],
    ["inventory fixture: socket reset by peer before headers"],
  ),
  scenario(
    "stack-path-refactor",
    true,
    true,
    "Price rounding: expected 10.01, received 10.00",
    "Price rounding: expected 10.01, received 10.00",
    ["rounding 10.005 to two decimals returned 10.00"],
    ["rounding 10.005 to two decimals returned 10.00"],
    ["at /old/pricing/calculate.ts:15:2"],
    ["at /new/billing/roundMoney.ts:98:8"],
  ),
  scenario(
    "assertion-different-expected-values",
    false,
    true,
    "Expected cart item count 1, received 0",
    "Expected cart item count 0, received 1",
    ["assertion failed after cart update"],
    ["assertion failed after cart update"],
  ),
  scenario(
    "http-401-versus-403",
    false,
    true,
    "GET /admin returned HTTP 401",
    "GET /admin returned HTTP 403",
    ["admin request failed"],
    ["admin request failed"],
  ),
  scenario(
    "http-404-versus-500",
    false,
    true,
    "GET /orders returned HTTP 404",
    "GET /orders returned HTTP 500",
    ["orders request failed"],
    ["orders request failed"],
  ),
  scenario(
    "same-timeout-different-selectors",
    false,
    true,
    "Timeout waiting for #login-submit",
    "Timeout waiting for #delete-account",
    ["waiting for element to become visible"],
    ["waiting for element to become visible"],
  ),
  scenario(
    "same-timeout-network-versus-selector",
    false,
    true,
    "Timeout 30000ms exceeded",
    "Timeout 30000ms exceeded",
    ["GET /payments pending: upstream TCP connection timed out"],
    ["GET /payments returned 200; selector #pay-now does not exist"],
  ),
  scenario(
    "same-timeout-auth-versus-slow-response",
    false,
    true,
    "Timeout waiting for dashboard",
    "Timeout waiting for dashboard",
    ["GET /dashboard returned 401: expired token; redirected to login"],
    ["GET /dashboard still pending after 30s; database query blocked"],
  ),
  scenario(
    "dns-versus-connection-refused",
    false,
    false,
    "getaddrinfo ENOTFOUND database.internal",
    "connect ECONNREFUSED database.internal:5432",
    ["database.internal does not resolve"],
    ["DNS resolved; TCP port 5432 refuses connections"],
  ),
  scenario(
    "tls-expired-versus-hostname",
    false,
    true,
    "TLS handshake failed",
    "TLS handshake failed",
    ["CERT_HAS_EXPIRED: server certificate expired yesterday"],
    [
      "ERR_TLS_CERT_ALTNAME_INVALID: certificate is valid but issued for another hostname",
    ],
  ),
  scenario(
    "auth-expiration-versus-signature",
    false,
    true,
    "GET /profile returned 401 Unauthorized",
    "GET /profile returned 401 Unauthorized",
    ["JWT signature valid; token expired"],
    ["JWT not expired; signature verification failed"],
  ),
  scenario(
    "same-exception-different-components",
    false,
    false,
    "Cannot read properties of undefined (reading 'id')",
    "Cannot read properties of undefined (reading 'id')",
    ["checkout: cart.customer is undefined"],
    ["profile: session.user is undefined"],
    ["at /app/cart.ts:10:2"],
    ["at /app/profile.ts:40:2"],
  ),
  scenario(
    "generic-timeout-no-evidence",
    false,
    false,
    "Timeout exceeded",
    "Timeout exceeded",
    [],
    [],
    [],
    [],
  ),
  scenario(
    "generic-error-shared-runner-only",
    false,
    true,
    "Test failed",
    "Test failed",
    [],
    [],
  ),
  scenario("empty-messages-no-evidence", false, false, "", "", [], [], [], []),
  scenario(
    "unrelated-failures-shared-runner",
    false,
    false,
    "Disk quota exceeded while writing report",
    "Login rejected because password is incorrect",
    ["report export: ENOSPC"],
    ["authentication: invalid credentials"],
  ),
  scenario(
    "unique-constraint-different-fields",
    false,
    true,
    "Unique constraint failed on users.email",
    "Unique constraint failed on users.phone",
    ["signup INSERT rejected by unique index"],
    ["signup INSERT rejected by unique index"],
  ),
  scenario(
    "numeric-error-codes-are-semantic",
    false,
    true,
    "Database query failed with SQLSTATE 23505",
    "Database query failed with SQLSTATE 23503",
    ["INSERT failed during persistence"],
    ["INSERT failed during persistence"],
  ),
  scenario(
    "retry-number-only",
    true,
    true,
    "Attempt 1: inventory endpoint returned 503",
    "Attempt 3: inventory endpoint returned 503",
    ["inventory service is unavailable"],
    ["inventory service is unavailable"],
  ),
  scenario(
    "truncated-log-same-specific-failure",
    true,
    true,
    "Payment API rejected currency XYZ",
    "Payment API rejected currency XYZ",
    ["POST /pay: unsupported currency XYZ"],
    [
      "POST /pay: unsupported currency XYZ",
      "request validation failed",
      "test aborted",
    ],
  ),
);
