import { Request, Response } from "express";
import { specService } from "@/services/specService";

export const specController = {
  getSpecById: async (req: Request, res: Response): Promise<void> => {
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
};
