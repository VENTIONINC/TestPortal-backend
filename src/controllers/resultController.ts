import { Request, Response } from "express";
import { resultService } from "@/services/resultService";
import type { GetResultsParams } from "@/types";

export const resultController = {
  getResults: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        tag,
        specId,
        specFile,
        specName,
        environment,
        type,
        status,
        from,
        to,
        page = "1",
        limit = "1000",
      } = req.query as Record<string, string>;

      // Convert and validate parameters, filtering out undefined values
      const params: GetResultsParams = {};
      if (tag) params.tag = tag;
      if (specId) params.specId = specId;
      if (specFile) params.specFile = specFile;
      if (specName) params.specName = specName;
      if (environment) params.environment = environment;
      if (type) params.type = type;
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;
      if (page) params.page = Number(page);
      if (limit) params.limit = Number(limit);

      const result = await resultService.getResults(params);

      res.json(result);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch results. ${err.message}`,
      });
    }
  },

  getResultById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { resultId } = req.params;

      if (!resultId) {
        res.status(400).json({
          error: "Result ID is required",
        });
        return;
      }

      const resultRecord = await resultService.getResultById(resultId);
      res.status(200).json(resultRecord);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
