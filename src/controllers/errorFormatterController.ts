// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { z } from "zod";
import { normalizeResultCategory } from "@/lib/resultCategory";
import { errorFormatterRequestSchema } from "@/schemas/errorFormatterSchemas";
import { errorFormatterService } from "@/services/errorFormatterService";

const ErrorSuggestionSchema = z.object({
  resultId: z.string().uuid("Result ID must be a valid UUID"),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
});
const resultValidationErrors = new Set([
  "Result ID is required",
  "Project ID is required",
  "Only failed or flaky results can be analyzed",
  "Result has no error details to analyze",
]);

export const errorFormatterController = {
  formatError: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = errorFormatterRequestSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: "Invalid input",
          details: validation.error.errors,
        });
        return;
      }

      const { name, description, contextCategory, category } = validation.data;
      const effectiveContextCategory =
        contextCategory ?? normalizeResultCategory(category);
      const formattedError = await errorFormatterService.formatErrorMessage({
        name,
        description,
        ...(effectiveContextCategory ? { contextCategory: effectiveContextCategory } : {}),
      });

      res.status(200).json(formattedError);
    } catch {
      res.status(500).json({
        error: "Failed to format error message",
      });
    }
  },

  suggestFromResult: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = ErrorSuggestionSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: "Invalid input",
          details: validation.error.errors,
        });
        return;
      }

      const { resultId, projectId } = validation.data;
      const suggestion = await errorFormatterService.suggestFromResult(
        resultId,
        projectId,
      );

      res.status(200).json(suggestion);
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      const isValidationError =
        err !== undefined && resultValidationErrors.has(err.message);

      res.status(isValidationError ? 400 : 500).json({
        error:
          err && isValidationError
            ? err.message
            : "Failed to generate suggestion",
      });
    }
  },
};
