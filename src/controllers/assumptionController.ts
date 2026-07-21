// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { assumptionService } from "@/services/assumptionService";
import type { CreateAssumptionRequest, UpdateAssumptionRequest } from "@/types";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  ProjectAccessError,
  projectAccessService,
} from "@/services/projectAccessService";

type AssumptionIdParams = {
  assumptionId: string;
};

export const assumptionController = {
  createAssumption: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const assumptionData: CreateAssumptionRequest = req.body;

      if (!assumptionData) {
        res.status(400).json({
          error: "Assumption data is required",
        });
        return;
      }

      await projectAccessService.assertIssueAccess(req.user, assumptionData.issueId);
      if (assumptionData.resultErrorId) {
        await projectAccessService.assertResultErrorAccess(
          req.user,
          assumptionData.resultErrorId,
        );
      }

      const assumption =
        await assumptionService.createAssumption(assumptionData);
      res.status(201).json(assumption);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to create assumption. ${err.message}`,
      });
    }
  },

  updateAssumption: async (
    req: AuthenticatedRequest<AssumptionIdParams>,
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

      await projectAccessService.assertAssumptionAccess(req.user, assumptionId);

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
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to update assumption. ${err.message}`,
      });
    }
  },

  getAssumptionById: async (
    req: AuthenticatedRequest<AssumptionIdParams>,
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

      await projectAccessService.assertProjectAccess(
        req.user,
        projectId as string,
      );

      const assumption =
        await assumptionService.getAssumptionById(assumptionId, projectId as string);
      res.status(200).json(assumption);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 404).json({
        error: err.message,
      });
    }
  },

  deleteAssumption: async (
    req: AuthenticatedRequest<AssumptionIdParams>,
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

      await projectAccessService.assertProjectAccess(req.user, projectId);

      await assumptionService.deleteAssumption(assumptionId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;

      if (error instanceof ProjectAccessError) {
        res.status(error.statusCode).json({
          error: err.message,
        });
        return;
      }

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
