import type { NextFunction, Request, Response } from "express";
import { pdfExportSchema } from "@/schemas/reportExportSchemas";

export const validatePdfExport = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = pdfExportSchema.safeParse(req.body);

  if (!result.success) {
    const hasPeriodTooLarge = result.error.issues.some(
      (issue) => issue.message === "PERIOD_TOO_LARGE",
    );

    if (hasPeriodTooLarge) {
      res.status(400).json({
        error: "PERIOD_TOO_LARGE",
        message: "Export period cannot exceed 365 days",
      });
      return;
    }

    res.status(400).json({
      error: "INVALID_PARAMS",
      details: result.error.issues,
    });
    return;
  }

  res.locals.exportParams = result.data;
  next();
};
