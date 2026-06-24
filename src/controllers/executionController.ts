// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { executionService } from "@/services/executionService";

type ExecutionIdParams = {
  executionId: string;
};

export const executionController = {
  getExecutionById: async (
    req: Request<ExecutionIdParams>,
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

      const execution = await executionService.getExecutionById(executionId, projectId);
      res.status(200).json(execution);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  deleteExecution: async (
    req: Request<ExecutionIdParams>,
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

      await executionService.deleteExecution(executionId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("not found")) {
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
