// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Zod schema for error solution suggestion
 * Used by LangChain to generate actionable steps
 */
export const errorSuggestionSchema = z.object({
  category: z
    .enum(["bug", "infra", "performance", "script", "other"])
    .describe("Issue category inferred from the failure analysis"),
  name: z.string().describe("Concise issue title describing the failure"),
  description: z
    .string()
    .describe(
      "Clear issue description including proposed steps to identify the problem",
    ),
});

export type ErrorSuggestionOutput = z.infer<typeof errorSuggestionSchema>;
