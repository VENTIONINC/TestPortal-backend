// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { assumptionService } from "@/services/assumptionService";
import type { CreateAssumptionRequest, UpdateAssumptionRequest } from "@/types";

type AssumptionIdParams = {
  assumptionId: string;
};

export const assumptionController = {
  createAssumption: async (req: Request, res: Response): Promise<void> => {
    try {
      const assumptionData: CreateAssumptionRequest = req.body;

      if (!assumptionData) {
        res.status(400).json({
          error: "Assumption data is required",
        });
        return;
      }

      const assumption =
        await assumptionService.createAssumption(assumptionData);
      res.status(201).json(assumption);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to create assumption. ${err.message}`,
      });
    }
  },

  updateAssumption: async (
    req: Request<AssumptionIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { assumptionId } = req.params;
      const updateData: Partial<UpdateAssumptionRequest> = req.body;

      if (!assumptionId) {
        res.status(400).json({
          error: "Assumption ID is required",
        });
        return;
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        res.status(400).json({
          error: "Update data is required",
        });
        return;
      }

      const result = await assumptionService.updateAssumption(
        assumptionId,
        updateData,
      );

      if (result.action === "deleted") {
        res.status(204).send();
      } else {
        res.status(200).json(result.assumption);
      }
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update assumption. ${err.message}`,
      });
    }
  },

  getAssumptionById: async (
    req: Request<AssumptionIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { assumptionId } = req.params;
      const { projectId } = req.query;

      if (!assumptionId) {
        res.status(400).json({
          error: "Assumption ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      const assumption =
        await assumptionService.getAssumptionById(assumptionId, projectId as string);
      res.status(200).json(assumption);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  deleteAssumption: async (
    req: Request<AssumptionIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { assumptionId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!assumptionId) {
        res.status(400).json({
          error: "Assumption ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      await assumptionService.deleteAssumption(assumptionId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("not found")) {
        res.status(404).json({
          error: err.message,
        });
        return;
      }

      res.status(400).json({
        error: `Failed to delete assumption. ${err.message}`,
      });
    }
  },
};
