// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, pick } from "../util";

export function infraNetworkTimeout(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "infra: connect ETIMEDOUT",
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
    analysisCategory: "infra",
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["infra", "network", "timeout"],
    input: base.input,
    expect: {
      minLength: 80,
      minSteps: 2,
    },
  };
}
