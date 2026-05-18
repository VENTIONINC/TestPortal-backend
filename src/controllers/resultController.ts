import { Request, Response } from "express";
import {
  ResultArtifactNotFoundError,
  resultService,
} from "@/services/resultService";
import type { GetResultsStatsParams } from "@/types";
import { buildResultParams } from "@/lib/params-builder";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

type AnalysisFeedbackData = {
  analysisFeedbackCategory?: string;
  analysisFeedbackConfidence?: number;
  analysisFeedbackConclusion?: string;
};

type AnalysisFeedbackPreparation = {
  status: number;
  error?: string;
  resultId?: string;
  reviewerId?: string;
  data?: AnalysisFeedbackData;
};

const prepareAnalysisFeedback = (
  req: AuthenticatedRequest,
): AnalysisFeedbackPreparation => {
  const { resultId } = req.params;

  if (!resultId) {
    return { status: 400, error: "Result ID is required" };
  }

  if (!req.user?.id) {
    return { status: 401, error: "User is not authenticated" };
  }

  const {
    analysisFeedbackCategory,
    analysisFeedbackConfidence,
    analysisFeedbackConclusion,
  } = req.body as AnalysisFeedbackData;

  const data: AnalysisFeedbackData = {};

  if (analysisFeedbackCategory !== undefined)
    data.analysisFeedbackCategory = analysisFeedbackCategory;
  if (analysisFeedbackConfidence !== undefined)
    data.analysisFeedbackConfidence = analysisFeedbackConfidence;
  if (analysisFeedbackConclusion !== undefined)
    data.analysisFeedbackConclusion = analysisFeedbackConclusion;

  if (Object.keys(data).length === 0) {
    return {
      status: 400,
      error:
        "At least one feedback field must be provided (analysisFeedbackCategory, analysisFeedbackConfidence, analysisFeedbackConclusion)",
    };
  }

  return {
    status: 200,
    resultId,
    reviewerId: req.user.id,
    data,
  };
};

const buildExportFileName = (
  projectId: string,
  dateFrom: string,
  dateTo: string,
): string => {
  const safeToken = (value: string): string =>
    value.replace(/[^a-zA-Z0-9-_]/g, "_");

  return `analysis-export-${safeToken(projectId)}-${safeToken(
    dateFrom,
  )}-${safeToken(dateTo)}.jsonl`;
};

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

      const resultRecord = await resultService.getResultById(
        resultId,
        projectId,
      );
      res.status(200).json(resultRecord);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },

  getSignedArtifactUrl: async (req: Request, res: Response): Promise<void> => {
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

      const artifactUrl = await resultService.getSignedArtifactUrl(
        resultId,
        projectId,
      );

      res.status(200).json(artifactUrl);
    } catch (error) {
      const err = error as Error;

      if (error instanceof ResultArtifactNotFoundError) {
        res.status(404).json({
          error: err.message,
        });
        return;
      }

      if (resultService.isArtifactConfigurationError(error)) {
        res.status(500).json({
          error: err.message,
        });
        return;
      }

      res.status(403).json({
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

  updateAnalysisFeedback: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const prepared = prepareAnalysisFeedback(req);

      if (prepared.error) {
        res.status(prepared.status).json({
          error: prepared.error,
        });
        return;
      }

      const updatedResult = await resultService.updateAnalysisFeedback(
        prepared.resultId as string,
        prepared.data as AnalysisFeedbackData,
        prepared.reviewerId as string,
      );

      res.status(200).json(updatedResult);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to update result analysis feedback. ${err.message}`,
      });
    }
  },

  deleteResult: async (req: Request, res: Response): Promise<void> => {
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

      await resultService.deleteResult(resultId, projectId);
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("not found")) {
        res.status(404).json({
          error: err.message,
        });
      } else {
        res.status(500).json({
          error: `Failed to delete result. ${err.message}`,
        });
      }
    }
  },

  exportAnalysisJsonl: async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, dateFrom, dateTo } =
        req.query as Record<string, string>;

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          error: "dateFrom and dateTo are required",
        });
        return;
      }

      const { content } = await resultService.exportAnalysisJsonl({
        projectId,
        dateFrom,
        dateTo,
      });

      const filename = buildExportFileName(projectId, dateFrom, dateTo);

      res.set("Content-Type", "application/jsonl; charset=utf-8");
      res.set(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );

      res.status(200).send(content);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to export analysis. ${err.message}`,
      });
    }
  },
};
