// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "./zod";

export const FutureExecutionTimestampsWarningSchema = z
  .object({
    code: z.literal("FUTURE_EXECUTION_TIMESTAMPS"),
    count: z.number().int().nonnegative(),
    maxDeviationMinutes: z.number().nonnegative(),
    thresholdMinutes: z.literal(10),
  })
  .openapi("FutureExecutionTimestampsWarning");

export const ReportWarningsSchema = z.array(
  FutureExecutionTimestampsWarningSchema,
);
