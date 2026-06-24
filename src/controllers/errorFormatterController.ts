// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { z } from "zod";
import { errorFormatterService } from "@/services/errorFormatterService";

const ErrorMessageSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
  description: z
    .string()
    .min(1, "Description cannot be empty")
    .max(2000, "Description is too long"),
  category: z
    .string()
    .min(1, "Category cannot be empty")
    .max(50, "Category is too long"),
});

const ErrorSuggestionSchema = z.object({
  resultId: z.string().uuid("Result ID must be a valid UUID"),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
});

export const errorFormatterController = {
  formatError: async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = ErrorMessageSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: "Invalid input",
          details: validation.error.errors,
        });
        return;
      }

      const { name, description, category } = validation.data;
      const formattedError = await errorFormatterService.formatErrorMessage({
        name,
        description,
        category,
      });

      res.status(200).json({
        original: { name, description, category },
        formatted: formattedError,
      });
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
