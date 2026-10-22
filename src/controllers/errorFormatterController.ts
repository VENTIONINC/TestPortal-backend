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
    } catch (error) {
      res.status(500).json({
        error: "Failed to format error message",
        details: error instanceof Error ? error.message : "Unknown error",
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
      const err = error as Error;
      const isValidationError =
        err.message.includes("required") ||
        err.message.includes("failed or flaky") ||
        err.message.includes("no error details");

      res.status(isValidationError ? 400 : 500).json({
        error: err.message || "Failed to generate suggestion",
      });
    }
  },
};
