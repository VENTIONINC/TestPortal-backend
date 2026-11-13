// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  manualTestRunCompleteSchema,
  manualTestRunIdParamsSchema,
  manualTestRunProjectQuerySchema,
  manualTestRunReopenSchema,
} from "@/schemas/manualTestRunSchemas";
import { manualTestRunLifecycleService } from "@/services/manualTestRunLifecycleService";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

function invalid(res: Response, message?: string): void {
  res.status(400).json({ error: message ?? "Invalid request" });
}

function scope(
  req: AuthenticatedRequest<{ runId: string }>,
  res: Response,
): { runId: string; projectId: string; userId: string } | null {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const params = manualTestRunIdParamsSchema.safeParse(req.params);
  const query = manualTestRunProjectQuerySchema.safeParse(req.query);
  if (!params.success) {
    invalid(res, params.error.issues[0]?.message);
    return null;
  }
  if (!query.success) {
    invalid(res, query.error.issues[0]?.message);
    return null;
  }
  return {
    runId: params.data.runId,
    projectId: query.data.projectId,
    userId: req.user.id,
  };
}

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

export const manualTestRunLifecycleController = {
  async delete(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    const parsed = scope(req, res);
    if (!parsed) return;
    try {
      await manualTestRunLifecycleService.deleteRun(parsed);
      res.status(204).send();
    } catch (error) {
      sendError(res, error, "delete manual test run");
    }
  },

  async complete(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    const parsed = scope(req, res);
    if (!parsed) return;
    const body = manualTestRunCompleteSchema.safeParse(req.body ?? {});
    if (!body.success) return invalid(res, body.error.issues[0]?.message);
    try {
      res.status(200).json(
        await manualTestRunLifecycleService.completeRun({
          projectId: parsed.projectId,
          runId: parsed.runId,
          completedById: parsed.userId,
        }),
      );
    } catch (error) {
      sendError(res, error, "complete manual test run");
    }
  },

  async reopen(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    const parsed = scope(req, res);
    if (!parsed) return;
    const body = manualTestRunReopenSchema.safeParse(req.body ?? {});
    if (!body.success) return invalid(res, body.error.issues[0]?.message);
    try {
      res.status(200).json(
        await manualTestRunLifecycleService.reopenRun({
          projectId: parsed.projectId,
          runId: parsed.runId,
          reopenedById: parsed.userId,
        }),
      );
    } catch (error) {
      sendError(res, error, "reopen manual test run");
    }
  },
};
