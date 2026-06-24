// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Zod schema for error formatter structured output
 * Used by LangChain to format error messages with AI
 */
export const errorFormatterSchema = z.object({
  name: z.string().describe("Formatted error name that is clear and descriptive"),
  description: z
    .string()
    .describe("Formatted error description that is clear and actionable"),
});

/**
 * Input type for error formatter service
 */
export interface ErrorFormatterInput {
  name: string;
  description: string;
  category: string;
}

/**
 * Output type inferred from Zod schema
 */
export type ErrorFormatterOutput = z.infer<typeof errorFormatterSchema>;
