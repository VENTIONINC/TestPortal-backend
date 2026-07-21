// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { executionService } from "@/services/executionService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  ProjectAccessError,
  projectAccessService,
} from "@/services/projectAccessService";

type ExecutionIdParams = {
  executionId: string;
};

export const executionController = {
  getExecutionById: async (
    req: AuthenticatedRequest<ExecutionIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { executionId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!executionId) {
        res.status(400).json({
          error: "Execution ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      const execution = await executionService.getExecutionById(executionId, projectId);
      res.status(200).json(execution);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 404).json({
        error: err.message,
      });
    }
  },

  deleteExecution: async (
    req: AuthenticatedRequest<ExecutionIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { executionId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!executionId) {
        res.status(400).json({
          error: "Execution ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      await projectAccessService.assertProjectAccess(req.user, projectId);

      await executionService.deleteExecution(executionId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (error instanceof ProjectAccessError) {
        res.status(error.statusCode).json({
          error: err.message,
        });
      } else if (err.message.includes("not found")) {
        res.status(404).json({
          error: err.message,
        });
      } else {
        res.status(500).json({
          error: `Failed to delete execution. ${err.message}`,
        });
      }
    }
  },
};
