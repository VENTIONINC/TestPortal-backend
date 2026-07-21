// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { specService } from "@/services/specService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  ProjectAccessError,
  projectAccessService,
} from "@/services/projectAccessService";

type SpecIdParams = {
  specId: string;
};

export const specController = {
  getSpecById: async (
    req: AuthenticatedRequest<SpecIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { specId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!specId) {
        res.status(400).json({
          error: "Spec ID is required",
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

      const spec = await specService.getSpecById(specId, projectId);
      res.status(200).json(spec);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 404).json({
        error: err.message,
      });
    }
  },

  deleteSpec: async (
    req: AuthenticatedRequest<SpecIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { specId } = req.params;
      const { projectId } = req.query as Record<string, string>;

      if (!specId) {
        res.status(400).json({
          error: "Spec ID is required",
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

      await specService.deleteSpec(specId, projectId);
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
          error: `Failed to delete spec. ${err.message}`,
        });
      }
    }
  },
};
