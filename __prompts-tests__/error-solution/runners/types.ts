// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ErrorSuggestionOutput } from "@/schemas/errorSuggestionSchemas";

export interface EvalFailure {
  testCaseName: string;
  reason: string;
}

export interface EvalResult {
  responses: Array<{ testCaseName: string; output: ErrorSuggestionOutput }>;
  failures: EvalFailure[];
}
