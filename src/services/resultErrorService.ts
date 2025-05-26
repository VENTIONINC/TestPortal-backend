import { resultErrorModel } from "@/models/resultErrorModel";
import { runReview } from "@/lib/error-analyzer";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";
import type { Prisma } from "@prisma/client";

type ResultErrorWithAssumptions = Prisma.ResultErrorGetPayload<{
  include: {
    assumptions: {
      include: {
        issue: true;
      };
    };
  };
}>;

interface BulkReviewResult {
  successful: (ResultErrorWithRelations | null)[];
  failed: Array<{ id: number; reason: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export const resultErrorService = {
  async assignIssue(
    resultErrorId: number | string,
    assumptionId: number | string,
  ): Promise<ResultErrorWithAssumptions> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    // Validate ID formats
    const numericResultErrorId = Number(resultErrorId);
    const numericAssumptionId = Number(assumptionId);

    if (isNaN(numericResultErrorId) || numericResultErrorId <= 0) {
      throw new Error("Result error ID must be a valid positive number");
    }

    if (isNaN(numericAssumptionId) || numericAssumptionId <= 0) {
      throw new Error("Assumption ID must be a valid positive number");
    }

    // Business logic - assign the issue
    try {
      const updatedRecord = await resultErrorModel.assignIssue(
        resultErrorId,
        assumptionId,
      );
      return updatedRecord;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to assign issue to result error: ${err.message}`);
    }
  },

  async reviewError(
    resultErrorId: number | string,
  ): Promise<ResultErrorWithRelations | null> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    // Validate ID format
    const numericId = Number(resultErrorId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error("Result error ID must be a valid positive number");
    }

    // Business logic - get the error and run review
    try {
      const resultError = await resultErrorModel.findById(resultErrorId);

      if (!resultError) {
        throw new Error(`Result error with ID ${resultErrorId} not found`);
      }

      // Adapt PrismaResultError to TargetResultError format expected by runReview
      const targetResultError = {
        ...resultError,
        callLog: resultError.callLog ?? "[]",
      };

      const reviewedRecord = await runReview(targetResultError);
      return reviewedRecord as ResultErrorWithRelations | null;
    } catch (error) {
      const err = error as Error;
      throw new Error(
        `Failed to review result error ${resultErrorId}: ${err.message}`,
      );
    }
  },

  async bulkReview(errorIds: (number | string)[]): Promise<BulkReviewResult> {
    // Input validation
    if (!errorIds || !Array.isArray(errorIds)) {
      throw new Error("Error IDs array is required");
    }

    if (errorIds.length === 0) {
      throw new Error("At least one error ID must be provided");
    }

    // Validate all IDs
    const validatedIds = errorIds.map((id) => {
      const numericId = Number(id);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error(
          `Invalid error ID: ${id}. All IDs must be valid positive numbers`,
        );
      }
      return numericId;
    });

    // Business logic - process bulk review
    const reviewResults: (ResultErrorWithRelations | null)[] = [];
    const failedIds: Array<{ id: number; reason: string }> = [];

    try {
      for (const errorId of validatedIds) {
        try {
          const resultError = await resultErrorModel.findById(errorId);

          if (!resultError) {
            failedIds.push({ id: errorId, reason: "Result error not found" });
            continue;
          }

          // Adapt PrismaResultError to TargetResultError format expected by runReview
          const targetResultError = {
            ...resultError,
            callLog: resultError.callLog ?? "[]",
          };

          const reviewedRecord = await runReview(targetResultError);
          reviewResults.push(reviewedRecord as ResultErrorWithRelations | null);
        } catch (error) {
          const err = error as Error;
          failedIds.push({ id: errorId, reason: err.message });
        }
      }

      return {
        successful: reviewResults,
        failed: failedIds,
        totalProcessed: validatedIds.length,
        successCount: reviewResults.length,
        failureCount: failedIds.length,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Bulk review failed: ${err.message}`);
    }
  },

  async getResultErrorById(
    resultErrorId: number | string,
  ): Promise<PrismaResultError> {
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    // Validate ID format
    const numericId = Number(resultErrorId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error("Result error ID must be a valid positive number");
    }

    const resultError = await resultErrorModel.findById(resultErrorId);

    if (!resultError) {
      throw new Error(`Result error with ID ${resultErrorId} not found`);
    }

    return resultError;
  },
};
