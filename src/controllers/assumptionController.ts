import { Request, Response } from "express";
import { assumptionService } from "@/services/assumptionService";
import type { CreateAssumptionRequest, UpdateAssumptionRequest } from "@/types";

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

  updateAssumption: async (req: Request, res: Response): Promise<void> => {
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

  getAssumptionById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { assumptionId } = req.params;

      if (!assumptionId) {
        res.status(400).json({
          error: "Assumption ID is required",
        });
        return;
      }

      const assumption =
        await assumptionService.getAssumptionById(assumptionId);
      res.status(200).json(assumption);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
