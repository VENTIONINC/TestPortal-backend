import { resultErrorModel } from "@/models/resultErrorModel";
import { runReview } from "@/lib/error-analyzer";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

interface BulkReviewResult {
  successful: (ResultErrorWithRelations | null)[];
  failed: Array<{ id: string; reason: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export const resultErrorService = {
  async assignIssue(
    resultErrorId: string,
    assumptionId: string,
  ): Promise<ResultErrorWithAssumptions> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    if (!assumptionId) {
      throw new Error("Assumption ID is required");
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
    resultErrorId: string,
  ): Promise<ResultErrorWithRelations | null> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    // Business logic - get the error and run review
    try {
      const resultError = await resultErrorModel.findByIdInternal(resultErrorId);

      if (!resultError) {
        throw new Error(`Result error with ID ${resultErrorId} not found`);
      }

      // Adapt PrismaResultError to TargetResultError format expected by runReview
      const targetResultError = {
        ...resultError,
        callLog: resultError.callLog ?? "[]",
      };

      const reviewedRecord = await runReview(targetResultError);
      return reviewedRecord;
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

    // Convert all IDs to strings (UUID format)
    const validatedIds = errorIds.map((id) => String(id));

    // Business logic - process bulk review
    const reviewResults: (ResultErrorWithRelations | null)[] = [];
    const failedIds: Array<{ id: string; reason: string }> = [];

    try {
      for (const errorId of validatedIds) {
        try {
          const resultError = await resultErrorModel.findByIdInternal(errorId);

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
          reviewResults.push(reviewedRecord);
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
    resultErrorId: string,
    projectId: string,
  ): Promise<PrismaResultError> {
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const resultError = await resultErrorModel.findById(resultErrorId, projectId);

    if (!resultError) {
      throw new Error(`Result error with ID ${resultErrorId} not found`);
    }

    return resultError;
  },
};
