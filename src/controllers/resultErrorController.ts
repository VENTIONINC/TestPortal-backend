import { Request, Response } from "express";
import { resultErrorService } from "@/services/resultErrorService";

interface AssignIssueRequest {
  assumptionId: number | string;
}

interface BulkReviewRequest {
  errorIds: (number | string)[];
}

export const resultErrorController = {
  assignIssue: async (req: Request, res: Response): Promise<void> => {
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

      const updatedRecord = await resultErrorService.assignIssue(
        resultErrorId,
        assumptionId,
      );
      res.status(200).json(updatedRecord);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({
        error: `Failed to assign issue. ${err.message}`,
      });
    }
  },

  reviewError: async (req: Request, res: Response): Promise<void> => {
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

  getResultErrorById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { resultErrorId } = req.params;

      if (!resultErrorId) {
        res.status(400).json({
          error: "Result error ID is required",
        });
        return;
      }

      const resultError =
        await resultErrorService.getResultErrorById(resultErrorId);
      res.status(200).json(resultError);
    } catch (error) {
      const err = error as Error;
      res.status(404).json({
        error: err.message,
      });
    }
  },
};
