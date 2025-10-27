import { Request, Response } from "express";
import { resultService } from "@/services/resultService";
import type { GetResultsStatsParams } from "@/types";
import { buildResultParams } from "@/lib/params-builder";

export const resultController = {
  getResults: async (req: Request, res: Response): Promise<void> => {
    try {
      const params = buildResultParams(req.query as Record<string, string>);

      // Validate required projectId parameter
      if (!params.projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

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
      const { projectId } = req.query as Record<string, string>;

      if (!resultId) {
        res.status(400).json({
          error: "Result ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      const resultRecord = await resultService.getResultById(resultId, projectId);
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
      const { projectId, dates } = req.query;

      // Validate required projectId parameter
      if (!projectId || typeof projectId !== "string") {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      // Parse dates parameter (can be a single date or comma-separated dates)
      let parsedDates: string[] | undefined;
      if (dates) {
        if (typeof dates === "string") {
          parsedDates = dates.split(",").map((d) => d.trim());
        } else if (Array.isArray(dates)) {
          parsedDates = dates.map((d) => String(d).trim());
        }
      }

      const params: GetResultsStatsParams = {
        projectId,
        ...(parsedDates && { dates: parsedDates }),
      };
      const stats = await resultService.getResultsStats(params);

      res.json(stats);
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        error: `Failed to fetch results stats. ${err.message}`,
      });
    }
  },

  updateAnalysis: async (req: Request, res: Response): Promise<void> => {
    try {
      const { resultId } = req.params;
      const {
        analysisStatus,
        analysisCategory,
        analysisConfidence,
        analysisConclusion,
      } = req.body;

      if (!resultId) {
        res.status(400).json({
          error: "Result ID is required",
        });
        return;
      }

      // Build update object with only provided fields
      const analysisData: {
        analysisStatus?: string;
        analysisCategory?: string;
        analysisConfidence?: number;
        analysisConclusion?: string;
      } = {};

      if (analysisStatus !== undefined)
        analysisData.analysisStatus = analysisStatus;
      if (analysisCategory !== undefined)
        analysisData.analysisCategory = analysisCategory;
      if (analysisConfidence !== undefined)
        analysisData.analysisConfidence = analysisConfidence;
      if (analysisConclusion !== undefined)
        analysisData.analysisConclusion = analysisConclusion;

      // Check if at least one field is provided
      if (Object.keys(analysisData).length === 0) {
        res.status(400).json({
          error:
            "At least one analysis field must be provided (analysisStatus, analysisCategory, analysisConfidence, analysisConclusion)",
        });
        return;
      }

      const updatedResult = await resultService.updateAnalysis(
        resultId,
        analysisData,
      );

      res.status(200).json(updatedResult);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update result analysis. ${err.message}`,
      });
    }
  },
};
