// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  resultErrorService,
  type ResultErrorIssueCreateRequest,
  type ResultErrorIssueUpdateRequest,
} from "@/services/resultErrorService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

interface AssignIssueRequest {
  issueId: string; // UUID
}

interface BulkReviewRequest {
  errorIds: string[];
}

interface AnalyzeErrorsRequest {
  projectId: string;
  errorIds: string[];
}

type ResultErrorIdParams = {
  resultErrorId: string;
};

const validateAnalyzeErrorsRequest = (
  payload: AnalyzeErrorsRequest,
): { projectId: string; errorIds: string[] } => {
  const { projectId, errorIds } = payload;

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
    throw new Error("Error IDs array is required and must not be empty");
  }

  return { projectId, errorIds };
};

export const resultErrorController = {
  createIssue: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    const reviewerId = (req as AuthenticatedRequest<ResultErrorIdParams>).user
      ?.id;
    if (!reviewerId) {
      res.status(401).json({ error: "User is not authenticated" });
      return;
    }

    try {
      const workflow = await resultErrorService.createIssue(
        req.params.resultErrorId,
        req.body as ResultErrorIssueCreateRequest,
        reviewerId,
      );
      res.status(201).json(workflow);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      res.status(message.includes("not found") ? 404 : 400).json({
        error: message || "Failed to create and assign issue",
      });
    }
  },

  updateIssue: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    const reviewerId = (req as AuthenticatedRequest<ResultErrorIdParams>).user
      ?.id;
    if (!reviewerId) {
      res.status(401).json({ error: "User is not authenticated" });
      return;
    }

    try {
      const workflow = await resultErrorService.updateIssue(
        req.params.resultErrorId,
        req.body as ResultErrorIssueUpdateRequest,
        reviewerId,
      );
      res.status(200).json(workflow);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      res.status(message.includes("not found") ? 404 : 400).json({
        error: message || "Failed to update confirmed issue",
      });
    }
  },

  getModalContext: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    const { resultErrorId } = req.params;
    const { projectId } = req.query;

    if (!resultErrorId) {
      res.status(400).json({ error: "Result error ID is required" });
      return;
    }
    if (typeof projectId !== "string" || !projectId) {
      res.status(400).json({ error: "Project ID is required" });
      return;
    }

    try {
      const context = await resultErrorService.getModalContext(
        resultErrorId,
        projectId,
      );
      res.status(200).json(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: "Failed to retrieve modal context" });
    }
  },

  assignIssue: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { resultErrorId } = req.params;
      const { issueId }: AssignIssueRequest = req.body;

      if (!resultErrorId) {
        res.status(400).json({
          error: "Result error ID is required",
        });
        return;
      }

      if (!issueId) {
        res.status(400).json({
          error: "Issue ID is required",
        });
        return;
      }

      const updatedRecord = await resultErrorService.assignExistingIssue(
        resultErrorId,
        issueId,
      );
      res.status(200).json(updatedRecord);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to assign issue. ${err.message}`,
      });
    }
  },

  reviewError: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { resultErrorId } = req.params;

      if (!resultErrorId) {
        res.status(400).json({
          error: "Result error ID is required",
        });
        return;
      }

      const reviewedRecord =
        await resultErrorService.reviewError(resultErrorId);
      res.status(200).json(reviewedRecord);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to review result error. ${err.message}`,
      });
    }
  },

  bulkReview: async (req: Request, res: Response): Promise<void> => {
    try {
      const { errorIds }: BulkReviewRequest = req.body;

      if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
        res.status(400).json({
          error: "Error IDs array is required and must not be empty",
        });
        return;
      }

      const bulkResults = await resultErrorService.bulkReview(errorIds);
      res.status(200).json(bulkResults);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to complete bulk review. ${err.message}`,
      });
    }
  },

  analyzeErrors: async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, errorIds } = validateAnalyzeErrorsRequest(
        req.body as AnalyzeErrorsRequest,
      );

      const analysisResult = await resultErrorService.analyzeErrors(
        projectId,
        errorIds,
      );

      res.status(200).json(analysisResult);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to analyze result errors. ${err.message}`,
      });
    }
  },

  getResultErrorById: async (
    req: Request<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { resultErrorId } = req.params;
      const { projectId } = req.query;

      if (!resultErrorId) {
        res.status(400).json({
          error: "Result error ID is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          error: "Project ID is required",
        });
        return;
      }

      const resultError = await resultErrorService.getResultErrorById(
        resultErrorId,
        projectId as string,
      );
      res.status(200).json(resultError);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
