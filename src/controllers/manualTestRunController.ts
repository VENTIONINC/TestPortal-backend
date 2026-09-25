// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  manualTestRunCompleteSchema,
  manualTestRunHistoryQuerySchema,
  manualTestRunIdParamsSchema,
  manualTestRunProjectQuerySchema,
  manualTestRunScenarioHistoryQuerySchema,
  manualTestRunScenarioParamsSchema,
  manualTestRunStartSchema,
  manualTestRunStepParamsSchema,
  manualTestRunStepUpdateSchema,
  manualTestRunUpdateSchema,
} from "@/schemas/manualTestRunSchemas";
import { manualTestRunService } from "@/services/manualTestRunService";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

function validationMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid request";
}

function sendValidationError(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

function sendServiceError(res: Response, error: unknown, operation: string): void {
  if (error instanceof ManualTestRunValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error instanceof ManualTestRunNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ManualTestRunConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(500).json({ error: `Failed to ${operation}. ${message}` });
}

export const manualTestRunController = {
  async start(
    req: AuthenticatedRequest<{ scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const params = manualTestRunScenarioParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    const body = manualTestRunStartSchema.safeParse(req.body ?? {});
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }
    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const run = await manualTestRunService.startRun({
        projectId: query.data.projectId,
        scenarioId: params.data.scenarioId,
        executedById: req.user.id,
        ...(Object.prototype.hasOwnProperty.call(body.data, "notes")
          ? { notes: body.data.notes }
          : {}),
      });
      res.status(201).json(run);
    } catch (error) {
      sendServiceError(res, error, "start manual test run");
    }
  },

  async listByScenario(
    req: Request<{ scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    const params = manualTestRunScenarioParamsSchema.safeParse(req.params);
    const query = manualTestRunScenarioHistoryQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const page = await manualTestRunService.listRuns({
        ...query.data,
        scenarioId: params.data.scenarioId,
      });
      res.status(200).json(page);
    } catch (error) {
      sendServiceError(res, error, "list manual test runs");
    }
  },

  async listByProject(req: Request, res: Response): Promise<void> {
    const query = manualTestRunHistoryQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const page = await manualTestRunService.listRuns(query.data);
      res.status(200).json(page);
    } catch (error) {
      sendServiceError(res, error, "list manual test runs");
    }
  },

  async getById(req: Request<{ runId: string }>, res: Response): Promise<void> {
    const params = manualTestRunIdParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const run = await manualTestRunService.getRun({
        runId: params.data.runId,
        projectId: query.data.projectId,
      });
      res.status(200).json(run);
    } catch (error) {
      sendServiceError(res, error, "fetch manual test run");
    }
  },

  async update(req: Request<{ runId: string }>, res: Response): Promise<void> {
    const params = manualTestRunIdParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    const body = manualTestRunUpdateSchema.safeParse(req.body ?? {});
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }
    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const run = await manualTestRunService.updateRun({
        ...body.data,
        runId: params.data.runId,
        projectId: query.data.projectId,
      });
      res.status(200).json(run);
    } catch (error) {
      sendServiceError(res, error, "update manual test run");
    }
  },

  async updateStep(
    req: Request<{ runId: string; stepId: string }>,
    res: Response,
  ): Promise<void> {
    const params = manualTestRunStepParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    const body = manualTestRunStepUpdateSchema.safeParse(req.body ?? {});
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }
    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const run = await manualTestRunService.updateStep({
        ...body.data,
        projectId: query.data.projectId,
        runId: params.data.runId,
        stepId: params.data.stepId,
      });
      res.status(200).json(run);
    } catch (error) {
      sendServiceError(res, error, "update manual test run step");
    }
  },

  async complete(req: Request<{ runId: string }>, res: Response): Promise<void> {
    const params = manualTestRunIdParamsSchema.safeParse(req.params);
    const query = manualTestRunProjectQuerySchema.safeParse(req.query);
    const body = manualTestRunCompleteSchema.safeParse(req.body ?? {});
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }
    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }
    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const run = await manualTestRunService.completeRun({
        ...body.data,
        projectId: query.data.projectId,
        runId: params.data.runId,
      });
      res.status(200).json(run);
    } catch (error) {
      sendServiceError(res, error, "complete manual test run");
    }
  },
};
