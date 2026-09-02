// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { ResultCategory } from "@/types/resultCategory";

export const contextCategorySchema = z.enum([
  "bug",
  "infra",
  "performance",
  "script",
  "other",
]);

export const errorFormatterRequestSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
  description: z
    .string()
    .min(1, "Description cannot be empty")
    .max(2000, "Description is too long"),
  contextCategory: contextCategorySchema.optional(),
  category: z.string().max(50, "Category is too long").optional(),
});

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
  contextCategory?: ResultCategory;
}

/**
 * Output type inferred from Zod schema
 */
export type ErrorFormatterOutput = z.infer<typeof errorFormatterSchema>;
