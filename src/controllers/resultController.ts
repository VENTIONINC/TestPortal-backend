import { Request, Response } from "express";
import { resultService } from "@/services/resultService";
import type { GetResultsParams, GetResultsStatsParams } from "@/types";

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
        reviewStatus,
        errorMessage,
        issueName,
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
      if (reviewStatus) params.reviewStatus = reviewStatus;
      if (errorMessage) params.errorMessage = errorMessage;
      if (issueName) params.issueName = issueName;
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

  getResultsStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const { dates } = req.query;

      // Parse dates parameter (can be a single date or comma-separated dates)
      let parsedDates: string[] | undefined;
      if (dates) {
        if (typeof dates === "string") {
          parsedDates = dates.split(",").map((d) => d.trim());
        } else if (Array.isArray(dates)) {
          parsedDates = dates.map((d) => String(d).trim());
        }
      }

      const params: GetResultsStatsParams = parsedDates
        ? { dates: parsedDates }
        : {};
      const stats = await resultService.getResultsStats(params);

      res.json(stats);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch results stats. ${err.message}`,
      });
    }
  },
};

