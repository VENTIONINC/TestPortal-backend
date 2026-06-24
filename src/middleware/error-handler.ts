// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import getLogger from "@/lib/logger";

const logger = getLogger("server");

interface CustomError extends Error {
  status?: number;
}

export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error(err.message);

  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = err.status ?? 500;

  res.status(statusCode).send({
    success: false,
    error: {
      message: err.message ?? "Internal Server Error",
      status: statusCode,
    },
  });
};
