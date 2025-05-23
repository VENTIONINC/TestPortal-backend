import { resultErrorModel } from "../models/resultErrorModel.js";
import { runReview } from "../lib/error-analyzer.js";

export const resultErrorService = {
  async assignIssue(resultErrorId, assumptionId) {
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
      throw new Error(
        `Failed to assign issue to result error: ${error.message}`,
      );
    }
  },

  async reviewError(resultErrorId) {
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

      const reviewedRecord = await runReview(resultError);
      return reviewedRecord;
    } catch (error) {
      throw new Error(
        `Failed to review result error ${resultErrorId}: ${error.message}`,
      );
    }
  },

  async bulkReview(errorIds) {
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
    const reviewResults = [];
    const failedIds = [];

    try {
      for (const errorId of validatedIds) {
        try {
          const resultError = await resultErrorModel.findById(errorId);

          if (!resultError) {
            failedIds.push({ id: errorId, reason: "Result error not found" });
            continue;
          }

          const reviewedRecord = await runReview(resultError);
          reviewResults.push(reviewedRecord);
        } catch (error) {
          failedIds.push({ id: errorId, reason: error.message });
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
      throw new Error(`Bulk review failed: ${error.message}`);
    }
  },

  async getResultErrorById(resultErrorId) {
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
