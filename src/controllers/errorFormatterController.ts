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
};
