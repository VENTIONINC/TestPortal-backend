// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { specService } from "@/services/specService";

type SpecIdParams = {
  specId: string;
};

export const specController = {
  getSpecById: async (
    req: Request<SpecIdParams>,
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

      const spec = await specService.getSpecById(specId, projectId);
      res.status(200).json(spec);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  deleteSpec: async (
    req: Request<SpecIdParams>,
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

      await specService.deleteSpec(specId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("not found")) {
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
