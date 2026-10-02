// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function infraDnsTls(i: number): TestCase {
  const flaky = i % 3 === 0;
  const base = makeCaseBase(i, {
    name: "infra: DNS or TLS failure",
    status: flaky ? "flaky" : "failed",
    specKey: pick(i, [
      "api/catalog.spec.ts > Catalog API > should list products",
      "api/payments.spec.ts > Payments API > should authorize a card",
      "e2e/login.spec.ts > Login > should authenticate with SSO",
    ]),
    specTitle: pick(i, [
      "should list products",
      "should authorize a card",
      "should authenticate with SSO",
    ]),
    executionName: pick(i, ["API Tests - CI", "Chrome - Staging"]),
    duration: pick(i, [410, 920, 1800]),
    retry: flaky ? 1 : 0,
    errorMessage: pick(i, [
      "Error: getaddrinfo ENOTFOUND catalog.internal",
      "Error: unable to verify the first certificate",
      "Error: certificate has expired (CERT_HAS_EXPIRED)",
    ]),
    errorStack: pick(i, [
      "at GetAddrInfoReqWrap.onlookupall (node:dns:120:26)",
      "at TLSSocket.onConnectSecure (node:_tls_wrap:1679:34)",
    ]),
    errorLocation: pick(i, [
      "api/catalog.spec.ts:18:7",
      "api/payments.spec.ts:64:9",
      "e2e/login.spec.ts:31:5",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["infra", "dns", "tls"],
    input: { ...base.input, id: makeUuid(5000 + i) },
    expect: {
      category: "infra",
      status: base.input.status,
      errorQuality: flaky ? "null" : "required",
      confidenceMin: 4,
      confidenceMax: 5,
    },
  };
}
