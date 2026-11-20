// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import getLogger from "@/lib/logger";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  manualTestRunIdParamsSchema,
  manualTestRunDetailsSchema,
  manualTestRunProjectQuerySchema,
  manualTestRunScenarioAssigneeSchema,
  manualTestRunScenarioBulkSchema,
  manualTestRunScenarioOrderSchema,
  manualTestRunScenarioParamsSchema,
  manualTestRunScenarioResultSchema,
  manualTestRunScenarioEvidenceSchema,
} from "@/schemas/manualTestRunSchemas";
import { manualTestRunMutationService } from "@/services/manualTestRunMutationService";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const logger = getLogger("manual-test-run-mutation-controller");

function sendError(res: Response, error: unknown, operation: string): void {
  if (error instanceof ManualTestRunValidationError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof ManualTestRunNotFoundError) {
    res.status(404).json({ error: error.message });
  } else if (error instanceof ManualTestRunConflictError) {
    res.status(409).json({ error: error.message });
  } else {
    const message = `Failed to ${operation}.`;
    logger.error(message, error);
    res.status(500).json({ error: message });
  }
}

function sendInvalid(res: Response, issues: Array<{ message: string }>): void {
  res.status(400).json({ error: issues[0]?.message ?? "Invalid request" });
}

function requireUser(req: AuthenticatedRequest, res: Response): string | null {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return req.user.id;
}

function parseRunAndProject(
  req: AuthenticatedRequest<{ runId: string }>,
  res: Response,
): { runId: string; projectId: string } | null {
  const params = manualTestRunIdParamsSchema.safeParse(req.params);
  const query = manualTestRunProjectQuerySchema.safeParse(req.query);
  if (!params.success) {
    sendInvalid(res, params.error.issues);
    return null;
  }
  if (!query.success) {
    sendInvalid(res, query.error.issues);
    return null;
  }
  return { runId: params.data.runId, projectId: query.data.projectId };
}

function parseScenarioAndProject(
  req: AuthenticatedRequest<{ runId: string; scenarioId: string }>,
  res: Response,
): { runId: string; scenarioId: string; projectId: string } | null {
  const run = manualTestRunIdParamsSchema.safeParse(req.params);
  const scenario = manualTestRunScenarioParamsSchema.safeParse(req.params);
  const query = manualTestRunProjectQuerySchema.safeParse(req.query);
  if (!run.success) {
    sendInvalid(res, run.error.issues);
    return null;
  }
  if (!scenario.success) {
    sendInvalid(res, scenario.error.issues);
    return null;
  }
  if (!query.success) {
    sendInvalid(res, query.error.issues);
    return null;
  }
  return {
    runId: run.data.runId,
    scenarioId: scenario.data.scenarioId,
    projectId: query.data.projectId,
  };
}

export const manualTestRunMutationController = {
  async updateScenarioEvidence(
    req: AuthenticatedRequest<{ runId: string; scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    if (!requireUser(req, res)) return;
    const scope = parseScenarioAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunScenarioEvidenceSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(await manualTestRunMutationService.updateScenarioEvidence({ ...scope, ...body.data }));
    } catch (error) {
      sendError(res, error, "update manual run scenario evidence");
    }
  },

  async updateDetails(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    if (!requireUser(req, res)) return;
    const scope = parseRunAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunDetailsSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(await manualTestRunMutationService.updateDetails({ ...scope, ...body.data }));
    } catch (error) {
      sendError(res, error, "update manual test run details");
    }
  },

  async updateResult(
    req: AuthenticatedRequest<{ runId: string; scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    const userId = requireUser(req, res);
    if (!userId) return;
    const scope = parseScenarioAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunScenarioResultSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(
        await manualTestRunMutationService.updateResult({
          ...scope,
          ...body.data,
          resultById: userId,
        }),
      );
    } catch (error) {
      sendError(res, error, "update a manual run scenario result");
    }
  },

  async updateAssignee(
    req: AuthenticatedRequest<{ runId: string; scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    if (!requireUser(req, res)) return;
    const scope = parseScenarioAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunScenarioAssigneeSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(
        await manualTestRunMutationService.updateAssignee({
          ...scope,
          ...body.data,
        }),
      );
    } catch (error) {
      sendError(res, error, "assign a manual run scenario");
    }
  },

  async reorder(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    if (!requireUser(req, res)) return;
    const scope = parseRunAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunScenarioOrderSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(
        await manualTestRunMutationService.reorder({
          ...scope,
          ...body.data,
        }),
      );
    } catch (error) {
      sendError(res, error, "reorder manual run scenarios");
    }
  },

  async bulkUpdate(
    req: AuthenticatedRequest<{ runId: string }>,
    res: Response,
  ): Promise<void> {
    const userId = requireUser(req, res);
    if (!userId) return;
    const scope = parseRunAndProject(req, res);
    if (!scope) return;
    const body = manualTestRunScenarioBulkSchema.safeParse(req.body ?? {});
    if (!body.success) return sendInvalid(res, body.error.issues);
    try {
      res.status(200).json(
        await manualTestRunMutationService.bulkUpdate({
          ...scope,
          scenarioIds: body.data.scenarioIds,
          ...(body.data.result !== undefined
            ? { result: body.data.result, resultById: userId }
            : {}),
          ...(body.data.assigneeId !== undefined
            ? { assigneeId: body.data.assigneeId }
            : {}),
        }),
      );
    } catch (error) {
      sendError(res, error, "bulk update manual run scenarios");
    }
  },
};
