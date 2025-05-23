import { Request, Response } from "express";
import { specService } from "@/services/specService";

export const specController = {
  getSpecById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { specId } = req.params;

      if (!specId) {
        res.status(400).json({
          error: "Spec ID is required",
        });
        return;
      }

      const spec = await specService.getSpecById(specId);
      res.status(200).json(spec);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
