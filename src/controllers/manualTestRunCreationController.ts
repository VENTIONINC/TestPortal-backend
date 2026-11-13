// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  manualTestRunCreateSchema,
  manualTestRunProjectQuerySchema,
} from "@/schemas/manualTestRunSchemas";
import { manualTestRunCreationService } from "@/services/manualTestRunCreationService";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

function validationMessage(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Invalid request";
}

export const manualTestRunCreationController = {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: validationMessage(query.error) });
      return;
    }
    const body = manualTestRunCreateSchema.safeParse(req.body ?? {});
    if (!body.success) {
      res.status(400).json({ error: validationMessage(body.error) });
      return;
    }

    try {
      const run = await manualTestRunCreationService.createRun({
        ...body.data,
        projectId: query.data.projectId,
        executedById: req.user.id,
      });
      res.status(201).json(run);
    } catch (error) {
      if (error instanceof ManualTestRunValidationError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof ManualTestRunNotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ManualTestRunConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        res
          .status(500)
          .json({ error: `Failed to create manual test run. ${message}` });
      }
    }
  },
};
