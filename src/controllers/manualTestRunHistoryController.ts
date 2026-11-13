// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import {
  manualTestRunHistoryQuerySchema,
  manualTestRunIdParamsSchema,
  manualTestRunProjectQuerySchema,
} from "@/schemas/manualTestRunSchemas";
import { manualTestRunHistoryService } from "@/services/manualTestRunHistoryService";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

function sendError(res: Response, error: unknown, operation: string): void {
  if (error instanceof ManualTestRunValidationError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof ManualTestRunNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof ManualTestRunConflictError) {
    res.status(409).json({ error: error.message });
  } else {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: `Failed to ${operation}. ${message}` });
  }
}

export const manualTestRunHistoryController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = manualTestRunHistoryQuerySchema.safeParse(req.query);
    if (!query.success) {
      res
        .status(400)
        .json({ error: query.error.issues[0]?.message ?? "Invalid request" });
      return;
    }
    try {
      res
        .status(200)
        .json(await manualTestRunHistoryService.listRuns(query.data));
    } catch (error) {
      sendError(res, error, "list manual test runs");
    }
  },

  async getById(req: Request<{ runId: string }>, res: Response): Promise<void> {
    const params = manualTestRunIdParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    if (!params.success) {
      res
        .status(400)
        .json({ error: params.error.issues[0]?.message ?? "Invalid run ID" });
      return;
    }
    if (!query.success) {
      res.status(400).json({
        error: query.error.issues[0]?.message ?? "Invalid project ID",
      });
      return;
    }
    try {
      res.status(200).json(
        await manualTestRunHistoryService.getRun({
          projectId: query.data.projectId,
          runId: params.data.runId,
        }),
      );
    } catch (error) {
      sendError(res, error, "get manual test run");
    }
  },
};
