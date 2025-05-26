import { resultErrorService } from "@/services/resultErrorService";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

interface BulkReviewResult {
  successful: (ResultErrorWithRelations | null)[];
  failed: Array<{ id: number; reason: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export const mcpResultErrorHandler = {
  async assignIssue(
    resultErrorId: string,
    assumptionId: number | string,
  ): Promise<unknown> {
    return await resultErrorService.assignIssue(resultErrorId, assumptionId);
  },

  async reviewError(
    resultErrorId: string,
  ): Promise<ResultErrorWithRelations | null> {
    return await resultErrorService.reviewError(resultErrorId);
  },

  async bulkReview(errorIds: (number | string)[]): Promise<BulkReviewResult> {
    return await resultErrorService.bulkReview(errorIds);
  },

  async getResultErrorById(resultErrorId: string): Promise<PrismaResultError> {
    return await resultErrorService.getResultErrorById(resultErrorId);
  },
};
