// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

dotenv.config();

export function hasTypeSafeCredentials(apiKey = process.env.TYPESAFE_API_KEY): boolean {
  return Boolean(apiKey?.trim());
}

/** Register live TypeSafe suites as skipped before their callbacks read datasets. */
export const describeWithTypeSafeCredentials = hasTypeSafeCredentials()
  ? describe
  : describe.skip;
