// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Zod schema for error solution suggestion
 * Used by LangChain to generate actionable steps
 */
export const errorSuggestionSchema = z.object({
  description: z
    .string()
    .describe(
      "Clear issue description including proposed steps to identify the problem",
    ),
});

export type ErrorSuggestionOutput = z.infer<typeof errorSuggestionSchema>;
