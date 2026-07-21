// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { resultErrorService } from "@/services/resultErrorService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  ProjectAccessError,
  projectAccessService,
} from "@/services/projectAccessService";

interface AssignIssueRequest {
  assumptionId: string; // UUID
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
  assignIssue: async (
    req: AuthenticatedRequest<ResultErrorIdParams>,
    res: Response,
  ): Promise<void> => {
    try {
      const { resultErrorId } = req.params;
      const { assumptionId }: AssignIssueRequest = req.body;

      if (!resultErrorId) {
        res.status(400).json({
          error: "Result error ID is required",
        });
        return;
      }

      if (!assumptionId) {
        res.status(400).json({
          error: "Assumption ID is required",
        });
        return;
      }

      await projectAccessService.assertResultErrorAccess(req.user, resultErrorId);
      await projectAccessService.assertAssumptionAccess(req.user, assumptionId);

      const updatedRecord = await resultErrorService.assignIssue(
        resultErrorId,
        assumptionId,
      );
      res.status(200).json(updatedRecord);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to assign issue. ${err.message}`,
      });
    }
  },

  reviewError: async (
    req: AuthenticatedRequest<ResultErrorIdParams>,
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

      await projectAccessService.assertResultErrorAccess(req.user, resultErrorId);

      const reviewedRecord = await resultErrorService.reviewError(resultErrorId);
      res.status(200).json(reviewedRecord);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to review result error. ${err.message}`,
      });
    }
  },

  bulkReview: async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      const { errorIds }: BulkReviewRequest = req.body;

      if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
        res.status(400).json({
          error: "Error IDs array is required and must not be empty",
        });
        return;
      }

      await Promise.all(
        errorIds.map((errorId) =>
          projectAccessService.assertResultErrorAccess(req.user, errorId),
        ),
      );

      const bulkResults = await resultErrorService.bulkReview(errorIds);
      res.status(200).json(bulkResults);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to complete bulk review. ${err.message}`,
      });
    }
  },

  analyzeErrors: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { projectId, errorIds } = validateAnalyzeErrorsRequest(
        req.body as AnalyzeErrorsRequest,
      );

      await projectAccessService.assertProjectAccess(req.user, projectId);
      await Promise.all(
        errorIds.map((errorId) =>
          projectAccessService.assertResultErrorAccess(req.user, errorId),
        ),
      );

      const analysisResult = await resultErrorService.analyzeErrors(
        projectId,
        errorIds,
      );

      res.status(200).json(analysisResult);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 400).json({
        error: `Failed to analyze result errors. ${err.message}`,
      });
    }
  },

  getResultErrorById: async (
    req: AuthenticatedRequest<ResultErrorIdParams>,
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

      await projectAccessService.assertProjectAccess(req.user, projectId as string);

      const resultError = await resultErrorService.getResultErrorById(
        resultErrorId,
        projectId as string,
      );
      res.status(200).json(resultError);
    } catch (error) {
      const err = error as Error;
      res.status(error instanceof ProjectAccessError ? error.statusCode : 404).json({
        error: err.message,
      });
    }
  },
};
