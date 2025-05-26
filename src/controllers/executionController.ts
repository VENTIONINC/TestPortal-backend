import { Request, Response } from "express";
import { executionService } from "@/services/executionService";

export const executionController = {
  getExecutionById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { executionId } = req.params;

      if (!executionId) {
        res.status(400).json({
          error: "Execution ID is required",
        });
        return;
      }

      const execution = await executionService.getExecutionById(executionId);
      res.status(200).json(execution);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
