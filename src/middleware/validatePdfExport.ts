// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  pdfExportSchema,
  PDF_EXPORT_VALIDATION_ERROR_CODE,
} from "@/schemas/reportExportSchemas";

function hasErrorCode(issue: z.ZodIssue, errorCode: string): boolean {
  if (issue.code !== z.ZodIssueCode.custom) {
    return false;
  }

  const customIssue = issue as z.ZodCustomIssue;
  return customIssue.params?.errorCode === errorCode;
}

export const validatePdfExport = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const result = pdfExportSchema.safeParse(req.body);

  if (!result.success) {
    const hasPeriodTooLarge = result.error.issues.some((issue) =>
      hasErrorCode(issue, PDF_EXPORT_VALIDATION_ERROR_CODE.PERIOD_TOO_LARGE),
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
